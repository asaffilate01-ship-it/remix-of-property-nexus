/* eslint-disable @typescript-eslint/no-explicit-any -- subscription tables are added by the pending migration and are not in generated Supabase types yet */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import {
  PLAN_CODES,
  PLANS,
  getEntitlements,
  hasSubscriptionAccess,
  type PlanCode,
  type SubscriptionStatus,
} from "@/lib/plans";
import { createStripeClient, getStripeErrorMessage, type StripeEnv } from "@/lib/stripe.server";
import { stripeSubscriptionUpdate } from "@/lib/billing.server";

type AgencyAccess = { agencyId: string; isOwner: boolean };

type SubscriptionRow = {
  agency_id: string;
  plan_code: PlanCode;
  status: SubscriptionStatus;
  stripe_environment: StripeEnv | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  stripe_checkout_session_id: string | null;
  checkout_expires_at: string | null;
  branch_quantity: number;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_start: string | null;
  trial_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
};

function getBillingEnvironment(): StripeEnv {
  const value = process.env.BILLING_STRIPE_ENV;
  if (value !== "sandbox" && value !== "live") {
    throw new Error("BILLING_STRIPE_ENV must be configured as sandbox or live");
  }
  return value;
}

function getPlanPriceId(planCode: PlanCode, environment: StripeEnv): string {
  const key = `BILLING_${planCode.toUpperCase()}_PRICE_ID_${environment.toUpperCase()}`;
  const value = process.env[key];
  if (!value) throw new Error(`${key} is not configured`);
  return value;
}

function getApplicationUrl(): string {
  const configured = process.env.APP_URL;
  if (!configured) throw new Error("APP_URL is not configured");
  const url = new URL(configured);
  if (url.protocol !== "https:" && url.hostname !== "localhost") {
    throw new Error("APP_URL must use HTTPS");
  }
  return url.origin;
}

async function resolveAgencyAccess(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<AgencyAccess | null> {
  const { data: owned } = await supabase
    .from("agencies")
    .select("id")
    .eq("owner_id", userId)
    .limit(1)
    .maybeSingle();
  if (owned?.id) return { agencyId: owned.id, isOwner: true };

  const { data: membership } = await supabase
    .from("agency_members")
    .select("agency_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  return membership?.agency_id ? { agencyId: membership.agency_id, isOwner: false } : null;
}

function requireOwner(access: AgencyAccess | null): asserts access is AgencyAccess {
  if (!access) throw new Error("Create an agency before choosing a subscription plan");
  if (!access.isOwner) throw new Error("Only the agency owner can manage billing");
}

async function upsertStripeSubscription(
  admin: any,
  agencyId: string,
  subscription: Stripe.Subscription,
  environment: StripeEnv,
) {
  const { error } = await admin.from("agency_subscriptions").upsert(
    {
      agency_id: agencyId,
      ...stripeSubscriptionUpdate(subscription, environment),
    },
    { onConflict: "agency_id" },
  );
  if (error) throw new Error(error.message);
}

export const getBillingOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const access = await resolveAgencyAccess(context.supabase, context.userId);
    if (!access) {
      return {
        agencyId: null as string | null,
        isOwner: false,
        subscription: null,
        branchCount: 0,
        liveListings: 0,
        plans: Object.values(PLANS),
      };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const [{ data: subscription }, { count: branches }, { count: liveListings }] =
      await Promise.all([
        admin
          .from("agency_subscriptions")
          .select("*")
          .eq("agency_id", access.agencyId)
          .maybeSingle(),
        admin
          .from("branches")
          .select("id", { count: "exact", head: true })
          .eq("agency_id", access.agencyId),
        admin
          .from("listings")
          .select("id", { count: "exact", head: true })
          .eq("agency_id", access.agencyId)
          .eq("marketplace_publish", true)
          .in("status", ["published", "under_offer", "let_agreed"]),
      ]);

    const row = (subscription ?? null) as SubscriptionRow | null;
    const entitlements = row ? getEntitlements(row.plan_code, row.status, row.trial_end) : null;

    return {
      agencyId: access.agencyId,
      isOwner: access.isOwner,
      branchCount: Math.max(1, branches ?? 0),
      liveListings: liveListings ?? 0,
      plans: Object.values(PLANS),
      subscription: row
        ? {
            planCode: row.plan_code,
            status: row.status,
            hasAccess: hasSubscriptionAccess(row.status, row.trial_end),
            trialEnd: row.trial_end,
            currentPeriodEnd: row.current_period_end,
            cancelAtPeriodEnd: row.cancel_at_period_end,
            hasStripeSubscription: Boolean(row.stripe_subscription_id),
            entitlements,
          }
        : null,
    };
  });

export const getWorkspaceAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const access = await resolveAgencyAccess(context.supabase, context.userId);
    if (!access) {
      return {
        isAgencyUser: false as const,
        isOwner: false,
        hasAccess: true,
        status: null as SubscriptionStatus | null,
        planCode: null as PlanCode | null,
        trialEnd: null as string | null,
        onboarding: null,
      };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const [subscriptionResult, agencyResult, branchesResult, listingsResult, membersResult] =
      await Promise.all([
        admin
          .from("agency_subscriptions")
          .select("plan_code, status, trial_end")
          .eq("agency_id", access.agencyId)
          .maybeSingle(),
        admin
          .from("agencies")
          .select("name, description, email, phone, city")
          .eq("id", access.agencyId)
          .single(),
        admin
          .from("branches")
          .select("id", { count: "exact", head: true })
          .eq("agency_id", access.agencyId),
        admin
          .from("listings")
          .select("id", { count: "exact", head: true })
          .eq("agency_id", access.agencyId),
        admin
          .from("agency_members")
          .select("id", { count: "exact", head: true })
          .eq("agency_id", access.agencyId),
      ]);
    const subscription = subscriptionResult.data as {
      plan_code: PlanCode;
      status: SubscriptionStatus;
      trial_end: string | null;
    } | null;
    const agency = agencyResult.data as {
      name: string;
      description: string | null;
      email: string | null;
      phone: string | null;
      city: string | null;
    } | null;

    return {
      isAgencyUser: true as const,
      isOwner: access.isOwner,
      hasAccess: subscription
        ? hasSubscriptionAccess(subscription.status, subscription.trial_end)
        : false,
      status: subscription?.status ?? null,
      planCode: subscription?.plan_code ?? null,
      trialEnd: subscription?.trial_end ?? null,
      onboarding: {
        agencyProfile: Boolean(
          agency?.name && agency.description && agency.email && agency.phone && agency.city,
        ),
        firstBranch: (branchesResult.count ?? 0) > 0,
        firstListing: (listingsResult.count ?? 0) > 0,
        teamMember: (membersResult.count ?? 0) > 1,
      },
    };
  });

export const createSubscriptionCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ planCode: z.enum(PLAN_CODES) }).parse(value))
  .handler(async ({ data, context }) => {
    try {
      const access = await resolveAgencyAccess(context.supabase, context.userId);
      requireOwner(access);

      const environment = getBillingEnvironment();
      const priceId = getPlanPriceId(data.planCode, environment);
      const appUrl = getApplicationUrl();
      const stripe = createStripeClient(environment);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const admin = supabaseAdmin as any;

      const [{ data: agency }, { data: existing }, { count: branchCount }] = await Promise.all([
        admin.from("agencies").select("id, name").eq("id", access.agencyId).single(),
        admin
          .from("agency_subscriptions")
          .select("*")
          .eq("agency_id", access.agencyId)
          .maybeSingle(),
        admin
          .from("branches")
          .select("id", { count: "exact", head: true })
          .eq("agency_id", access.agencyId),
      ]);
      const current = (existing ?? null) as SubscriptionRow | null;
      const environmentChanged = Boolean(
        current?.stripe_environment && current.stripe_environment !== environment,
      );
      const checkoutStatus: SubscriptionStatus = environmentChanged
        ? current?.trial_end && new Date(current.trial_end).getTime() > Date.now()
          ? "trialing"
          : "incomplete"
        : (current?.status ?? "incomplete");

      if (
        !environmentChanged &&
        current?.stripe_subscription_id &&
        ["trialing", "active", "past_due", "unpaid", "paused"].includes(current.status)
      ) {
        return { error: "A subscription already exists. Use Manage billing to change it." };
      }

      if (
        !environmentChanged &&
        current?.stripe_checkout_session_id &&
        current.plan_code === data.planCode &&
        current.checkout_expires_at &&
        new Date(current.checkout_expires_at).getTime() > Date.now()
      ) {
        const openSession = await stripe.checkout.sessions.retrieve(
          current.stripe_checkout_session_id,
        );
        if (openSession.status === "open" && openSession.url) {
          return { url: openSession.url, reused: true };
        }
      }

      if (
        !environmentChanged &&
        current?.stripe_checkout_session_id &&
        current.checkout_expires_at &&
        new Date(current.checkout_expires_at).getTime() > Date.now()
      ) {
        try {
          await stripe.checkout.sessions.expire(current.stripe_checkout_session_id);
        } catch {
          // The prior session may already be complete or expired.
        }
      }

      let customerId =
        current?.stripe_environment === environment ? current.stripe_customer_id : null;
      if (!customerId) {
        const email = String((context.claims as Record<string, unknown>).email ?? "") || undefined;
        const customer = await stripe.customers.create({
          email,
          name: agency?.name ?? undefined,
          metadata: { agency_id: access.agencyId, user_id: context.userId },
        });
        customerId = customer.id;
        const { error: customerSaveError } = await admin.from("agency_subscriptions").upsert(
          {
            agency_id: access.agencyId,
            plan_code: current?.plan_code ?? data.planCode,
            status: checkoutStatus,
            stripe_environment: environment,
            stripe_customer_id: customerId,
            stripe_subscription_id: null,
            stripe_price_id: null,
            stripe_checkout_session_id: null,
            checkout_expires_at: null,
            current_period_start: null,
            current_period_end: null,
            cancel_at_period_end: false,
            canceled_at: null,
            branch_quantity: current?.branch_quantity ?? 1,
            trial_start: current?.trial_start ?? null,
            trial_end: current?.trial_end ?? null,
          },
          { onConflict: "agency_id" },
        );
        if (customerSaveError) throw new Error(customerSaveError.message);
      }

      const quantity = Math.max(1, branchCount ?? 0);
      const remainingTrialSeconds = current?.trial_end
        ? Math.floor((new Date(current.trial_end).getTime() - Date.now()) / 1000)
        : 0;
      const trialEnd =
        remainingTrialSeconds >= 48 * 60 * 60
          ? Math.floor(new Date(current!.trial_end!).getTime() / 1000)
          : undefined;
      const expiresAt = Math.floor(Date.now() / 1000) + 30 * 60;

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: priceId, quantity }],
        payment_method_collection: trialEnd ? "if_required" : "always",
        allow_promotion_codes: true,
        billing_address_collection: "auto",
        success_url: `${appUrl}/settings?tab=billing&billing=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/settings?tab=billing&billing=cancelled`,
        client_reference_id: access.agencyId,
        expires_at: expiresAt,
        metadata: {
          checkout_type: "agency_subscription",
          agency_id: access.agencyId,
          plan_code: data.planCode,
          branch_quantity: String(quantity),
          stripe_environment: environment,
        },
        subscription_data: {
          ...(trialEnd ? { trial_end: trialEnd } : {}),
          metadata: {
            agency_id: access.agencyId,
            plan_code: data.planCode,
            branch_quantity: String(quantity),
            stripe_environment: environment,
          },
        },
      });

      const { error } = await admin.from("agency_subscriptions").upsert(
        {
          agency_id: access.agencyId,
          plan_code: data.planCode,
          status: checkoutStatus,
          stripe_environment: environment,
          stripe_customer_id: customerId,
          stripe_price_id: priceId,
          stripe_checkout_session_id: session.id,
          checkout_expires_at: new Date(expiresAt * 1000).toISOString(),
          branch_quantity: quantity,
          trial_start: current?.trial_start ?? null,
          trial_end: current?.trial_end ?? null,
        },
        { onConflict: "agency_id" },
      );
      if (error) throw new Error(error.message);
      if (!session.url) throw new Error("Stripe did not return a checkout URL");
      return { url: session.url, reused: false };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export const createBillingPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      const access = await resolveAgencyAccess(context.supabase, context.userId);
      requireOwner(access);
      const environment = getBillingEnvironment();
      const appUrl = getApplicationUrl();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data } = await (supabaseAdmin as any)
        .from("agency_subscriptions")
        .select("stripe_customer_id, stripe_environment")
        .eq("agency_id", access.agencyId)
        .maybeSingle();
      if (!data?.stripe_customer_id || data.stripe_environment !== environment) {
        return { error: "No Stripe billing account exists yet" };
      }

      const stripe = createStripeClient(environment);
      const session = await stripe.billingPortal.sessions.create({
        customer: data.stripe_customer_id,
        return_url: `${appUrl}/settings?tab=billing`,
      });
      return { url: session.url };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export const syncSubscriptionCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) =>
    z.object({ sessionId: z.string().min(8).max(255) }).parse(value),
  )
  .handler(async ({ data, context }) => {
    try {
      const access = await resolveAgencyAccess(context.supabase, context.userId);
      requireOwner(access);
      const environment = getBillingEnvironment();
      const stripe = createStripeClient(environment);
      const session = await stripe.checkout.sessions.retrieve(data.sessionId);
      if (
        session.metadata?.checkout_type !== "agency_subscription" ||
        session.metadata?.agency_id !== access.agencyId
      ) {
        return { error: "Checkout session does not belong to this agency" };
      }
      if (!session.subscription) return { error: "Subscription is not ready yet" };

      const subscriptionId =
        typeof session.subscription === "string" ? session.subscription : session.subscription.id;
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await upsertStripeSubscription(
        supabaseAdmin as any,
        access.agencyId,
        subscription,
        environment,
      );
      return { ok: true };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
