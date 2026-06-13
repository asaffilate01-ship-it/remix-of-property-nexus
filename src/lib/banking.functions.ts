import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function resolveAgencyId(supabase: any, userId: string): Promise<string | null> {
  const owned = await supabase.from("agencies").select("id").eq("owner_id", userId).limit(1).maybeSingle();
  if (owned.data?.id) return owned.data.id;
  const mem = await supabase.from("agency_members").select("agency_id").eq("user_id", userId).limit(1).maybeSingle();
  return mem.data?.agency_id ?? null;
}

export const listBankTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const agencyId = await resolveAgencyId(context.supabase, context.userId);
    if (!agencyId) return { transactions: [], rentSchedule: [], agencyId: null as string | null };
    const [txn, rent] = await Promise.all([
      context.supabase
        .from("bank_transactions")
        .select("*")
        .eq("agency_id", agencyId)
        .order("posted_at", { ascending: false })
        .limit(200),
      context.supabase
        .from("rent_schedule")
        .select("id, tenancy_id, due_date, amount, status")
        .order("due_date", { ascending: false })
        .limit(500),
    ]);
    return { transactions: txn.data ?? [], rentSchedule: rent.data ?? [], agencyId };
  });

// Seeds a small mock open-banking feed so the auto-reconcile UI has something to chew on.
export const seedMockBankFeed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const agencyId = await resolveAgencyId(context.supabase, context.userId);
    if (!agencyId) throw new Error("No agency.");
    // Pull some recent due rent rows to base mock payments on (with realistic refs).
    const { data: rents } = await context.supabase
      .from("rent_schedule")
      .select("id, tenancy_id, due_date, amount, tenancies!inner(tenant_name, property_id)")
      .limit(10);
    const now = new Date();
    const rows = (rents ?? []).map((r: any, i: number) => {
      const posted = new Date(now.getTime() - i * 86400000);
      const tenant: string = r.tenancies?.tenant_name ?? `Tenant ${i + 1}`;
      const ref = `RENT ${tenant.split(" ").map((p: string) => p[0]).join("")}${String(r.id).slice(0, 4).toUpperCase()}`;
      return {
        agency_id: agencyId,
        posted_at: posted.toISOString(),
        amount: Number(r.amount),
        currency: "GBP",
        reference: ref,
        counterparty: tenant,
        source: "mock" as const,
        raw: { mock: true, due_id: r.id },
      };
    });
    // A couple of unmatched payments to show the workflow
    rows.push({
      agency_id: agencyId,
      posted_at: now.toISOString(),
      amount: 1250,
      currency: "GBP",
      reference: "UNKNOWN PAYMENT",
      counterparty: "Bank transfer",
      source: "mock" as const,
      raw: { mock: true },
    });
    if (rows.length > 0) {
      await context.supabase.from("bank_transactions").insert(rows);
    }
    return { inserted: rows.length };
  });

export const reconcileTransactions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const agencyId = await resolveAgencyId(context.supabase, context.userId);
    if (!agencyId) throw new Error("No agency.");
    const { data: unmatched } = await context.supabase
      .from("bank_transactions")
      .select("id, amount, reference, posted_at")
      .eq("agency_id", agencyId)
      .is("matched_rent_schedule_id", null);
    const { data: pendingRent } = await context.supabase
      .from("rent_schedule")
      .select("id, amount, due_date, status, tenancy_id")
      .neq("status", "paid");
    let matched = 0;
    for (const t of unmatched ?? []) {
      const candidate = (pendingRent ?? []).find((r) => Number(r.amount) === Number(t.amount));
      if (!candidate) continue;
      await context.supabase.from("bank_transactions").update({
        matched_rent_schedule_id: candidate.id,
        matched_tenancy_id: candidate.tenancy_id,
        matched_at: new Date().toISOString(),
      }).eq("id", t.id);
      await context.supabase.from("rent_schedule").update({
        status: "paid",
        paid_at: t.posted_at,
      }).eq("id", candidate.id);
      matched++;
    }
    return { matched, scanned: unmatched?.length ?? 0 };
  });

export const manualMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ transaction_id: z.string().uuid(), rent_schedule_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rent } = await context.supabase
      .from("rent_schedule").select("tenancy_id").eq("id", data.rent_schedule_id).single();
    const { data: txn } = await context.supabase
      .from("bank_transactions").select("posted_at").eq("id", data.transaction_id).single();
    await context.supabase.from("bank_transactions").update({
      matched_rent_schedule_id: data.rent_schedule_id,
      matched_tenancy_id: rent?.tenancy_id ?? null,
      matched_at: new Date().toISOString(),
    }).eq("id", data.transaction_id);
    await context.supabase.from("rent_schedule").update({
      status: "paid",
      paid_at: txn?.posted_at ?? new Date().toISOString(),
    }).eq("id", data.rent_schedule_id);
    return { ok: true };
  });
