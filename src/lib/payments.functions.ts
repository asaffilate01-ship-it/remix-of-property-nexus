import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type Stripe from "stripe";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";

type CheckoutResult = { clientSecret: string } | { error: string };
type RentTenancy = {
  id: string;
  tenant_user_id: string | null;
  properties: { title: string | null } | null;
};
type GatewayCheckoutParams = Omit<Stripe.Checkout.SessionCreateParams, "ui_mode"> & {
  ui_mode: "embedded_page";
  managed_payments: { enabled: true };
};

/**
 * Create an Embedded Checkout session for a rent line.
 * Returns { clientSecret } for <EmbeddedCheckoutProvider>.
 */
export const createRentCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        rentScheduleId: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    try {
      const { supabase, userId } = context;
      const configuredEnv = process.env.PAYMENTS_STRIPE_ENV;
      if (configuredEnv !== "sandbox" && configuredEnv !== "live") {
        return { error: "PAYMENTS_STRIPE_ENV is not configured" };
      }
      const env = configuredEnv as StripeEnv;
      const appUrl = process.env.APP_URL;
      if (!appUrl) return { error: "APP_URL is not configured" };
      const parsedAppUrl = new URL(appUrl);
      if (parsedAppUrl.protocol !== "https:" && parsedAppUrl.hostname !== "localhost") {
        return { error: "APP_URL must use HTTPS" };
      }
      const appOrigin = parsedAppUrl.origin;

      const { data: rent, error } = await supabase
        .from("rent_schedule")
        .select(
          "id, amount, tenancy_id, status, due_date, tenancies(id, tenant_user_id, agency_id, properties(title))",
        )
        .eq("id", data.rentScheduleId)
        .single();
      if (error || !rent) return { error: "Rent line not found" };
      const tenancy = rent.tenancies as unknown as RentTenancy;
      if (tenancy.tenant_user_id !== userId) return { error: "Not your tenancy" };
      if (rent.status === "paid") return { error: "Already paid" };

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const stripe = createStripeClient(env);
      const { data: pendingInvoice, error: pendingInvoiceError } = await supabaseAdmin
        .from("rent_invoices")
        .select("id, provider_session_id, created_at")
        .eq("rent_schedule_id", rent.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (pendingInvoiceError) return { error: "Unable to check the existing checkout" };

      if (pendingInvoice?.provider_session_id) {
        try {
          const existingSession = await stripe.checkout.sessions.retrieve(
            pendingInvoice.provider_session_id,
          );
          if (existingSession.status === "open" && existingSession.client_secret) {
            return { clientSecret: existingSession.client_secret };
          }
          if (existingSession.status === "open") {
            await stripe.checkout.sessions.expire(existingSession.id);
          }
          if (existingSession.payment_status === "paid" || existingSession.status === "complete") {
            return {
              error: "Your payment is being confirmed. Refresh shortly before trying again.",
            };
          }
        } catch {
          return {
            error:
              "Unable to verify the existing checkout. Please try again before creating another payment.",
          };
        }
        await supabaseAdmin
          .from("rent_invoices")
          .update({ status: "expired" })
          .eq("id", pendingInvoice.id);
      } else if (pendingInvoice) {
        const createdAt = new Date(pendingInvoice.created_at).getTime();
        if (Date.now() - createdAt < 2 * 60 * 1000) {
          return { error: "Checkout is being prepared. Please try again in a moment." };
        }
        await supabaseAdmin
          .from("rent_invoices")
          .update({ status: "failed" })
          .eq("id", pendingInvoice.id);
      }

      const { data: invoice, error: invoiceError } = await supabaseAdmin
        .from("rent_invoices")
        .insert({
          rent_schedule_id: rent.id,
          tenancy_id: tenancy.id,
          amount: rent.amount,
          provider: "stripe",
          status: "pending",
        })
        .select("id")
        .single();
      if (invoiceError?.code === "23505") {
        return { error: "Checkout is already being prepared. Please try again in a moment." };
      }
      if (invoiceError || !invoice) return { error: "Unable to create a payment invoice" };

      const description = `Rent · ${tenancy.properties?.title ?? "Property"} · due ${rent.due_date}`;
      let session;
      try {
        const checkoutParams: GatewayCheckoutParams = {
          mode: "payment",
          ui_mode: "embedded_page",
          return_url: `${appOrigin}/portal/tenant?paid={CHECKOUT_SESSION_ID}`,
          line_items: [
            {
              quantity: 1,
              price_data: {
                currency: "gbp",
                product_data: { name: description },
                unit_amount: Math.round(Number(rent.amount) * 100),
              },
            },
          ],
          payment_intent_data: { description },
          managed_payments: { enabled: true },
          metadata: {
            rent_schedule_id: rent.id,
            invoice_id: invoice.id,
            tenancy_id: tenancy.id,
            userId,
            managed_payments: "true",
          },
        };
        session = await stripe.checkout.sessions.create(
          checkoutParams as unknown as Stripe.Checkout.SessionCreateParams,
        );
      } catch (e) {
        await supabaseAdmin.from("rent_invoices").update({ status: "failed" }).eq("id", invoice.id);
        throw e;
      }

      const { error: invoiceUpdateError } = await supabaseAdmin
        .from("rent_invoices")
        .update({ provider_session_id: session.id })
        .eq("id", invoice.id);
      if (invoiceUpdateError) {
        await stripe.checkout.sessions.expire(session.id).catch(() => undefined);
        await supabaseAdmin.from("rent_invoices").update({ status: "failed" }).eq("id", invoice.id);
        return { error: "Unable to save the payment checkout" };
      }

      if (!session.client_secret) {
        await stripe.checkout.sessions.expire(session.id).catch(() => undefined);
        await supabaseAdmin.from("rent_invoices").update({ status: "failed" }).eq("id", invoice.id);
        return { error: "Stripe did not return a checkout secret" };
      }
      return { clientSecret: session.client_secret };
    } catch (e) {
      return { error: getStripeErrorMessage(e) };
    }
  });
