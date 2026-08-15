import type Stripe from "stripe";
import type { StripeEnv } from "@/lib/stripe.server";
import { PLAN_CODES, type PlanCode, type SubscriptionStatus } from "@/lib/plans";

function fromUnix(value: unknown): string | null {
  return typeof value === "number" && Number.isFinite(value)
    ? new Date(value * 1000).toISOString()
    : null;
}

function normalizeStatus(value: unknown): SubscriptionStatus {
  const allowed: SubscriptionStatus[] = [
    "incomplete",
    "incomplete_expired",
    "trialing",
    "active",
    "past_due",
    "canceled",
    "unpaid",
    "paused",
  ];
  return allowed.includes(value as SubscriptionStatus)
    ? (value as SubscriptionStatus)
    : "incomplete";
}

export function stripeSubscriptionUpdate(
  subscription: Stripe.Subscription,
  environment: StripeEnv,
) {
  const firstItem = subscription.items?.data?.[0];
  const priceId = firstItem?.price?.id as string | undefined;
  const mappedPlan = PLAN_CODES.find((code) => {
    const key = `BILLING_${code.toUpperCase()}_PRICE_ID_${environment.toUpperCase()}`;
    return Boolean(priceId && process.env[key] === priceId);
  });
  const planCode =
    mappedPlan ??
    (PLAN_CODES.includes(subscription.metadata?.plan_code as PlanCode)
      ? (subscription.metadata.plan_code as PlanCode)
      : undefined);

  return {
    ...(planCode ? { plan_code: planCode } : {}),
    status: normalizeStatus(subscription.status),
    stripe_environment: environment,
    stripe_customer_id:
      typeof subscription.customer === "string"
        ? subscription.customer
        : (subscription.customer?.id ?? null),
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId ?? null,
    branch_quantity: Math.max(1, Number(firstItem?.quantity ?? 1)),
    current_period_start: fromUnix(firstItem?.current_period_start),
    current_period_end: fromUnix(firstItem?.current_period_end),
    trial_start: fromUnix(subscription.trial_start),
    trial_end: fromUnix(subscription.trial_end),
    cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
    canceled_at: fromUnix(subscription.canceled_at),
    stripe_checkout_session_id: null,
    checkout_expires_at: null,
  };
}

export async function syncStripeBranchQuantity(agencyId: string): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { createStripeClient } = await import("@/lib/stripe.server");
  const admin = supabaseAdmin as any;
  const [{ data: row }, { count }] = await Promise.all([
    admin
      .from("agency_subscriptions")
      .select("stripe_subscription_id, stripe_environment, branch_quantity, status")
      .eq("agency_id", agencyId)
      .maybeSingle(),
    admin.from("branches").select("id", { count: "exact", head: true }).eq("agency_id", agencyId),
  ]);

  if (
    !row?.stripe_subscription_id ||
    (row.stripe_environment !== "sandbox" && row.stripe_environment !== "live") ||
    !["trialing", "active", "past_due"].includes(row.status)
  ) {
    return null;
  }

  const quantity = Math.max(1, count ?? 0);
  if (quantity === row.branch_quantity) return null;

  try {
    const stripe = createStripeClient(row.stripe_environment);
    const subscription = await stripe.subscriptions.retrieve(row.stripe_subscription_id);
    const itemId = subscription.items.data[0]?.id;
    if (!itemId) throw new Error("Subscription has no billable item");
    await stripe.subscriptions.update(row.stripe_subscription_id, {
      items: [{ id: itemId, quantity }],
      proration_behavior: "create_prorations",
      metadata: {
        ...subscription.metadata,
        branch_quantity: String(quantity),
      },
    });
    await admin
      .from("agency_subscriptions")
      .update({ branch_quantity: quantity })
      .eq("agency_id", agencyId);
    return null;
  } catch (error) {
    return `Branch saved, but Stripe quantity sync failed: ${error instanceof Error ? error.message : "unknown error"}`;
  }
}
