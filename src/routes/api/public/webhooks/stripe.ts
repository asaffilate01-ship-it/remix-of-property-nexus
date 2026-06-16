import { createFileRoute } from "@tanstack/react-router";

// Stripe webhook for rent payments. Verifies the signature using STRIPE_WEBHOOK_SECRET
// and marks rent invoices + rent_schedule as paid.
export const Route = createFileRoute("/api/public/webhooks/stripe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const sig = request.headers.get("stripe-signature") ?? "";
        const body = await request.text();
        const secret = process.env.STRIPE_WEBHOOK_SECRET;
        const stripeKey = process.env.STRIPE_SECRET_KEY;
        if (!secret || !stripeKey) return new Response("Stripe not configured", { status: 503 });

        // Manual Stripe signature verification (v1=<sha256 hex of t.payload>)
        try {
          const parts = Object.fromEntries(sig.split(",").map((kv) => kv.split("=")));
          const t = parts["t"], v1 = parts["v1"];
          if (!t || !v1) return new Response("Bad signature", { status: 400 });
          const enc = new TextEncoder();
          const key = await crypto.subtle.importKey("raw", enc.encode(secret),
            { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
          const mac = await crypto.subtle.sign("HMAC", key, enc.encode(`${t}.${body}`));
          const hex = Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, "0")).join("");
          if (hex !== v1) return new Response("Invalid signature", { status: 401 });
        } catch {
          return new Response("Bad signature", { status: 400 });
        }

        const event = JSON.parse(body);
        if (event.type === "checkout.session.completed") {
          const session = event.data.object;
          const invoiceId = session.metadata?.invoice_id;
          const rentScheduleId = session.metadata?.rent_schedule_id;
          const tenancyId = session.metadata?.tenancy_id;
          if (!invoiceId || !rentScheduleId) return new Response("ok");

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin.from("rent_invoices").update({
            status: "paid",
            paid_at: new Date().toISOString(),
            provider_payment_intent: session.payment_intent,
          }).eq("id", invoiceId);
          await supabaseAdmin.from("rent_schedule").update({
            status: "paid",
            paid_at: new Date().toISOString(),
            paid_amount: (session.amount_total ?? 0) / 100,
          }).eq("id", rentScheduleId);
          // Bank txn row
          if (tenancyId) {
            const { data: ten } = await supabaseAdmin.from("tenancies").select("agency_id").eq("id", tenancyId).single();
            if (ten?.agency_id) {
              await supabaseAdmin.from("bank_transactions").insert({
                agency_id: ten.agency_id,
                amount: (session.amount_total ?? 0) / 100,
                source: "stripe",
                reference: session.id,
                posted_at: new Date().toISOString(),
                matched_tenancy_id: tenancyId,
                matched_rent_schedule_id: rentScheduleId,
                matched_at: new Date().toISOString(),
              });
            }
          }
        }
        return new Response("ok");
      },
    },
  },
});
