import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function resolveAgencyId(supabase: any, userId: string): Promise<string | null> {
  const owned = await supabase.from("agencies").select("id").eq("owner_id", userId).limit(1).maybeSingle();
  if (owned.data?.id) return owned.data.id;
  const mem = await supabase.from("agency_members").select("agency_id").eq("user_id", userId).limit(1).maybeSingle();
  return mem.data?.agency_id ?? null;
}

export const createReferencingCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({
      agency_id: z.string().uuid().optional(),
      property_id: z.string().uuid().optional(),
      applicant: z.record(z.any()),
      employment: z.record(z.any()),
      previous_landlord: z.record(z.any()),
      income_monthly: z.number().optional(),
      credit_consent: z.boolean().default(false),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("referencing_cases")
      .insert({
        tenant_id: context.userId,
        agency_id: data.agency_id ?? null,
        property_id: data.property_id ?? null,
        status: "submitted",
        current_step: 1,
        applicant: data.applicant,
        employment: data.employment,
        previous_landlord: data.previous_landlord,
        income_monthly: data.income_monthly ?? null,
        credit_consent: data.credit_consent,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { case: row };
  });

export const getMyReferencingCases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("referencing_cases")
      .select("*, properties(address,city,postcode), agencies(name)")
      .eq("tenant_id", context.userId)
      .order("created_at", { ascending: false });
    return { cases: data ?? [] };
  });

export const listAgencyReferencingCases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const agencyId = await resolveAgencyId(context.supabase, context.userId);
    if (!agencyId) return { cases: [] };
    const { data } = await context.supabase
      .from("referencing_cases")
      .select("*, profiles:tenant_id(full_name,email:tenant_id(email)), properties(address,city,postcode), agencies(name)")
      .eq("agency_id", agencyId)
      .order("created_at", { ascending: false });
    return { cases: data ?? [] };
  });

export const updateReferencingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["draft","submitted","in_review","approved","declined","withdrawn"]),
      decision: z.string().optional(),
      notes: z.string().optional(),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const agencyId = await resolveAgencyId(context.supabase, context.userId);
    if (!agencyId) throw new Error("Not an agency member.");
    const { data: row, error } = await context.supabase
      .from("referencing_cases")
      .update({
        status: data.status,
        decision: data.decision ?? null,
        notes: data.notes ?? null,
        decided_at: new Date().toISOString(),
        decided_by: context.userId,
      })
      .eq("id", data.id)
      .eq("agency_id", agencyId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { case: row };
  });

export const addReferencingDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({
      case_id: z.string().uuid(),
      doc_type: z.string(),
      storage_path: z.string(),
      file_size: z.number().optional(),
      mime_type: z.string().optional(),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("referencing_documents")
      .insert({
        case_id: data.case_id,
        doc_type: data.doc_type,
        storage_path: data.storage_path,
        file_size: data.file_size ?? null,
        mime_type: data.mime_type ?? null,
        uploaded_by: context.userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { document: row };
  });

export const getReferencingDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ case_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows } = await context.supabase
      .from("referencing_documents")
      .select("*")
      .eq("case_id", data.case_id)
      .order("created_at", { ascending: false });
    return { documents: rows ?? [] };
  });

// ----- Third-party checks (provider-agnostic) -----

const CHECK_TYPES = [
  "id_verification",
  "credit_check",
  "right_to_rent",
  "employer_reference",
  "landlord_reference",
  "affordability",
  "aml_pep_sanctions",
  "open_banking",
] as const;

function simulateCheck(type: string, ctx: { income?: number | null; consent?: boolean; previous_landlord?: Record<string, unknown> }) {
  // Deterministic-ish simulator returning a realistic result envelope.
  const seed = Math.floor(Math.random() * 100);
  switch (type) {
    case "id_verification":
      return { status: seed > 5 ? "passed" : "review", score: 100 - seed, result: { method: "document+selfie", confidence: 1 - seed / 1000, doc_type: "passport" } };
    case "credit_check": {
      if (!ctx.consent) return { status: "failed", score: 0, result: { reason: "No consent recorded" } };
      const score = 600 + seed * 3;
      return { status: score >= 700 ? "passed" : score >= 620 ? "review" : "failed", score, result: { ccjs: seed % 12 === 0 ? 1 : 0, defaults: 0, electoral_roll: true } };
    }
    case "right_to_rent":
      return { status: "passed", score: null, result: { share_code_verified: true, expires_in_days: 365 } };
    case "employer_reference":
      return { status: seed > 10 ? "passed" : "review", score: null, result: { employer_confirmed: true, salary_matches: true } };
    case "landlord_reference":
      return { status: seed > 15 ? "passed" : "review", score: null, result: { arrears_confirmed: (ctx.previous_landlord?.arrears ?? "none") === "none", left_in_good_standing: true } };
    case "affordability": {
      const income = ctx.income ?? 0;
      const rent = 1500;
      const ratio = income > 0 ? rent / income : 1;
      const pass = ratio <= 0.4;
      return { status: pass ? "passed" : "review", score: Math.round((1 - ratio) * 100), result: { monthly_income: income, target_rent: rent, ratio: Number(ratio.toFixed(2)), rule: "30x annual / 40% net" } };
    }
    case "aml_pep_sanctions":
      return { status: seed > 2 ? "passed" : "review", score: 100 - seed, result: { pep_match: false, sanctions_match: false, adverse_media: 0 } };
    case "open_banking":
      return { status: "passed", score: 95, result: { provider: "TrueLayer (sim)", confirmed_income: ctx.income ?? null, regular_rent_payments: 12 } };
    default:
      return { status: "review", score: null, result: {} };
  }
}

export const listReferencingChecks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ case_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("referencing_checks")
      .select("*")
      .eq("case_id", data.case_id)
      .order("requested_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { checks: rows ?? [] };
  });

export const requestReferencingCheck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({
      case_id: z.string().uuid(),
      check_type: z.enum(CHECK_TYPES),
      provider: z.string().optional(),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    // Load case for context + authorization (agency member or tenant)
    const { data: kase, error: e1 } = await context.supabase
      .from("referencing_cases")
      .select("id, income_monthly, credit_consent, previous_landlord, applicant, employment, agency_id")
      .eq("id", data.case_id)
      .single();
    if (e1 || !kase) throw new Error("Case not found");

    // Provider precedence: explicit override → agency connection → simulated.
    let connectionConfig: Record<string, unknown> | null = null;
    let provider = data.provider ?? "";
    if (kase.agency_id) {
      const { data: conn } = await context.supabase
        .from("provider_connections")
        .select("provider, enabled, config")
        .eq("agency_id", kase.agency_id)
        .eq("kind", "referencing")
        .maybeSingle();
      if (conn?.enabled) {
        connectionConfig = (conn.config ?? {}) as Record<string, unknown>;
        if (!provider) provider = conn.provider;
      }
    }
    if (!provider) provider = "simulated";

    const insertRow = {
      case_id: data.case_id,
      check_type: data.check_type,
      provider,
      status: "in_progress" as const,
      requested_by: context.userId,
    };
    const { data: created, error: e2 } = await context.supabase
      .from("referencing_checks")
      .insert(insertRow)
      .select()
      .single();
    if (e2) throw new Error(e2.message);

    if (provider === "simulated") {
      if (process.env.ENABLE_SIMULATED_REFERENCING !== "true") {
        await context.supabase.from("referencing_checks").delete().eq("id", created!.id);
        throw new Error(
          "Simulated referencing is disabled. Connect a referencing provider before requesting checks.",
        );
      }
      const sim = simulateCheck(data.check_type, {
        income: kase.income_monthly,
        consent: kase.credit_consent,
        previous_landlord: kase.previous_landlord as Record<string, unknown>,
      });
      const { error: e3 } = await context.supabase
        .from("referencing_checks")
        .update({
          status: sim.status,
          score: sim.score,
          result: sim.result,
          completed_at: new Date().toISOString(),
          expires_at: data.check_type === "right_to_rent" ? new Date(Date.now() + 365 * 86400000).toISOString() : null,
        })
        .eq("id", created!.id);
      if (e3) throw new Error(e3.message);
      return { id: created!.id, provider, status: sim.status };
    }

    // Live provider: submit and wait for the signed webhook to deliver the decision.
    try {
      const { submitReferencingCheck } = await import("@/lib/referencing-providers.server");
      const { getServerSiteUrl } = await import("@/lib/site-url.server");
      const submission = await submitReferencingCheck(provider as any, connectionConfig, {
        check_type: data.check_type,
        case_id: kase.id,
        check_id: created!.id,
        applicant: (kase.applicant ?? {}) as Record<string, unknown>,
        employment: (kase.employment ?? {}) as Record<string, unknown>,
        previous_landlord: (kase.previous_landlord ?? {}) as Record<string, unknown>,
        income_monthly: kase.income_monthly ?? null,
        credit_consent: Boolean(kase.credit_consent),
        callback_url: `${getServerSiteUrl()}/api/public/referencing-webhook`,
      });
      const { error: e4 } = await context.supabase
        .from("referencing_checks")
        .update({
          external_ref: submission.external_ref,
          status: submission.status,
          result: submission.raw as any,
          ...(submission.status !== "in_progress" ? { completed_at: new Date().toISOString() } : {}),
        })
        .eq("id", created!.id);
      if (e4) throw new Error(e4.message);
      return { id: created!.id, provider, status: submission.status };
    } catch (err: any) {
      await context.supabase
        .from("referencing_checks")
        .update({ status: "error", result: { error: String(err?.message ?? err).slice(0, 500) }, completed_at: new Date().toISOString() })
        .eq("id", created!.id);
      throw new Error(String(err?.message ?? err));
    }
  });


export const cancelReferencingCheck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("referencing_checks")
      .update({ status: "cancelled", completed_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
