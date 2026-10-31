import assert from "node:assert/strict";
import test from "node:test";
import { summarizeTenantRent, rentChargeOutstandingMinor, rentCheckoutBlockReason } from "../src/lib/tenant-rent.ts";

test("tenant rent counts only outstanding charges, including partial payments", () => {
  const result = summarizeTenantRent([
    { due_date: "2026-10-01", amount: 1100, paid_amount: 600, status: "paid" },
    { due_date: "2026-09-01", amount: 900, paid_amount: 900, status: "paid" },
    { due_date: "2026-08-01", amount: 400, paid_amount: 0, status: "waived" },
    { due_date: "2026-11-01", amount: 1050, paid_amount: 50, status: "due" },
    { due_date: "2026-11-01", amount: 100, paid_amount: null, status: "due" },
    { due_date: "2026-12-01", amount: 1200, paid_amount: 0, status: "due" },
  ], "2026-10-31");
  assert.deepEqual(result, {
    nextDue: { due_date: "2026-11-01", amount_due: 1100 },
    overdueCount: 1,
    overdueAmount: 500,
  });
});

test("today's outstanding rent is due, not overdue", () => {
  assert.deepEqual(
    summarizeTenantRent([{ due_date: "2026-10-31", amount: 875, paid_amount: 175, status: "part_paid" }], "2026-10-31"),
    { nextDue: { due_date: "2026-10-31", amount_due: 700 }, overdueCount: 0, overdueAmount: 0 },
  );
});

test("fully settled, waived and empty schedules never fabricate a due payment", () => {
  assert.deepEqual(summarizeTenantRent([], "2026-10-31"), { nextDue: null, overdueCount: 0, overdueAmount: 0 });
  assert.deepEqual(
    summarizeTenantRent([
      { due_date: "2026-10-01", amount: 300, paid_amount: 300, status: "due" },
      { due_date: "2026-11-01", amount: 100, paid_amount: 0, status: "waived" },
    ], "2026-10-31"),
    { nextDue: null, overdueCount: 0, overdueAmount: 0 },
  );
});

test("invalid financial inputs fail closed", () => {
  assert.throws(() => summarizeTenantRent([{ due_date: "2026-10-01", amount: Number.NaN, paid_amount: 0, status: "due" }], "2026-10-31"));
  assert.throws(() => summarizeTenantRent([{ due_date: "2026-10-01", amount: 100, paid_amount: -10, status: "due" }], "2026-10-31"));
  assert.throws(() => summarizeTenantRent([{ due_date: "31-10-2026", amount: 100, paid_amount: 0, status: "due" }], "2026-10-31"));
});

test("checkout never charges the full amount of a partially settled rent item", () => {
  const partial = { amount: 1000, paid_amount: 450, status: "part_paid" };
  assert.equal(rentChargeOutstandingMinor(partial), 55000);
  assert.match(rentCheckoutBlockReason(partial) ?? "", /Part-paid/i);
  assert.equal(rentCheckoutBlockReason({ amount: 1000, paid_amount: null, status: "due" }), null);
  assert.match(rentCheckoutBlockReason({ amount: 1000, paid_amount: 1000, status: "paid" }) ?? "", /paid/i);
  assert.match(rentCheckoutBlockReason({ amount: 1000, paid_amount: 0, status: "waived" }) ?? "", /waived/i);
});

test("inconsistent allocations cannot silently reduce rent to zero", () => {
  assert.throws(() => rentChargeOutstandingMinor({ amount: 500, paid_amount: 650, status: "due" }), /Invalid/);
  assert.throws(() => rentChargeOutstandingMinor({ amount: 500, paid_amount: Number.POSITIVE_INFINITY, status: "due" }), /Invalid/);
  assert.throws(() => summarizeTenantRent([{ amount: 500, paid_amount: 650, status: "due", due_date: "2026-10-01" }], "2026-10-31"), /Invalid/);
});
