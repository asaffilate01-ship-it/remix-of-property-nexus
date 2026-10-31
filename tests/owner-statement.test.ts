import assert from "node:assert/strict";
import test from "node:test";
import {
  buildOwnerStatement, currentLondonMonth, statementMonthBounds,
  type StatementCharge, type StatementProperty, type StatementWorkOrder,
} from "../src/lib/owner-statement.ts";

const properties: StatementProperty[] = [
  { id: "property-a", title: "Flat A", address: "1 Station Road", city: "Luton" },
  { id: "property-b", title: "Flat B", address: "1 Station Road", city: "Luton" },
];

test("keeps same-address properties distinct and counts partial rent, not paid_at status", () => {
  const charges: StatementCharge[] = [
    { amount: 950, paid_amount: 400, due_date: "2026-10-01", status: "paid", tenancies: { property_id: "property-a" } },
    { amount: 300, paid_amount: 0, due_date: "2026-10-15", status: "waived", tenancies: { property_id: "property-a" } },
    { amount: 700, paid_amount: 700, due_date: "2026-10-01", status: "due", tenancies: { property_id: "property-b" } },
    { amount: 1000, paid_amount: 1000, due_date: "2026-09-01", status: "paid", tenancies: { property_id: "property-a" } },
  ];
  const expenses: StatementWorkOrder[] = [
    { property_id: "property-a", actual_cost: 75.25, completed_at: "2026-10-02T10:00:00Z", status: "completed" },
    { property_id: "property-b", actual_cost: 80, completed_at: "2026-10-02T10:00:00Z", status: "scheduled" },
  ];
  const result = buildOwnerStatement(properties, charges, expenses, "2026-10");
  assert.equal(result.rows.length, 2);
  assert.equal(result.rows[0].id, "property-a");
  assert.deepEqual(
    {due:result.rows[0].due,applied:result.rows[0].applied,outstanding:result.rows[0].outstanding,expenses:result.rows[0].expenses,indicativeNet:result.rows[0].indicativeNet},
    { due: 950, applied: 400, outstanding: 550, expenses: 75.25, indicativeNet: 324.75 },
  );
  assert.equal(result.rows[1].id, "property-b");
  assert.deepEqual(result.totals, { due: 1650, applied: 1100, outstanding: 550, expenses: 75.25, indicativeNet: 1024.75 });
});

test("only the selected London calendar month includes completed repair costs", () => {
  const result = buildOwnerStatement(properties, [], [
    { property_id: "property-a", actual_cost: 90, completed_at: "2026-09-30T23:30:00Z", status: "completed" },
    { property_id: "property-b", actual_cost: 30, completed_at: "2026-10-31T23:30:00Z", status: "completed" },
    { property_id: "property-a", actual_cost: 12, completed_at: "2026-11-01T00:30:00Z", status: "completed" },
  ], "2026-10");
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].expenses, 90);
  assert.equal(result.rows[0].property, "1 Station Road, Luton");
});

test("accessible property set prevents out-of-scope charges and work orders from appearing", () => {
  const result = buildOwnerStatement(properties.slice(0, 1), [
    { amount: 700, paid_amount: 700, due_date: "2026-10-01", status: "paid", tenancies: { property_id: "property-b" } },
  ], [
    { property_id: "property-b", actual_cost: 150, completed_at: "2026-10-02T00:00:00Z", status: "completed" },
  ], "2026-10");
  assert.deepEqual(result.rows, []);
  assert.deepEqual(result.totals, { due: 0, applied: 0, outstanding: 0, expenses: 0, indicativeNet: 0 });
});

test("invalid values and missing relationships fail closed", () => {
  assert.throws(() => buildOwnerStatement(properties, [
    { amount: 100, paid_amount: 120, due_date: "2026-10-01", status: "paid", tenancies: { property_id: "property-a" } },
  ], [], "2026-10"), /exceeds/);
  assert.throws(() => buildOwnerStatement(properties, [
    { amount: 100, paid_amount: 0, due_date: "2026-10-01", status: "due", tenancies: null },
  ], [], "2026-10"), /missing/);
  assert.throws(() => buildOwnerStatement(properties, [], [
    { property_id: "property-a", actual_cost: Number.NaN, completed_at: "2026-10-02T00:00:00Z", status: "completed" },
  ], "2026-10"), /Invalid/);
  assert.throws(() => statementMonthBounds("2026-13"), /valid/);
});

test("London reporting-month boundaries handle daylight saving and year change", () => {
  assert.equal(currentLondonMonth(new Date("2026-09-30T23:30:00Z")), "2026-10");
  assert.equal(currentLondonMonth(new Date("2026-10-31T23:30:00Z")), "2026-10");
  assert.deepEqual(
    Object.fromEntries(Object.entries(statementMonthBounds("2026-12")).filter(([key]) => key.startsWith("due"))),
    { dueFrom: "2026-12-01", dueTo: "2027-01-01" },
  );
});
