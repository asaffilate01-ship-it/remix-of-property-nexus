/**
 * Tenant rent amounts are charge balances, not a bank settlement/cash ledger.
 * Use pence for arithmetic and treat inconsistent payment states as errors.
 */
export type TenantRentCharge = {
  due_date: string;
  amount: number;
  paid_amount: number | null;
  status: string;
};

export type RentChargeBalance = Pick<TenantRentCharge, "amount" | "paid_amount" | "status">;

export type TenantRentSummary = {
  nextDue: { due_date: string; amount_due: number } | null;
  overdueCount: number;
  overdueAmount: number;
};

export function rentChargeOutstandingMinor(row: RentChargeBalance): number {
  const amountMinor = Math.round(Number(row.amount) * 100);
  const paidMinor = Math.round(Number(row.paid_amount ?? 0) * 100);
  if (
    typeof row.amount !== "number" || (row.paid_amount !== null && typeof row.paid_amount !== "number") ||
    !Number.isSafeInteger(amountMinor) || !Number.isSafeInteger(paidMinor) ||
    amountMinor < 0 || paidMinor < 0 || paidMinor > amountMinor
  ) {
    throw new Error("Invalid rent amount or recorded allocation");
  }
  return row.status === "waived" ? 0 : amountMinor - paidMinor;
}

/** Checkout is currently safe only when the entire original charge remains unpaid. */
export function rentCheckoutBlockReason(row: RentChargeBalance): string | null {
  const remaining = rentChargeOutstandingMinor(row);
  if (row.status === "waived") return "This charge has been waived.";
  if (row.status === "paid") return "This charge is marked paid. Contact your letting agent if this is incorrect.";
  if (remaining === 0) return "No outstanding amount remains.";
  if (Math.round(Number(row.paid_amount ?? 0) * 100) > 0) {
    return "Part-paid rent cannot be checked out online yet. Contact your letting agent to pay the remaining amount.";
  }
  return null;
}

export function summarizeTenantRent(rows: TenantRentCharge[], today: string): TenantRentSummary {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) throw new Error("Invalid summary date");
  let nextDueDate: string | null = null;
  let nextDueMinor = 0;
  let overdueCount = 0;
  let overdueMinor = 0;

  for (const row of rows) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.due_date)) throw new Error("Invalid rent due date");
    const outstanding = rentChargeOutstandingMinor(row);
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
