import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";

type CheckoutResult = { clientSecret: string } | { error: string };

/**
 * Create an Embedded Checkout session for a rent line.
 * Returns { clientSecret } for <EmbeddedCheckoutProvider>.
 */
export const createRentCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      rentScheduleId: z.string().uuid(),
      returnUrl: z.string().url(),
      environment: z.enum(["sandbox", "live"]),
    }).parse(d),
  )
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    try {
      const { supabase, userId } = context;
      const env = data.environment as StripeEnv;

      const { data: rent, error } = await supabase
        .from("rent_schedule")
        .select("id, amount, tenancy_id, status, due_date, tenancies(id, tenant_user_id, agency_id, properties(title))")
        .eq("id", data.rentScheduleId)
        .single();
      if (error || !rent) return { error: "Rent line not found" };
      const tenancy = (rent as any).tenancies;
      if (tenancy.tenant_user_id !== userId) return { error: "Not your tenancy" };
      if (rent.status === "paid") return { error: "Already paid" };

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: invoice } = await supabaseAdmin.from("rent_invoices").insert({
        rent_schedule_id: rent.id,
        tenancy_id: tenancy.id,
        amount: rent.amount,
        provider: "stripe",
        status: "pending",
      }).select("id").single();

      const description = `Rent · ${tenancy.properties?.title ?? "Property"} · due ${rent.due_date}`;
      const stripe = createStripeClient(env);
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        ui_mode: "embedded_page" as any,
        return_url: data.returnUrl,
        line_items: [{
          quantity: 1,
          price_data: {
            currency: "gbp",
            product_data: { name: description },
            unit_amount: Math.round(Number(rent.amount) * 100),
          },
        }],
        payment_intent_data: { description },
        metadata: {
          rent_schedule_id: rent.id,
          invoice_id: invoice!.id,
          tenancy_id: tenancy.id,
          userId,
        },
      } as any);

      await supabaseAdmin.from("rent_invoices")
        .update({ provider_session_id: session.id })
        .eq("id", invoice!.id);

      return { clientSecret: session.client_secret ?? "" };
    } catch (e) {
      return { error: getStripeErrorMessage(e) };
    }
  });
