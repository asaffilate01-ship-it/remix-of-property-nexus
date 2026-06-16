import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Create a Stripe checkout session for a rent payment.
 * Returns { url } when ready, or { url: null } if Stripe isn't configured yet.
 */
export const createRentPaymentLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ rentScheduleId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: rent, error } = await supabase
      .from("rent_schedule")
      .select("id, amount, tenancy_id, status, due_date, tenancies(id, tenant_user_id, agency_id, properties(title))")
      .eq("id", data.rentScheduleId)
      .single();
    if (error || !rent) throw new Error("Rent line not found");
    const tenancy = (rent as any).tenancies;
    if (tenancy.tenant_user_id !== userId) throw new Error("Not your tenancy");
    if (rent.status === "paid") throw new Error("Already paid");

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return { url: null as string | null, message: "Stripe not configured" };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Upsert invoice
    const { data: invoice } = await supabaseAdmin.from("rent_invoices").insert({
      rent_schedule_id: rent.id,
      tenancy_id: tenancy.id,
      amount: rent.amount,
      provider: "stripe",
      status: "pending",
    }).select("id").single();

    // Stripe REST call (no SDK to keep Worker-safe)
    const origin = process.env.SITE_URL || "https://propertyverse-prime.lovable.app";
    const params = new URLSearchParams();
    params.set("mode", "payment");
    params.set("success_url", `${origin}/portal/tenant?paid=${invoice!.id}`);
    params.set("cancel_url", `${origin}/portal/tenant?cancelled=${invoice!.id}`);
    params.set("line_items[0][quantity]", "1");
    params.set("line_items[0][price_data][currency]", "gbp");
    params.set("line_items[0][price_data][unit_amount]", String(Math.round(Number(rent.amount) * 100)));
    params.set("line_items[0][price_data][product_data][name]",
      `Rent · ${tenancy.properties?.title ?? "Property"} · due ${rent.due_date}`);
    params.set("metadata[rent_schedule_id]", rent.id);
    params.set("metadata[invoice_id]", invoice!.id);
    params.set("metadata[tenancy_id]", tenancy.id);

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    const json = (await res.json()) as any;
    if (!res.ok) throw new Error(json.error?.message ?? "Stripe error");

    await supabaseAdmin.from("rent_invoices")
      .update({ provider_session_id: json.id, checkout_url: json.url })
      .eq("id", invoice!.id);

    return { url: json.url as string };
  });
