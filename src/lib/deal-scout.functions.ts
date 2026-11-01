import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { screenPropertyDeal, type DealScreenInput, type SoldComparable } from "@/lib/deal-screening";
import { agencyAccess } from "@/lib/deal-intelligence.functions";

/**
 * Sale discovery reads only publicly published Gabley listings.
 * No third-party portal scraping, private contact discovery, or seller outreach.
 */
const filters = z.object({
  city: z.string().trim().max(80).optional(),
  postcodePrefix: z.string().trim().max(10).optional(),
  maxPrice: z.number().finite().min(1000).max(100_000_000).optional(),
  propertyType: z.enum(["any", "house", "flat", "bungalow", "studio", "land", "commercial"]).default("any"),
}).strict();
const uuid = z.string().uuid();
const money = z.number().finite().min(0).max(100_000_000);
const comparableSchema = z.object({
  price: money.positive(),
  soldAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  postcode: z.string().trim().min(3).max(15),
  propertyType: z.string().trim().min(2).max(40),
  bedrooms: z.number().int().min(0).max(100).optional().nullable(),
  floorAreaSqft: z.number().min(100).max(200_000).optional().nullable(),
  source: z.enum(["hm_land_registry", "agent_verified"]),
  evidenceRef: z.string().trim().min(5).max(500),
}).strict();
const screenSchema = z.object({
  opportunityId: uuid,
  propertyType: z.string().trim().min(2).max(40),
  bedrooms: z.number().int().min(0).max(100).optional().nullable(),
  subjectFloorAreaSqft: z.number().min(100).max(200_000).optional().nullable(),
  proposedPurchasePrice: money.positive(),
  worksCost: money,
  contingencyPercent: z.number().min(0).max(50),
  stampDutyEstimate: money,
  legalCost: money,
  financeAndHoldingCost: money,
  sellingCost: money,
  otherCosts: money,
  proposedSourcingFee: money,
  investorProfitTarget: money,
  comps: z.array(comparableSchema).max(60),
}).strict();

async function dealAgency(context: { supabase: any; userId: string }) {
  const agency = await agencyAccess(context.supabase, context.userId);
  return agency.id;
}

export const scanPublishedSaleListings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => filters.parse(data))
  .handler(async ({ data, context }) => {
    await dealAgency(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin.from("listings")
      .select("id,slug,title,postcode,city,price,bedrooms,floor_area_sqft,currency,purpose,status,marketplace_publish,properties(property_type)")
      .eq("marketplace_publish", true).eq("status", "published").eq("purpose", "sale")
      .eq("currency", "GBP").not("price", "is", null)
      .order("price", { ascending: true })
      .limit(150);
    if (data.city) query = query.ilike("city", `%${data.city.replace(/[%_,()\\]/g, "")}%`);
    if (data.postcodePrefix) query = query.ilike("postcode", `${data.postcodePrefix.replace(/[%_,()\\]/g, "")}%`);
    if (data.maxPrice !== undefined) query = query.lte("price", data.maxPrice);
    const result = await query;
    if (result.error) throw new Error(result.error.message);
    const rows = (result.data ?? []).filter((row) => {
      const kind = row.properties?.property_type ?? null;
      return data.propertyType === "any" || kind === data.propertyType;
    });
    return {
      listings: rows.map((row) => ({
        id: row.id, slug: row.slug, title: row.title, postcode: row.postcode,
        city: row.city, price: row.price, bedrooms: row.bedrooms,
        floorAreaSqft: row.floor_area_sqft, propertyType: row.properties?.property_type ?? null,
        source: "Gabley published marketplace", askingOnly: true as const,
      })),
      maximumScanned: 150,
      note: "Cheapest asking prices among scanned published Gabley listings. These are not verified bargains without sold comparables.",
    };
  });

export const saveScoutCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ listingId: uuid }).strict().parse(data))
  .handler(async ({ data, context }) => {
    const agencyId = await dealAgency(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const result = await supabaseAdmin.from("listings")
      .select("id,slug,title,postcode,city,price,bedrooms,floor_area_sqft,currency,purpose,status,marketplace_publish,properties(property_type)")
      .eq("id", data.listingId).eq("marketplace_publish", true).eq("status", "published")
      .eq("purpose", "sale").eq("currency", "GBP").maybeSingle();
    if (result.error || !result.data || !result.data.price || result.data.price <= 0) {
      throw new Error("This published sale listing is no longer eligible for scouting");
    }
    const row = result.data;
    const db = context.supabase as any;
    // The unique index on agency + listingId prevents duplicate shortlisted deals.
    const previous = await db.from("deal_opportunities")
      .select("id").eq("agency_id", agencyId).contains("analysis", { listingId: row.id })
      .limit(1).maybeSingle();
    if (previous.error) throw new Error(previous.error.message);
    if (previous.data) return { id: previous.data.id as string, created: false };
    const payload = {
      agency_id: agencyId, title: row.title, postcode: row.postcode,
      source: "agent", asking_price: Number(row.price),
      purchase_price: Number(row.price), conservative_exit_value: 0,
      works_cost: 0, other_costs: 0, investor_profit_target: 0, proposed_fee: 0,
      fee_disclosed: false, seller_authority_confirmed: false,
      source_refs: [`/marketplace/${row.slug}`],
      analysis: {
        listingId: row.id, slug: row.slug, city: row.city, propertyType: row.properties?.property_type,
        bedrooms: row.bedrooms, subjectFloorAreaSqft: row.floor_area_sqft,
        sourceType: "gabley_public_listing", publishedPriceAtCapture: row.price,
        valuationStatus: "unverified", capturedAt: new Date().toISOString(),
        sellerAuthority: "not_confirmed",
      },
      created_by: context.userId, status: "research",
    };
    const created = await db.from("deal_opportunities").insert(payload).select("id").single();
    if (created.error?.code === "23505") {
      const existing = await db.from("deal_opportunities")
        .select("id").eq("agency_id", agencyId).contains("analysis", { listingId: row.id }).single();
      if (existing.error) throw new Error(existing.error.message);
      return { id: existing.data.id as string, created: false };
    }
    if (created.error) throw new Error(created.error.message);
    return { id: created.data.id as string, created: true };
  });

export const screenDealWithSoldComparables = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((value: unknown) => screenSchema.parse(value))
  .handler(async ({ data, context }) => {
    const agencyId = await dealAgency(context);
    const db = context.supabase as any;
    const result = await db.from("deal_opportunities").select("*")
      .eq("id", data.opportunityId).eq("agency_id", agencyId).maybeSingle();
    if (result.error || !result.data) throw new Error("Opportunity not found");
    const row = result.data;
    if (row.status !== "research" && row.status !== "seller_contact") {
      throw new Error("Only research-stage deals can be rescreened; request a new analysis review");
    }
    if (!row.asking_price || !row.postcode) {
      throw new Error("This deal needs a recorded asking price and postcode before comparable valuation");
    }
    const input: DealScreenInput = {
      title: row.title, postcode: row.postcode, propertyType: data.propertyType,
      bedrooms: data.bedrooms, subjectFloorAreaSqft: data.subjectFloorAreaSqft,
      askingPrice: Number(row.asking_price), proposedPurchasePrice: data.proposedPurchasePrice,
      worksCost: data.worksCost, contingencyPercent: data.contingencyPercent,
      stampDutyEstimate: data.stampDutyEstimate, legalCost: data.legalCost,
      financeAndHoldingCost: data.financeAndHoldingCost, sellingCost: data.sellingCost,
      otherCosts: data.otherCosts, proposedSourcingFee: data.proposedSourcingFee,
      investorProfitTarget: data.investorProfitTarget,
      assessedAt: new Date().toISOString().slice(0, 10),
      comps: data.comps as SoldComparable[],
    };
    const analysis = screenPropertyDeal(input);
    const patch = {
      purchase_price: data.proposedPurchasePrice,
      conservative_exit_value: analysis.conservativeExitValue ?? 0,
      works_cost: data.worksCost,
      other_costs: Number((
        analysis.totalAcquisitionAndExitCosts - data.worksCost - data.proposedSourcingFee
      ).toFixed(2)),
      investor_profit_target: data.investorProfitTarget,
      proposed_fee: data.proposedSourcingFee,
      analysis: {
        ...(row.analysis && typeof row.analysis === "object" ? row.analysis : {}),
        propertyType: data.propertyType, bedrooms: data.bedrooms,
        subjectFloorAreaSqft: data.subjectFloorAreaSqft,
        comparables: data.comps, screening: analysis,
        valuationStatus: analysis.verdict === "insufficient_evidence" ? "insufficient_evidence" : "staff_supplied_comparables",
        assessedAt: input.assessedAt,
      },
    };
    // Do not alter a previously disclosed sourcing fee without re-agreeing terms.
    if (row.fee_disclosed && Number(row.proposed_fee) !== data.proposedSourcingFee) {
      throw new Error("The disclosed fee is locked. Reconfirm signed contractual terms before changing fees");
    }
    const updated = await db.from("deal_opportunities").update(patch).eq("id", row.id)
      .eq("agency_id", agencyId).eq("updated_at", row.updated_at).select("id").maybeSingle();
    if (updated.error) throw new Error(updated.error.message);
    if (!updated.data) throw new Error("Deal changed while you reviewed it. Refresh and retry.");
    return { opportunityId: row.id, screening: analysis };
  });
