import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { scoreInvestorForDeal } from "@/lib/deal-screening";

const uuid = z.string().uuid();
const money = z.coerce.number().min(0).max(100_000_000);
const service = z.enum([
  "omniqora.property-intelligence",
  "omniqora.property-scout",
  "omniqora.deal-detective",
  "omniqora.property-underwriter",
  "omniqora.property-match",
  "omniqora.vacancy-scout",
]);

const createSchema = z.object({
  title: z.string().trim().min(1).max(240),
  postcode: z.string().trim().max(12).optional().nullable(),
  source: z
    .enum(["manual", "seller", "agent", "auction", "omniqora_scout", "domureva"])
    .default("manual"),
  askingPrice: money.optional().nullable(),
  purchasePrice: money,
  conservativeExitValue: money,
  worksCost: money.default(0),
  otherCosts: money.default(0),
  investorProfitTarget: money.default(0),
  proposedFee: money.default(0),
});

const investorSchema = z.object({
  id: uuid.optional(),
  buyerId: uuid.optional().nullable(),
  investorRef: z.string().trim().min(1).max(160),
  minBudget: money.default(0),
  maxBudget: money,
  areas: z.array(z.string().trim().min(1).max(80)).max(50).default([]),
  strategies: z.array(z.string().trim().min(1).max(80)).max(50).default([]),
  fundingStatus: z
    .enum(["unknown", "cash_verified", "aip", "bridging_ready", "mortgage", "other"])
    .default("unknown"),
  completionDays: z.coerce.number().int().min(1).max(365).optional().nullable(),
  minProfitTarget: money.optional().nullable(),
  minYield: z.coerce.number().min(0).max(100).optional().nullable(),
  acceptsRefurbishment: z.boolean().default(false),
  acceptsCouncilScheme: z.boolean().default(false),
});

const commercialReadinessSchema = z.object({
  opportunityId: uuid,
  proposedFee: money.optional(),
  feePayer: z.enum(["buyer", "seller", "split"]),
  vatTreatment: z.enum(["inclusive", "exclusive", "not_applicable"]),
  feeDisclosed: z.boolean(),
  feeDisclosureReference: z.string().trim().max(500).optional().nullable(),
  sellerAuthorityConfirmed: z.boolean(),
  sellerAuthorityReference: z.string().trim().max(500).optional().nullable(),
});

export function dealEconomics(input: {
  purchasePrice: number;
  conservativeExitValue: number;
  worksCost: number;
  otherCosts: number;
  investorProfitTarget: number;
  proposedFee: number;
}) {
  const feeHeadroom = Math.max(
    0,
    input.conservativeExitValue -
      input.purchasePrice -
      input.worksCost -
      input.otherCosts -
      input.investorProfitTarget,
  );
  const investorBufferAfterFee = feeHeadroom - input.proposedFee;
  return {
    acquisitionSubtotal: round(input.purchasePrice + input.proposedFee),
    feeHeadroom: round(feeHeadroom),
    investorBufferAfterFee: round(investorBufferAfterFee),
    viableAtProposedFee: investorBufferAfterFee >= 0,
  };
}

const round = (value: number) => Math.round(value * 100) / 100;

export async function agencyAccess(supabase: any, userId: string) {
  const { data: roles, error: roleError } = await supabase.from("user_roles")
    .select("role").eq("user_id", userId);
  if (roleError) throw new Error("Unable to check property sourcing role");
  if (!(roles ?? []).some((record: { role: string }) => ["agent", "admin"].includes(record.role))) {
    throw new Error("Deal sourcing requires an authorised agency role");
  }
  if ((roles ?? []).some((record: { role: string }) => record.role === "admin")) {
    const verified = await supabase.rpc("current_platform_admin_security_status").maybeSingle();
    if (verified.error || !verified.data?.is_aal2 || !verified.data?.is_authorized) {
      throw new Error("Platform administrator must have verified MFA and authorisation");
    }
  }
  const owned = await supabase
    .from("agencies")
    .select("id,omniqora_tenant_id")
    .eq("owner_id", userId)
    .limit(1)
    .maybeSingle();
  if (owned.error) throw new Error(owned.error.message);
  if (owned.data) {
    return owned.data as { id: string; omniqora_tenant_id: string | null };
  }

  const member = await supabase
    .from("agency_members")
    .select("agency_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (member.error) throw new Error(member.error.message);
  if (!member.data?.agency_id) throw new Error("Agency access required");

  const agency = await supabase
    .from("agencies")
    .select("id,omniqora_tenant_id")
    .eq("id", member.data.agency_id)
    .single();
  if (agency.error || !agency.data) throw new Error("Agency access required");
  return agency.data as { id: string; omniqora_tenant_id: string | null };
}

function omniqoraConfig() {
  const endpoint = process.env.OMNIQORA_INTELLIGENCE_URL?.trim();
  const token = process.env.OMNIQORA_SERVICE_TOKEN?.trim();
  if (!endpoint || !token) throw new Error("Omniqora intelligence is not configured");
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new Error("Invalid Omniqora intelligence URL");
  }
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error("Omniqora intelligence must use HTTPS");
  }
  return { url: url.toString(), token };
}

async function fetchOpportunity(db: any, agencyId: string, opportunityId: string) {
  const result = await db
    .from("deal_opportunities")
    .select("*")
    .eq("id", opportunityId)
    .eq("agency_id", agencyId)
    .maybeSingle();
  if (result.error || !result.data) throw new Error("Opportunity not found");
  return result.data;
}

function scoreInvestor(
  opportunity: any, profile: any,
): { score: number; reasons: string[] } {
  const result = scoreInvestorForDeal({
    purchasePrice: Number(opportunity.purchase_price),
    fee: Number(opportunity.proposed_fee ?? 0),
    postcode: String(opportunity.postcode ?? ""),
    strategy: String(opportunity.analysis?.strategy ?? "flip"),
    projectedProfit: opportunity.analysis?.screening?.projectedProfitAfterFee ?? null,
    // Conservative affordability includes declared works and ancillary costs.
    worksCost: Number(opportunity.works_cost ?? 0) + Number(opportunity.other_costs ?? 0),
  }, {
    id: String(profile.id),
    investorRef: String(profile.investor_ref),
    minBudget: Number(profile.min_budget ?? 0),
    maxBudget: Number(profile.max_budget ?? 0),
    areas: Array.isArray(profile.areas) ? profile.areas : [],
    strategies: Array.isArray(profile.strategies) ? profile.strategies : [],
    fundingStatus: String(profile.funding_status ?? "unknown"),
    minProfitTarget: profile.min_profit_target,
    acceptsRefurbishment: Boolean(profile.accepts_refurbishment),
    active: Boolean(profile.active),
  });
  return result ?? { score: 0, reasons: [] };
}

export const listDealOpportunities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const agency = await agencyAccess(context.supabase, context.userId);
    const { data, error } = await (context.supabase as any)
      .from("deal_opportunities")
      .select("*")
      .eq("agency_id", agency.id)
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return {
      agencyId: agency.id,
      omniqoraConnected: Boolean(agency.omniqora_tenant_id),
      rows: data ?? [],
    };
  });

export const createDealOpportunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((value: unknown) => createSchema.parse(value))
  .handler(async ({ data, context }) => {
    const agency = await agencyAccess(context.supabase, context.userId);
    const economics = dealEconomics({
      purchasePrice: data.purchasePrice,
      conservativeExitValue: data.conservativeExitValue,
      worksCost: data.worksCost,
      otherCosts: data.otherCosts,
      investorProfitTarget: data.investorProfitTarget,
      proposedFee: data.proposedFee,
    });
    const { data: row, error } = await (context.supabase as any)
      .from("deal_opportunities")
      .insert({
        agency_id: agency.id,
        title: data.title,
        postcode: data.postcode || null,
        source: data.source,
        asking_price: data.askingPrice ?? null,
        purchase_price: data.purchasePrice,
        conservative_exit_value: data.conservativeExitValue,
        works_cost: data.worksCost,
        other_costs: data.otherCosts,
        investor_profit_target: data.investorProfitTarget,
        proposed_fee: data.proposedFee,
        analysis: { economics },
        created_by: context.userId,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const setDealCommercialReadiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((value: unknown) => commercialReadinessSchema.parse(value))
  .handler(async ({ data, context }) => {
    const agency = await agencyAccess(context.supabase, context.userId);
    const now = new Date().toISOString();

    if (data.feeDisclosed && !data.feeDisclosureReference?.trim()) {
      throw new Error("Add the fee disclosure agreement/evidence reference");
    }
    if (data.sellerAuthorityConfirmed && !data.sellerAuthorityReference?.trim()) {
      throw new Error("Add the seller authority agreement/evidence reference");
    }

    const patch: Record<string, unknown> = {
      fee_payer: data.feePayer,
      fee_vat_treatment: data.vatTreatment,
      fee_disclosed: data.feeDisclosed,
      fee_disclosed_at: data.feeDisclosed ? now : null,
      fee_disclosure_reference: data.feeDisclosureReference?.trim() || null,
      seller_authority_confirmed: data.sellerAuthorityConfirmed,
      seller_authority_confirmed_at: data.sellerAuthorityConfirmed ? now : null,
      seller_authority_reference: data.sellerAuthorityReference?.trim() || null,
    };
    if (data.proposedFee !== undefined) patch.proposed_fee = data.proposedFee;

    const { data: row, error } = await (context.supabase as any)
      .from("deal_opportunities")
      .update(patch)
      .eq("id", data.opportunityId)
      .eq("agency_id", agency.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listInvestorProfiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const agency = await agencyAccess(context.supabase, context.userId);
    const { data, error } = await (context.supabase as any)
      .from("investor_profiles")
      .select("*, buyer_profiles(full_name,email,phone)")
      .eq("agency_id", agency.id)
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(250);
    if (error) throw new Error(error.message);
    return { agencyId: agency.id, rows: data ?? [] };
  });

export const saveInvestorProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((value: unknown) => investorSchema.parse(value))
  .handler(async ({ data, context }) => {
    const agency = await agencyAccess(context.supabase, context.userId);
    if (data.maxBudget < data.minBudget) throw new Error("Maximum budget must be at least minimum budget");

    if (data.buyerId) {
      const linked = await context.supabase.from("buyer_profiles")
        .select("id").eq("id", data.buyerId).eq("agency_id", agency.id).maybeSingle();
      if (linked.error || !linked.data) throw new Error("The selected buyer is not in this agency");
    }

    const payload = {
      agency_id: agency.id,
      buyer_id: data.buyerId ?? null,
      investor_ref: data.investorRef,
      min_budget: data.minBudget,
      max_budget: data.maxBudget,
      areas: data.areas,
      strategies: data.strategies,
      funding_status: data.fundingStatus,
      completion_days: data.completionDays ?? null,
      min_profit_target: data.minProfitTarget ?? null,
      min_yield: data.minYield ?? null,
      accepts_refurbishment: data.acceptsRefurbishment,
      accepts_council_scheme: data.acceptsCouncilScheme,
      created_by: context.userId,
    };

    const query = data.id
      ? (context.supabase as any)
          .from("investor_profiles")
          .update(payload)
          .eq("id", data.id)
          .eq("agency_id", agency.id)
      : (context.supabase as any).from("investor_profiles").insert(payload);

    const result = await query.select("*").single();
    if (result.error) throw new Error(result.error.message);
    return result.data;
  });

export const refreshOpportunityMatches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((value: unknown) => z.object({ opportunityId: uuid }).parse(value))
  .handler(async ({ data, context }) => {
    const agency = await agencyAccess(context.supabase, context.userId);
    const db = context.supabase as any;
    const opportunity = await fetchOpportunity(db, agency.id, data.opportunityId);

    const profiles = await db
      .from("investor_profiles")
      .select("*")
      .eq("agency_id", agency.id)
      .eq("active", true)
      .limit(500);
    if (profiles.error) throw new Error(profiles.error.message);

    const existing = await db
      .from("deal_matches")
      .select("investor_profile_id,status,buyer_terms_accepted,buyer_terms_accepted_at,buyer_terms_reference,introduced_at")
      .eq("agency_id", agency.id)
      .eq("opportunity_id", data.opportunityId);
    if (existing.error) throw new Error(existing.error.message);

    const previous = new Map<string, { status: string }>(
      (existing.data ?? []).map((row: any): [string, { status: string }] => [String(row.investor_profile_id), { status: String(row.status) }]),
    );
    const ranked = (profiles.data ?? [])
      .map((profile: any) => ({
        profile,
        ...scoreInvestor(opportunity, profile),
      }))
      .filter((match: any) => match.score > 0)
      .sort((a: any, b: any) => b.score - a.score);

    for (const match of ranked) {
      const before = previous.get(match.profile.id);
      const { error } = await db.from("deal_matches").upsert(
        {
          agency_id: agency.id,
          opportunity_id: opportunity.id,
          investor_profile_id: match.profile.id,
          score: match.score,
          reasons: match.reasons,
          status: before?.status ?? "suggested",
        },
        { onConflict: "opportunity_id,investor_profile_id" },
      );
      if (error) throw new Error(error.message);
    }

    return {
      opportunityId: opportunity.id,
      acquisitionSubtotal:
        Number(opportunity.purchase_price ?? 0) + Number(opportunity.proposed_fee ?? 0),
      matches: ranked.slice(0, 50).map((match: any) => ({
        investorProfileId: match.profile.id,
        investorRef: match.profile.investor_ref,
        score: match.score,
        reasons: match.reasons,
        maxBudget: match.profile.max_budget,
        fundingStatus: match.profile.funding_status,
      })),
    };
  });

export const listOpportunityMatches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((value: unknown) => z.object({ opportunityId: uuid }).parse(value))
  .handler(async ({ data, context }) => {
    const agency = await agencyAccess(context.supabase, context.userId);
    const { data: rows, error } = await (context.supabase as any)
      .from("deal_matches")
      .select("*, investor_profiles(investor_ref,max_budget,areas,strategies,funding_status,completion_days,accepts_refurbishment,accepts_council_scheme)")
      .eq("agency_id", agency.id)
      .eq("opportunity_id", data.opportunityId)
      .order("score", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const introduceMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((value: unknown) =>
    z
      .object({
        matchId: uuid,
        buyerTermsAccepted: z.literal(true),
        buyerTermsReference: z.string().trim().min(1).max(500),
      })
      .parse(value),
  )
  .handler(async ({ data, context }) => {
    const agency = await agencyAccess(context.supabase, context.userId);
    const db = context.supabase as any;
    const match = await db.from("deal_matches")
      .select("opportunity_id, investor_profiles(*)")
      .eq("id", data.matchId).eq("agency_id", agency.id).maybeSingle();
    if (match.error || !match.data) throw new Error("Buyer match not found");
    const opportunity = await fetchOpportunity(db, agency.id, match.data.opportunity_id);
    if (!opportunity.analysis?.screening ||
        opportunity.analysis.screening.verdict === "insufficient_evidence") {
      throw new Error("A documented comparable-based valuation is required before an introduction");
    }
    const profile = match.data.investor_profiles;
    if (!profile || !scoreInvestor(opportunity, profile).score) {
      throw new Error("Buyer mandate no longer matches this opportunity");
    }
    if (!["cash_verified", "aip", "bridging_ready"].includes(profile.funding_status)) {
      throw new Error("Verify the buyer's funding evidence before an introduction");
    }
    const compliance = await db.from("deal_agency_compliance")
      .select("approved_at").eq("agency_id", agency.id).maybeSingle();
    const approved = compliance.data?.approved_at ? Date.parse(compliance.data.approved_at) : 0;
    if (compliance.error || !approved || Date.now() - approved > 366 * 86400000) {
      throw new Error("Agency AML and redress compliance has not been approved");
    }
    const now = new Date().toISOString();
    const { data: row, error } = await db
      .from("deal_matches")
      .update({
        buyer_terms_accepted: true,
        buyer_terms_accepted_at: now,
        buyer_terms_reference: data.buyerTermsReference,
        status: "introduced",
      })
      .eq("id", data.matchId)
      .eq("agency_id", agency.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

const startSchema = z.object({
  opportunityId: uuid,
  serviceKey: service.default("omniqora.deal-detective"),
});

export const startDealIntelligence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((value: unknown) => startSchema.parse(value))
  .handler(async ({ data, context }) => {
    const agency = await agencyAccess(context.supabase, context.userId);
    if (!agency.omniqora_tenant_id) {
      throw new Error("This agency is not mapped to an Omniqora tenant yet");
    }

    const db = context.supabase as any;
    const row = await fetchOpportunity(db, agency.id, data.opportunityId);
    const { url, token } = omniqoraConfig();

    const economics = dealEconomics({
      purchasePrice: Number(row.purchase_price),
      conservativeExitValue: Number(row.conservative_exit_value),
      worksCost: Number(row.works_cost),
      otherCosts: Number(row.other_costs),
      investorProfitTarget: Number(row.investor_profit_target),
      proposedFee: Number(row.proposed_fee),
    });

    let candidateMatches: unknown[] = [];
    if (data.serviceKey === "omniqora.property-match") {
      const matches = await db
        .from("deal_matches")
        .select("score,reasons,investor_profiles(id,min_budget,max_budget,areas,strategies,funding_status,completion_days,accepts_refurbishment,accepts_council_scheme)")
        .eq("agency_id", agency.id)
        .eq("opportunity_id", row.id)
        .order("score", { ascending: false })
        .limit(25);
      if (matches.error) throw new Error(matches.error.message);
      candidateMatches = matches.data ?? [];
    }

    const goal =
      data.serviceKey === "omniqora.property-match"
        ? "Review the supplied deterministic buyer matches. Re-rank only from the supplied criteria and explain material mismatches or missing information. Do not invent buyer funding, property value or legal conclusions."
        : "Review this Gabley property opportunity using only supplied evidence. Explain price/discount risks, missing evidence and next human checks. Do not invent valuations, seller motivation, funding or legal conclusions.";

    const response = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        operation: "run.start",
        tenantId: agency.omniqora_tenant_id,
        productKey: "gabley",
        serviceKey: data.serviceKey,
        profile:
          data.serviceKey === "omniqora.property-underwriter"
            ? "finance"
            : data.serviceKey === "omniqora.property-match"
              ? "discovery"
              : "transaction",
        goal,
        maxSteps: 8,
        inputVersion: "gabley.deal-intelligence.v2",
        context: {
          opportunityId: row.id,
          title: row.title,
          postcode: row.postcode,
          source: row.source,
          askingPrice: row.asking_price,
          purchasePrice: row.purchase_price,
          conservativeExitValue: row.conservative_exit_value,
          worksCost: row.works_cost,
          otherCosts: row.other_costs,
          investorProfitTarget: row.investor_profit_target,
          proposedFee: row.proposed_fee,
          feePayer: row.fee_payer,
          feeDisclosed: row.fee_disclosed,
          sellerAuthorityConfirmed: row.seller_authority_confirmed,
          economics,
          domurevaCaseRef: row.domureva_case_ref,
          candidateMatches,
        },
        sourceRefs: Array.isArray(row.source_refs)
          ? row.source_refs
              .filter((value: unknown): value is string => typeof value === "string")
              .slice(0, 200)
          : [],
      }),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok || typeof body?.runId !== "string") {
      throw new Error(body?.error || "Omniqora intelligence request was refused");
    }

    const update = await db
      .from("deal_opportunities")
      .update({
        ai_run_id: body.runId,
        analysis: {
          ...(row.analysis ?? {}),
          economics,
          lastIntelligence: {
            runId: body.runId,
            serviceKey: data.serviceKey,
            status: body.status,
          },
        },
      })
      .eq("id", row.id)
      .eq("agency_id", agency.id);
    if (update.error) throw new Error(update.error.message);

    return { runId: body.runId, status: body.status, serviceKey: data.serviceKey };
  });

export const getDealIntelligenceRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((value: unknown) => z.object({ runId: uuid }).parse(value))
  .handler(async ({ data, context }) => {
    const agency = await agencyAccess(context.supabase, context.userId);
    if (!agency.omniqora_tenant_id) {
      throw new Error("This agency is not mapped to an Omniqora tenant yet");
    }
    const { url, token } = omniqoraConfig();
    const response = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        operation: "run.get",
        tenantId: agency.omniqora_tenant_id,
        productKey: "gabley",
        runId: data.runId,
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body?.error || "Unable to read Omniqora intelligence run");
    return body;
  });
