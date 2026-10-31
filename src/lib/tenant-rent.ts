/**
 * A tenant-facing view of rent charges, not a bank-receipt or settlement ledger.
 * Inputs are the rows visible under Supabase RLS for the signed-in tenant.
 */
export type TenantRentCharge = {
  due_date: string;
  amount: number;
  paid_amount: number | null;
  status: string;
};

export type TenantRentSummary = {
  nextDue: { due_date: string; amount_due: number } | null;
  overdueCount: number;
  overdueAmount: number;
};

export function summarizeTenantRent(rows: TenantRentCharge[], today: string): TenantRentSummary {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) throw new Error("Invalid summary date");
  let nextDueDate: string | null = null;
  let nextDueMinor = 0;
  let overdueCount = 0;
  let overdueMinor = 0;

  for (const row of rows) {
    if (row.status === "waived") continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.due_date)) throw new Error("Invalid rent due date");
    const amountMinor = Math.round(Number(row.amount) * 100);
    const paidMinor = Math.round(Number(row.paid_amount ?? 0) * 100);
    if (!Number.isFinite(amountMinor) || !Number.isFinite(paidMinor) || amountMinor < 0 || paidMinor < 0) {
      throw new Error("Invalid rent amount");
    }
    const outstanding = Math.max(0, amountMinor - paidMinor);
    if (outstanding === 0) continue;
    if (row.due_date < today) {
      overdueCount++;
      overdueMinor += outstanding;
    } else if (nextDueDate === null || row.due_date < nextDueDate) {
      nextDueDate = row.due_date;
      nextDueMinor = outstanding;
    } else if (row.due_date === nextDueDate) {
      nextDueMinor += outstanding;
    }
  }

  return {
    nextDue: nextDueDate === null ? null : { due_date: nextDueDate, amount_due: nextDueMinor / 100 },
    overdueCount,
    overdueAmount: overdueMinor / 100,
  };
}
