import { createFileRoute } from "@tanstack/react-router";
import type Stripe from "stripe";
import { createStripeClient, type StripeEnv, verifyWebhook } from "@/lib/stripe.server";
import { stripeSubscriptionUpdate } from "@/lib/billing.server";

function isConfiguredEnvironment(kind: "billing" | "payments", env: StripeEnv): boolean {
  const configured = process.env[kind === "billing" ? "BILLING_STRIPE_ENV" : "PAYMENTS_STRIPE_ENV"];
  return configured === env;
}

async function handleRentCheckoutPaid(session: Stripe.Checkout.Session, env: StripeEnv) {
  if (!isConfiguredEnvironment("payments", env)) return;
  const invoiceId = session.metadata?.invoice_id;
  const rentScheduleId = session.metadata?.rent_schedule_id;
  const tenancyId = session.metadata?.tenancy_id;
  if (!invoiceId || !rentScheduleId || !tenancyId) return;
  if (session.payment_status !== "paid") return;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const paymentIntent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;
  const { error } = await (supabaseAdmin as any).rpc("record_stripe_rent_payment", {
    _invoice_id: invoiceId,
    _rent_schedule_id: rentScheduleId,
    _tenancy_id: tenancyId,
    _provider_session_id: session.id,
    _provider_payment_intent: paymentIntent ?? "",
    _amount: Number(session.amount_total ?? 0) / 100,
    _currency: String(session.currency ?? ""),
  });
  if (error) throw new Error(error.message);
}

async function updateRentCheckoutStatus(
  session: Stripe.Checkout.Session,
  status: "failed" | "expired",
  env: StripeEnv,
) {
  if (!isConfiguredEnvironment("payments", env)) return;
  const invoiceId = session.metadata?.invoice_id;
  if (!invoiceId || session.metadata?.checkout_type === "agency_subscription") return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("rent_invoices")
    .update({ status })
    .eq("id", invoiceId)
    .eq("provider_session_id", session.id)
    .eq("status", "pending");
  if (error) throw new Error(error.message);
}

async function syncSubscriptionFromCheckout(session: Stripe.Checkout.Session, env: StripeEnv) {
  const agencyId = session.metadata?.agency_id;
  if (!agencyId || !session.subscription)
    throw new Error("Subscription checkout metadata is missing");
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription.id;
  const stripe = createStripeClient(env);
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await syncSubscription(subscription, env, agencyId);
}

async function syncSubscription(
  subscription: Stripe.Subscription,
  env: StripeEnv,
  knownAgencyId?: string,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;
  let agencyId = knownAgencyId ?? subscription.metadata?.agency_id;

  if (!agencyId) {
    const customerId =
      typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
    const { data: existing } = await admin
      .from("agency_subscriptions")
      .select("agency_id")
      .eq("stripe_environment", env)
      .or(`stripe_subscription_id.eq.${subscription.id},stripe_customer_id.eq.${customerId}`)
      .limit(1)
      .maybeSingle();
    agencyId = existing?.agency_id;
  }

  if (!agencyId) throw new Error("Unable to resolve subscription agency");
  const { error } = await admin.from("agency_subscriptions").upsert(
    {
      agency_id: agencyId,
      ...stripeSubscriptionUpdate(subscription, env),
    },
    { onConflict: "agency_id" },
  );
  if (error) throw new Error(error.message);
}

async function beginBillingEvent(event: Stripe.Event, env: StripeEnv): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;
  const initial = {
    id: event.id,
    stripe_environment: env,
    event_type: event.type,
    object_id: (event.data.object as { id?: string }).id ?? null,
    status: "processing",
    attempts: 1,
    last_error: null,
  };
  const { error: insertError } = await admin.from("billing_webhook_events").insert(initial);
  if (!insertError) return true;
  if (insertError.code !== "23505") throw new Error(insertError.message);

  const { data: existing } = await admin
    .from("billing_webhook_events")
    .select("status, attempts, updated_at")
    .eq("id", event.id)
    .maybeSingle();
  if (existing?.status === "processed") return false;
  if (
    existing?.status === "processing" &&
    existing.updated_at &&
    Date.now() - new Date(existing.updated_at).getTime() < 5 * 60 * 1000
  )
    return false;

  const { error } = await admin
    .from("billing_webhook_events")
    .update({
      status: "processing",
      attempts: (existing?.attempts ?? 0) + 1,
      last_error: null,
    })
    .eq("id", event.id);
  if (error) throw new Error(error.message);
  return true;
}

async function finishBillingEvent(eventId: string, error?: unknown) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error: updateError } = await (supabaseAdmin as any)
    .from("billing_webhook_events")
    .update(
      error
        ? { status: "failed", last_error: String(error instanceof Error ? error.message : error) }
        : { status: "processed", processed_at: new Date().toISOString(), last_error: null },
    )
    .eq("id", eventId);
  if (updateError) throw new Error(updateError.message);
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          return Response.json({ received: false, error: "invalid env" }, { status: 400 });
        }
        const env: StripeEnv = rawEnv;
        let eventId: string | null = null;
        try {
          const event = await verifyWebhook(request, env);
          const object = event.data.object;
          eventId = event.id;
          if (!(await beginBillingEvent(event, env))) {
            return Response.json({ received: true, duplicate: true });
          }
          if (event.type === "checkout.session.completed") {
            const session = object as Stripe.Checkout.Session;
            if (session.metadata?.checkout_type === "agency_subscription") {
              if (isConfiguredEnvironment("billing", env)) {
                await syncSubscriptionFromCheckout(session, env);
              }
            } else {
              await handleRentCheckoutPaid(session, env);
            }
          } else if (event.type === "checkout.session.async_payment_succeeded") {
            await handleRentCheckoutPaid(object as Stripe.Checkout.Session, env);
          } else if (event.type === "checkout.session.async_payment_failed") {
            await updateRentCheckoutStatus(object as Stripe.Checkout.Session, "failed", env);
          } else if (event.type === "checkout.session.expired") {
            await updateRentCheckoutStatus(object as Stripe.Checkout.Session, "expired", env);
          } else if (
            event.type === "customer.subscription.created" ||
            event.type === "customer.subscription.updated" ||
            event.type === "customer.subscription.deleted"
          ) {
            if (isConfiguredEnvironment("billing", env)) {
              await syncSubscription(object as Stripe.Subscription, env);
            }
          }
          await finishBillingEvent(event.id);
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          if (eventId) {
            try {
              await finishBillingEvent(eventId, e);
            } catch (finishError) {
              console.error("Unable to record webhook failure:", finishError);
            }
          }
          return new Response("Webhook error", { status: eventId ? 500 : 400 });
        }
      },
    },
  },
});
