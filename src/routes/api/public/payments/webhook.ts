import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

async function handleCheckoutCompleted(session: any, _env: StripeEnv) {
  const invoiceId = session.metadata?.invoice_id;
  const rentScheduleId = session.metadata?.rent_schedule_id;
  const tenancyId = session.metadata?.tenancy_id;
  if (!invoiceId || !rentScheduleId) return;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const paidAmount = (session.amount_total ?? 0) / 100;
  const nowIso = new Date().toISOString();

  await supabaseAdmin.from("rent_invoices").update({
    status: "paid",
    paid_at: nowIso,
    provider_payment_intent: session.payment_intent,
  }).eq("id", invoiceId);

  await supabaseAdmin.from("rent_schedule").update({
    status: "paid",
    paid_at: nowIso,
    paid_amount: paidAmount,
  }).eq("id", rentScheduleId);

  if (tenancyId) {
    const { data: ten } = await supabaseAdmin
      .from("tenancies").select("agency_id").eq("id", tenancyId).single();
    if (ten?.agency_id) {
      await supabaseAdmin.from("bank_transactions").insert({
        agency_id: ten.agency_id,
        amount: paidAmount,
        source: "stripe",
        reference: session.id,
        posted_at: nowIso,
        matched_tenancy_id: tenancyId,
        matched_rent_schedule_id: rentScheduleId,
        matched_at: nowIso,
      });
    }
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          return Response.json({ received: true, ignored: "invalid env" });
        }
        const env: StripeEnv = rawEnv;
        try {
          const event = await verifyWebhook(request, env);
          if (event.type === "checkout.session.completed") {
            await handleCheckoutCompleted(event.data.object, env);
          } else {
            console.log("Unhandled event:", event.type);
          }
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
