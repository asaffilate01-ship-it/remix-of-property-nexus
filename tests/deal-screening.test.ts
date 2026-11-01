import assert from "node:assert/strict";
import test from "node:test";
import { screenPropertyDeal, scoreInvestorForDeal, type DealScreenInput } from "../src/lib/deal-screening.ts";

const base: DealScreenInput = {
  title: "House in Luton", postcode: "LU1 2AA", propertyType: "house", bedrooms: 3,
  askingPrice: 190000, proposedPurchasePrice: 185000, worksCost: 18000,
  contingencyPercent: 10, stampDutyEstimate: 8000, legalCost: 2000,
  financeAndHoldingCost: 6000, sellingCost: 4000, otherCosts: 1000,
  proposedSourcingFee: 3500, investorProfitTarget: 25000,
  assessedAt: "2026-11-01",
  comps: [285000, 290000, 300000, 305000, 295000].map((price, i) => ({
    price, postcode: `LU1 ${i+1}AA`, soldAt: "2026-04-15", propertyType: "house",
    bedrooms: 3, source: "hm_land_registry" as const,
    evidenceRef: `HMLR-2026-${i+101}`,
  })),
};

test("discounted deal calculations retain fees, all costs, buffer and evidence", () => {
  const r = screenPropertyDeal(base);
  assert.equal(r.verdict, "potential_candidate");
  assert.equal(r.comparablesUsed, 5);
  assert.equal(r.medianComparableValue, 295000);
  assert.equal(r.conservativeExitValue, 275500);
  assert.equal(r.discountPercent, 31.03);
  assert.equal(r.totalAcquisitionAndExitCosts, 44300);
  assert.equal(r.projectedProfitAfterFee, 46200);
  assert.equal(r.maxOfferToMeetTarget, 206200);
  assert.equal(r.confidence, "moderate");
  assert.ok(r.notes.some(n => /qualified valuation|research estimate/i.test(n)));
});

test("no sold comps does not invent a value or recommend acquisition", () => {
  const r = screenPropertyDeal({ ...base, comps: [] });
  assert.equal(r.verdict, "insufficient_evidence");
  assert.equal(r.conservativeExitValue, null);
  assert.equal(r.projectedProfitAfterFee, null);
});
test("bad source evidence, future sales and duplicates fail safely", () => {
  const duplicate = Array(3).fill(base.comps[0]);
  assert.equal(screenPropertyDeal({ ...base, comps: duplicate }).verdict, "insufficient_evidence");
  const future = base.comps.map(c => ({ ...c, soldAt: "2027-01-01" }));
  assert.equal(screenPropertyDeal({ ...base, comps: future }).verdict, "insufficient_evidence");
  assert.throws(() => screenPropertyDeal({ ...base, comps: [{ ...base.comps[0], evidenceRef: "" }] }), /evidence/);
  assert.throws(() => screenPropertyDeal({ ...base, stampDutyEstimate: -5 }), /stampDutyEstimate/);
  assert.throws(() => screenPropertyDeal({ ...base, comps: [{ ...base.comps[0], soldAt: "2026-02-30" }] }), /date/);
});
test("undercosting or high ask prevents a positive screen", () => {
  assert.equal(screenPropertyDeal({ ...base, askingPrice: 290000, proposedPurchasePrice: 290000 }).verdict, "below_threshold");
  assert.equal(screenPropertyDeal({ ...base, worksCost: 110000 }).verdict, "below_threshold");
});
test("price per sqft uses comparable area only when three properties fit", () => {
  const withSize = { ...base, subjectFloorAreaSqft: 1000, comps: base.comps.map((c, i) => ({ ...c, floorAreaSqft: 1000 + i * 20 })) };
  assert.equal(screenPropertyDeal(withSize).valuationMethod, "price_per_sqft");
});
test("buyers are filtered by hard acquisition budget, location, strategy, and refurb appetite", () => {
  const investor = { id: "buyer1", investorRef: "Investor 1", minBudget: 150000, maxBudget: 260000, areas: ["LU1"], strategies: ["flip"], fundingStatus: "cash_verified", acceptsRefurbishment: true, active: true };
  const deal = { purchasePrice: 185000, fee: 3500, postcode: "LU1 2AA", strategy: "flip", projectedProfit: 46200, worksCost: 18000 };
  const fit = scoreInvestorForDeal(deal, investor);
  assert.equal(fit?.fundingVerified, true);
  assert.ok(fit?.score && fit.score > 80);
  assert.equal(scoreInvestorForDeal(deal, { ...investor, maxBudget: 100000, minBudget: 0 }), null);
  assert.equal(scoreInvestorForDeal(deal, { ...investor, areas: ["SW1"] }), null);
  assert.equal(scoreInvestorForDeal(deal, { ...investor, acceptsRefurbishment: false }), null);
  assert.equal(scoreInvestorForDeal(deal, { ...investor, minProfitTarget: 50000 }), null);
});
test("unknown funding is explained and never presented as verified", () => {
  const match = scoreInvestorForDeal({
    purchasePrice: 150000, fee: 3000, worksCost: 0, postcode: "LU1 1AA", strategy: "flip", projectedProfit: 15000,
  }, { id: "b", investorRef: "Unverified", minBudget: 0, maxBudget: 200000, areas: [], strategies: [], fundingStatus: "unknown", acceptsRefurbishment: false, active: true });
  assert.equal(match?.fundingVerified, false);
  assert.ok(match?.reasons.includes("Funding not verified"));
});
