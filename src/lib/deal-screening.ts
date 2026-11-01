/**
 * Gabley Deal Scout — a deterministic evidence screen, not an AVM, survey, mortgage
 * recommendation or purchase instruction. Never manufacture comparable sales.
 */
export type SoldComparable = {
  price: number;
  soldAt: string; // YYYY-MM-DD, completed sale, not current asking price
  postcode: string;
  propertyType: string;
  bedrooms?: number | null;
  floorAreaSqft?: number | null;
  source: "hm_land_registry" | "agent_verified";
  evidenceRef: string;
};
export type DealScreenInput = {
  title: string;
  postcode: string;
  propertyType: string;
  bedrooms?: number | null;
  subjectFloorAreaSqft?: number | null;
  askingPrice: number;
  proposedPurchasePrice: number;
  worksCost: number;
  contingencyPercent: number;
  stampDutyEstimate: number;
  legalCost: number;
  financeAndHoldingCost: number;
  sellingCost: number;
  otherCosts: number;
  proposedSourcingFee: number;
  investorProfitTarget: number;
  assessedAt: string; // YYYY-MM-DD
  comps: SoldComparable[];
};
export type ScreenVerdict = "insufficient_evidence" | "review_required" | "potential_candidate" | "below_threshold";
export type DealScreenResult = {
  verdict: ScreenVerdict;
  comparablesUsed: number;
  comparableReferences: string[];
  valuationMethod: "price_per_sqft" | "whole_property" | "unavailable";
  medianComparableValue: number | null;
  conservativeExitValue: number | null;
  discountPercent: number | null;
  totalAcquisitionAndExitCosts: number;
  projectedProfitAfterFee: number | null;
  projectedRoiPercent: number | null;
  maxOfferToMeetTarget: number | null;
  confidence: "none" | "low" | "moderate";
  notes: string[];
};

const normal = (v: string) => v.trim().toUpperCase().replace(/\s+/g, "");
const round = (n: number) => Math.round(n * 100) / 100;
const whole = (v: number) => Math.round(v * 100);
function amount(n: number, name: string, allowZero = true) {
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0 || (!allowZero && n === 0) || !Number.isSafeInteger(whole(n)) || n > 100_000_000) {
    throw new Error(`Invalid ${name}`);
  }
  return whole(n);
}
function date(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Invalid comparable date");
  const ms = Date.parse(value + "T12:00:00Z");
  if (!Number.isFinite(ms) || new Date(ms).toISOString().slice(0, 10) !== value) throw new Error("Invalid comparable date");
  return ms;
}
const median = (input: number[]) => {
  const values = [...input].sort((a, b) => a - b), halfway = Math.floor(values.length / 2);
  return values.length % 2 ? values[halfway] : (values[halfway - 1] + values[halfway]) / 2;
};
const quantile = (numbers: number[], fraction: number) => {
  const sorted = [...numbers].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * fraction;
  const bottom = Math.floor(pos), top = Math.ceil(pos);
  return sorted[bottom] + (sorted[top] - sorted[bottom]) * (pos - bottom);
};
/** Price estimates use ONLY user-supplied, dated sold-price evidence. */
export function screenPropertyDeal(input: DealScreenInput): DealScreenResult {
  if (!input.title.trim() || !input.postcode.trim() || !input.propertyType.trim()) throw new Error("Property title, postcode and type required");
  if (!Array.isArray(input.comps) || input.comps.length > 60) throw new Error("Too many comparables");
  const assessed = date(input.assessedAt);
  for (const key of ["askingPrice", "proposedPurchasePrice", "worksCost", "stampDutyEstimate", "legalCost", "financeAndHoldingCost", "sellingCost", "otherCosts", "proposedSourcingFee", "investorProfitTarget"] as const) {
    amount(input[key], key, !["askingPrice", "proposedPurchasePrice"].includes(key));
  }
  if (!Number.isFinite(input.contingencyPercent) || input.contingencyPercent < 0 || input.contingencyPercent > 50) throw new Error("Invalid contingency");
  if (input.bedrooms != null && (!Number.isInteger(input.bedrooms) || input.bedrooms < 0 || input.bedrooms > 100)) throw new Error("Invalid bedrooms");
  if (input.subjectFloorAreaSqft != null && (!Number.isFinite(input.subjectFloorAreaSqft) || input.subjectFloorAreaSqft < 100 || input.subjectFloorAreaSqft > 200_000)) throw new Error("Invalid floor area");
  const outcode = normal(input.postcode).replace(/[0-9][A-Z]{2}$/, "");
  const costPence =
    amount(input.worksCost, "works") +
    Math.round(amount(input.worksCost, "works") * input.contingencyPercent / 100) +
    amount(input.stampDutyEstimate, "SDLT estimate") +
    amount(input.legalCost, "legal cost") +
    amount(input.financeAndHoldingCost, "finance and holding cost") +
    amount(input.sellingCost, "selling cost") +
    amount(input.otherCosts, "other costs") +
    amount(input.proposedSourcingFee, "fee");
  const totalCosts = costPence / 100;
  const notes = [
    "Research estimate only; no purchase, offer, referral or valuation is authorised.",
    "Stamp duty, tax and borrowing costs are manual estimates; confirm for the buyer and jurisdiction.",
    "Seller authority, AML, redress, buyer terms, title, condition and leasehold/planning issues need human checks.",
  ];
  const seen = new Set<string>();
  const eligible: SoldComparable[] = [];
  for (const c of input.comps) {
    amount(c.price, "sold price", false);
    const sold = date(c.soldAt);
    if (typeof c.evidenceRef !== "string" || c.evidenceRef.trim().length < 5 || c.evidenceRef.length > 500) throw new Error("Every comparable needs an evidence reference");
    if (c.source !== "hm_land_registry" && c.source !== "agent_verified") throw new Error("Unknown sold-price source");
    if (c.bedrooms != null && (!Number.isInteger(c.bedrooms) || c.bedrooms < 0 || c.bedrooms > 100)) throw new Error("Invalid comparable bedrooms");
    if (c.floorAreaSqft != null && (!Number.isFinite(c.floorAreaSqft) || c.floorAreaSqft < 100 || c.floorAreaSqft > 200_000)) throw new Error("Invalid comparable floor area");
    const key = c.source + ":" + c.evidenceRef.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    if (sold > assessed || assessed - sold > 1000 * 60 * 60 * 24 * 1096) continue;
    if (!c.postcode || !normal(c.postcode).startsWith(outcode)) continue;
    if (normal(c.propertyType) !== normal(input.propertyType)) continue;
    if (input.bedrooms != null && c.bedrooms != null && Math.abs(c.bedrooms - input.bedrooms) > 1) continue;
    eligible.push(c);
  }
  const empty: DealScreenResult = {
    verdict: "insufficient_evidence", comparablesUsed: eligible.length,
    comparableReferences: eligible.map(c => c.evidenceRef),
    valuationMethod: "unavailable", medianComparableValue: null, conservativeExitValue: null,
    discountPercent: null, totalAcquisitionAndExitCosts: totalCosts,
    projectedProfitAfterFee: null, projectedRoiPercent: null, maxOfferToMeetTarget: null,
    confidence: "none", notes: [...notes, "At least three distinct comparable completed sales are required before screening value."],
  };
  if (eligible.length < 3) return empty;
  const sqft = input.subjectFloorAreaSqft;
  const sized = sqft ? eligible.filter(c => c.floorAreaSqft && c.floorAreaSqft >= sqft * .5 && c.floorAreaSqft <= sqft * 2) : [];
  const usePpsf = !!sqft && sized.length >= 3;
  const selected = usePpsf ? sized : eligible;
  const observations = selected.map(c => usePpsf ? c.price / c.floorAreaSqft! * sqft! : c.price);
  // A median-based trim limits one erroneous/atypical sale's influence without hiding data.
  const initialMedian = median(observations);
  const kept = observations.filter(v => v >= initialMedian * .65 && v <= initialMedian * 1.35);
  if (kept.length < 3) return { ...empty, comparablesUsed: kept.length, notes: [...notes, "Comparable values diverge too widely for a supportable estimate."] };
  const mid = median(kept);
  // Conservative lower-quartile less an additional 5% buffer for unobserved factors.
  const low = round(quantile(kept, .25) * .95);
  const spread = (quantile(kept, .75) - quantile(kept, .25)) / mid;
  const confidence = kept.length >= 5 && spread <= .25 ? "moderate" : "low";
  const discount = round((low - input.askingPrice) / low * 100);
  const allIn = input.proposedPurchasePrice + totalCosts;
  const profit = round(low - allIn);
  const roi = allIn > 0 ? round(profit / allIn * 100) : null;
  const maxOffer = round(low - totalCosts - input.investorProfitTarget);
  const verdict: ScreenVerdict = profit >= input.investorProfitTarget && discount >= 12 && input.proposedPurchasePrice <= input.askingPrice
    ? "potential_candidate"
    : profit < input.investorProfitTarget || discount < 5
      ? "below_threshold"
      : "review_required";
  return {
    verdict, comparablesUsed: kept.length, comparableReferences: selected.map(c => c.evidenceRef),
    valuationMethod: usePpsf ? "price_per_sqft" : "whole_property",
    medianComparableValue: round(mid), conservativeExitValue: low, discountPercent: discount,
    totalAcquisitionAndExitCosts: round(totalCosts), projectedProfitAfterFee: profit,
    projectedRoiPercent: roi, maxOfferToMeetTarget: maxOffer, confidence,
    notes: [...notes, confidence === "low" ? "Low confidence: obtain a qualified independent valuation before any recommendation." : "Moderate evidence confidence does not replace a qualified valuation."],
  };
}

/** Explainable investor fit: hard budget and geography constraints, no guessed funding. */
export type InvestorMandate = {
  id: string; investorRef: string; minBudget: number; maxBudget: number;
  areas: string[]; strategies: string[]; fundingStatus: string;
  minProfitTarget?: number | null; acceptsRefurbishment: boolean; active: boolean;
};
export function scoreInvestorForDeal(input: {
  purchasePrice: number; fee: number; postcode: string; strategy: string;
  projectedProfit: number | null; worksCost: number;
}, candidate: InvestorMandate): { score: number; reasons: string[]; fundingVerified: boolean } | null {
  if (!candidate.active || !candidate.id || !candidate.investorRef) return null;
  for (const n of [input.purchasePrice, input.fee, candidate.minBudget, candidate.maxBudget]) amount(n, "buyer budget");
  if (candidate.maxBudget < candidate.minBudget) throw new Error("Invalid buyer budget");
  const allIn = input.purchasePrice + input.fee + input.worksCost;
  if (allIn > candidate.maxBudget || allIn < candidate.minBudget) return null;
  const postcode = normal(input.postcode);
  if (candidate.areas.length && !candidate.areas.some(area => postcode.startsWith(normal(area)))) return null;
  if (candidate.strategies.length && !candidate.strategies.some(s => normal(s) === normal(input.strategy))) return null;
  if (input.worksCost > 0 && !candidate.acceptsRefurbishment) return null;
  if (candidate.minProfitTarget != null && (input.projectedProfit == null || input.projectedProfit < candidate.minProfitTarget)) return null;
  const fundingVerified = candidate.fundingStatus === "cash_verified" || candidate.fundingStatus === "bridging_ready" || candidate.fundingStatus === "aip";
  const reasons = ["Within declared buyer budget", candidate.areas.length ? "Matches declared area" : "Area unrestricted", candidate.strategies.length ? "Strategy fits mandate" : "Strategy unrestricted"];
  if (input.worksCost > 0) reasons.push("Accepts refurbishment");
  if (fundingVerified) reasons.push("Funding status recorded; recheck evidence before introduction");
  else reasons.push("Funding not verified");
  return { score: Math.min(100, 65 + (candidate.areas.length ? 12 : 0) + (candidate.strategies.length ? 8 : 0) + (fundingVerified ? 15 : 0)), reasons, fundingVerified };
}
