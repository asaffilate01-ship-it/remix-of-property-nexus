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
    if (!agencyId) return { transactions: [], rentSchedule: [], agencyId: null as string | null, demoEnabled: false };
    const [txn, rent] = await Promise.all([
      context.supabase
        .from("bank_transactions")
        .select("*")
        .eq("agency_id", agencyId)
        .order("posted_at", { ascending: false })
        .limit(200),
      context.supabase
        .from("rent_schedule")
        .select("id, tenancy_id, due_date, amount, status, tenancies(tenant_name, agency_id)")
        .order("due_date", { ascending: false })
        .limit(500),
    ]);
    if (txn.error) throw new Error(txn.error.message);
    if (rent.error) throw new Error(rent.error.message);
    const rentSchedule = (rent.data ?? []).filter((row: any) => row.tenancies?.agency_id === agencyId);
    return {
      transactions: txn.data ?? [],
      rentSchedule,
      agencyId,
      demoEnabled: process.env.ENABLE_DEMO_BANK_FEED === "true",
    };
  });

// Seeds a small mock open-banking feed so the auto-reconcile UI has something to chew on.
export const seedMockBankFeed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (process.env.ENABLE_DEMO_BANK_FEED !== "true") {
      throw new Error("Demo bank feed is disabled in this environment.");
    }
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
      raw: { mock: true, due_id: null as string | null },
    });
    if (rows.length > 0) {
      const { error } = await context.supabase.from("bank_transactions").insert(rows);
      if (error) throw new Error(error.message);
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
      .select("id, amount, due_date, status, tenancy_id, tenancies!inner(tenant_name, agency_id)")
      .neq("status", "paid");
    const eligibleRent = (pendingRent ?? []).filter((row: any) => row.tenancies?.agency_id === agencyId);
    let matched = 0;
    for (const t of unmatched ?? []) {
      const amountCandidates = eligibleRent.filter((r) => Number(r.amount) === Number(t.amount));
      if (amountCandidates.length !== 1) continue;
      const candidate = amountCandidates[0] as any;
      const reference = String(t.reference ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      const tenantName = String(candidate.tenancies?.tenant_name ?? "");
      const name = tenantName.toUpperCase().replace(/[^A-Z0-9]/g, "");
      const initials = tenantName.split(/\s+/).filter(Boolean).map((part: string) => part[0]).join("").toUpperCase();
      const scheduleToken = String(candidate.id).replace(/-/g, "").slice(0, 4).toUpperCase();
      const hasStrongReference =
        (name.length >= 5 && reference.includes(name)) ||
        (initials.length >= 2 && reference.includes(initials) && reference.includes(scheduleToken));
      if (!hasStrongReference) continue;
      const { data: didMatch, error } = await (context.supabase as any).rpc("match_bank_transaction", {
        _transaction_id: t.id,
        _rent_schedule_id: candidate.id,
      });
      if (error) throw new Error(error.message);
      if (didMatch) {
        matched++;
        eligibleRent.splice(eligibleRent.indexOf(candidate), 1);
      }
    }
    return { matched, scanned: unmatched?.length ?? 0 };
  });

export const manualMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ transaction_id: z.string().uuid(), rent_schedule_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: matched, error } = await (context.supabase as any).rpc("match_bank_transaction", {
      _transaction_id: data.transaction_id,
      _rent_schedule_id: data.rent_schedule_id,
    });
    if (error) throw new Error(error.message);
    if (!matched) throw new Error("This payment or rent item is no longer available to match.");
    return { ok: true };
  });
