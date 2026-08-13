import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  PLANS,
  formatPlanPrice,
  getEntitlements,
  hasSubscriptionAccess,
  isPlanCode,
} from "../src/lib/plans.ts";

describe("subscription plans", () => {
  test("exposes the advertised monthly prices", () => {
    assert.equal(formatPlanPrice(PLANS.starter), "£29.99");
    assert.equal(formatPlanPrice(PLANS.growth), "£49.99");
    assert.equal(formatPlanPrice(PLANS.unlimited), "£99.99");
  });

  test("validates plan codes", () => {
    assert.equal(isPlanCode("starter"), true);
    assert.equal(isPlanCode("enterprise"), false);
    assert.equal(isPlanCode(null), false);
  });

  test("expires trials and rejects inactive subscriptions", () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const past = new Date(Date.now() - 86_400_000).toISOString();
    assert.equal(hasSubscriptionAccess("trialing", future), true);
    assert.equal(hasSubscriptionAccess("trialing", past), false);
    assert.equal(hasSubscriptionAccess("active"), true);
    assert.equal(hasSubscriptionAccess("canceled"), false);
  });

  test("returns server-owned plan limits only while access is valid", () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    assert.equal(getEntitlements("starter", "trialing", future)?.maxLiveListingsPerBranch, 3);
    assert.equal(getEntitlements("starter", "trialing", future)?.maxTeamSeats, 3);
    assert.equal(getEntitlements("growth", "active")?.maxLiveListingsPerBranch, 10);
    assert.equal(getEntitlements("growth", "active")?.maxTeamSeats, 10);
    assert.equal(getEntitlements("unlimited", "active")?.maxLiveListingsPerBranch, null);
    assert.equal(getEntitlements("unlimited", "active")?.maxTeamSeats, null);
    assert.equal(getEntitlements("starter", "unpaid"), null);
  });
});
