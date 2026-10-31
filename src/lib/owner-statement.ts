/**
 * Charge-cohort owner report. This is NOT a monthly cash ledger:
 * paid_amount is the amount allocated to a rent charge as at the query time,
 * while expenses use the month the completed work order was recorded.
 * All source queries remain subject to the signed-in user's Supabase RLS.
 */
export type StatementProperty = {
  id: string;
  title: string;
  address: string | null;
  city: string | null;
};

export type StatementCharge = {
  amount: number;
  paid_amount: number | null;
  due_date: string;
  status: string;
  tenancies: { property_id: string } | null;
};

export type StatementWorkOrder = {
  property_id: string | null;
  completed_at: string | null;
  actual_cost: number | null;
  status: string;
};

export type OwnerStatementRow = {
  id: string;
  property: string;
  due: number;
  applied: number;
  outstanding: number;
  expenses: number;
  indicativeNet: number;
};

export type OwnerStatementTotals = Omit<OwnerStatementRow, "id" | "property">;

function minor(value: number, kind: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid ${kind}`);
  }
  const pennies = Math.round(value * 100);
  if (!Number.isSafeInteger(pennies)) throw new Error(`Invalid ${kind}`);
  return pennies;
}

function monthParts(value: Date) {
  if (!Number.isFinite(value.getTime())) throw new Error("Invalid completed date");
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London", year: "numeric", month: "2-digit",
  }).formatToParts(value);
  return `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}`;
}

export function currentLondonMonth(today: Date = new Date()): string {
  return monthParts(today);
}

export function statementMonthBounds(month: string) {
  const match = /^(20\d{2})-(0[1-9]|1[0-2])$/.exec(month);
  if (!match) throw new Error("Select a valid statement month");
  const year = Number(match[1]);
  const index = Number(match[2]) - 1;
  const start = Date.UTC(year, index, 1);
  const next = Date.UTC(year, index + 1, 1);
  return {
    dueFrom: new Date(start).toISOString().slice(0, 10),
    dueTo: new Date(next).toISOString().slice(0, 10),
    // A ±1 day buffer captures UK summer-time boundary timestamps.
    workFrom: new Date(start - 86400000).toISOString(),
    workTo: new Date(next + 86400000).toISOString(),
  };
}

export function buildOwnerStatement(
  properties: StatementProperty[],
  charges: StatementCharge[],
  workOrders: StatementWorkOrder[],
  month: string,
): { rows: OwnerStatementRow[]; totals: OwnerStatementTotals } {
  statementMonthBounds(month);
  const records = new Map<string, {
    id: string; property: string; due: number; applied: number; expenses: number;
  }>();
  for (const property of properties) {
    if (!property.id || records.has(property.id)) throw new Error("Invalid or duplicate property");
    const name = [property.address || property.title || "Property", property.city].filter(Boolean).join(", ");
    records.set(property.id, { id: property.id, property: name, due: 0, applied: 0, expenses: 0 });
  }
  for (const charge of charges) {
    if (!charge.due_date.startsWith(month + "-") || charge.status === "waived") continue;
    if (!charge.tenancies?.property_id) throw new Error("A rent charge is missing its property");
    const record = records.get(charge.tenancies.property_id);
    // Restrict aggregation to the accessible property set, independently of RLS.
    if (!record) continue;
    const due = minor(charge.amount, "rent charge");
    const applied = minor(charge.paid_amount ?? 0, "allocated rent");
    if (applied > due) throw new Error("Allocated rent exceeds a charge");
    record.due += due;
    record.applied += applied;
  }
  for (const work of workOrders) {
    if (work.status !== "completed" || !work.completed_at || work.actual_cost === null) continue;
    if (monthParts(new Date(work.completed_at)) !== month) continue;
    if (!work.property_id) throw new Error("Completed work has no property");
    const record = records.get(work.property_id);
    if (!record) continue;
    record.expenses += minor(work.actual_cost, "completed work cost");
  }
  const rows = [...records.values()]
    .filter((record) => record.due !== 0 || record.expenses !== 0)
    .map((record): OwnerStatementRow => ({
      id: record.id,
      property: record.property,
      due: record.due / 100,
      applied: record.applied / 100,
      outstanding: (record.due - record.applied) / 100,
      expenses: record.expenses / 100,
      indicativeNet: (record.applied - record.expenses) / 100,
    }))
    .sort((a, b) => a.property.localeCompare(b.property, "en-GB") || a.id.localeCompare(b.id));
  const totals = rows.reduce<OwnerStatementTotals>(
    (sum, row) => ({
      due: sum.due + row.due,
      applied: sum.applied + row.applied,
      outstanding: sum.outstanding + row.outstanding,
      expenses: sum.expenses + row.expenses,
      indicativeNet: sum.indicativeNet + row.indicativeNet,
    }),
    { due: 0, applied: 0, outstanding: 0, expenses: 0, indicativeNet: 0 },
  );
  return { rows, totals };
}
