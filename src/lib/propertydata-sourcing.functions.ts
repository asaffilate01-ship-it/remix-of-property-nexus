import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { agencyAccess } from "@/lib/deal-intelligence.functions";
import {
  PROPERTYDATA_LISTS, normalisePropertyDataResults,
  normalisePropertyDataRecord, type LicensedSourcingCandidate,
} from "@/lib/propertydata-sourcing";

const filterSchema = z.object({
  postcode: z.string().trim().regex(/^[A-Z]{1,2}\d\w?\s*\d[A-Z]{2}$/i, "Enter a full UK postcode"),
  list: z.enum(PROPERTYDATA_LISTS).default("reduced-properties"),
  radiusMiles: z.number().int().min(1).max(80).default(10),
  maxPrice: z.number().int().min(1000).max(100_000_000).optional(),
}).strict();
const detailSchema = z.object({
  providerListingId: z.string().trim().regex(/^[A-Za-z][A-Za-z0-9-]{3,31}$/),
}).strict();

function configuration(): { key: string; dailyLimit: number } | null {
  // Operator must acknowledge the commercial source's specific usage terms.
  if (process.env.PROPERTYDATA_COMMERCIAL_USE_CONFIRMED !== "true") return null;
  const key = process.env.PROPERTYDATA_API_KEY;
  if (!key || key.length < 10) return null;
  const raw = Number(process.env.PROPERTYDATA_DAILY_API_LIMIT ?? 15);
  return { key, dailyLimit: Number.isInteger(raw) ? Math.min(100, Math.max(1,raw)) : 15 };
}

async function propertyDataGet(
  path: "sourced-properties" | "sourced-property",
  params: Record<string, string>, agencyId: string,
) {
  const config = configuration();
  if (!config) throw new Error("PropertyData is not connected. An API subscription and licence acknowledgement are required.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // The quota is database-backed and fail-closed, unlike best-effort IP limits.
  const result = await (supabaseAdmin as any).rpc("reserve_deal_provider_call", {
    _agency_id: agencyId, _provider: "propertydata", _max_daily: config.dailyLimit,
  });
  if (result.error) throw new Error("Commercial-data usage quota could not be verified");
  if (result.data !== true) throw new Error("Today's commercial property-data budget has been reached for this agency");

  const url = new URL("https://api.propertydata.co.uk/" + path);
  url.searchParams.set("key", config.key);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(12_000),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(response.status === 429
      ? "PropertyData rate limit reached"
      : "PropertyData is currently unavailable or this subscription lacks access");
  }
  const size = Number(response.headers.get("content-length") || 0);
  if (size > 2_000_000) throw new Error("Commercial data response is too large");
  const raw = await response.text();
  if (raw.length > 2_000_000) throw new Error("Commercial data response is too large");
  try { return JSON.parse(raw) as unknown; }
  catch { throw new Error("Commercial data provider returned invalid JSON"); }
}

export const dealScoutSourceStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await agencyAccess(context.supabase, context.userId);
    return {
      hmlr: "database_import_required" as const,
      propertydata: configuration() ? "configured" as const : "licence_or_credentials_required" as const,
      propertydataTerms: "https://propertydata.co.uk/api/documentation/licensing",
      pricePaidSource: "https://www.gov.uk/government/statistical-data-sets/price-paid-data-downloads",
      portalFeeds: "direct_portal_feed_licences_not_configured" as const,
    };
  });

export const searchPropertyDataInvestments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((value: unknown) => filterSchema.parse(value))
  .handler(async ({ context, data }) => {
    const agency = await agencyAccess(context.supabase, context.userId);
    const requestedAt = new Date();
    const payload = await propertyDataGet("sourced-properties", {
      list: data.list,
      postcode: data.postcode.trim().toUpperCase(),
      radius: String(data.radiusMiles),
      exclude_sstc: "1",
      results: "10", page: "1",
      ...(data.maxPrice ? { max_price: String(data.maxPrice) } : {}),
    }, agency.id);
    return {
      items: normalisePropertyDataResults(payload, requestedAt, 10),
      retrievedAt: requestedAt.toISOString(),
      provider: "PropertyData" as const,
      sourcedFrom: "Transformed licensed on-market sourcing lists; source portals include Rightmove, Zoopla and OnTheMarket",
      note: "This is a 10-result sample of specialist sourcing lists, not the entire portal market. Prices are asking prices, not proven discounts to sold comparables. Photographs and summaries are intentionally excluded.",
      retentionDays: 60,
    };
  });

export const savePropertyDataResearchCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((value: unknown) => detailSchema.parse(value))
  .handler(async ({ context, data }) => {
    const agency = await agencyAccess(context.supabase, context.userId);
    // Re-query the licensed source by ID before persisting a research case.
    // Client-supplied prices, URL and property characteristics are never trusted.
    const payload = await propertyDataGet("sourced-property", {
      property_id: data.providerListingId,
    }, agency.id);
    const root = payload && typeof payload === "object" ? payload as Record<string, unknown> : null;
    const record = root && root.status === "success"
      ? normalisePropertyDataRecord(root.property, new Date()) : null;
    if (!record || record.providerListingId !== data.providerListingId || record.sstc) {
      throw new Error("This externally sourced listing is no longer available for research");
    }
    const db = context.supabase as any;
    const existing = await db.from("deal_opportunities").select("id")
      .eq("agency_id", agency.id)
      .contains("analysis", { externalProvider: "propertydata", externalListingId: record.providerListingId })
      .limit(1).maybeSingle();
    if (existing.error) throw new Error(existing.error.message);
    if (existing.data) return { opportunityId: existing.data.id as string, created: false };

    const created = await db.from("deal_opportunities").insert({
      agency_id: agency.id,
      title: record.title,
      postcode: record.postcode,
      source: "agent",
      asking_price: record.askingPrice,
      purchase_price: record.askingPrice,
      conservative_exit_value: 0,
      works_cost: 0, other_costs: 0, investor_profit_target: 0, proposed_fee: 0,
      status: "research",
      fee_disclosed: false, seller_authority_confirmed: false,
      source_refs: [`PropertyData:${record.providerListingId}`],
      analysis: {
        externalProvider: "propertydata",
        externalListingId: record.providerListingId,
        sourcedAt: record.retrievedAt,
        externalDataExpiresAt: record.expiresAt,
        sourcePortal: record.sourcePortal,
        sourceUrl: record.sourceUrl,
        priceReductionPercent: record.priceReductionPercent,
        sourceList: record.sourcingLists,
        propertyType: record.broadPropertyType,
        detailedPropertyType: record.detailedPropertyType,
        bedrooms: record.bedrooms,
        subjectFloorAreaSqft: record.floorAreaSqft,
        valuationStatus: "unverified",
        sellerAuthority: "not_confirmed",
        sourceRights: "PropertyData SaaS value-added analysis; time-limited current-market evidence",
      },
      created_by: context.userId,
    }).select("id").single();
    if (created.error?.code === "23505") {
      const found = await db.from("deal_opportunities").select("id")
        .eq("agency_id", agency.id)
        .contains("analysis", { externalProvider: "propertydata", externalListingId: record.providerListingId })
        .single();
      if (found.error || !found.data) throw new Error("Duplicate research case could not be reconciled");
      return { opportunityId: found.data.id as string, created: false };
    }
    if (created.error) throw new Error(created.error.message);
    return { opportunityId: created.data.id as string, created: true };
  });
