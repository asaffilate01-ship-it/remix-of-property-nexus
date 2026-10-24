export type RentItem = { amount: number; paid_amount: number | null; due_date: string; status: string };

// This is a charge-cohort summary, not a cashbook: paid_amount has no receipt history.
export function summarizeRent(rows: RentItem[], month: string, today: string) {
  let expected = 0, received = 0, overdue = 0, overdueCount = 0;
  for (const row of rows) {
    const amount = Math.round(Number(row.amount) * 100);
    const paid = Math.round(Number(row.paid_amount ?? 0) * 100);
    if (!Number.isFinite(amount) || !Number.isFinite(paid)) throw new Error("Invalid rent amount");
    if (row.status === "waived") continue;
    if (row.due_date.startsWith(month + "-")) { expected += amount; received += paid; }
    const outstanding = Math.max(0, amount - paid);
    if (row.due_date < today && outstanding > 0) { overdue += outstanding; overdueCount++; }
  }
  return { expected: expected / 100, received: received / 100, overdue: overdue / 100, overdueCount };
}

export async function collectPages<T>(fetchPage: (from: number, to: number) => PromiseLike<{data: T[] | null; error: {message: string} | null}>, pageSize = 500): Promise<T[]> {
  const rows: T[] = [];
  for (;;) {
    const result = await fetchPage(rows.length, rows.length + pageSize - 1);
    if (result.error) throw new Error(result.error.message);
    if (!result.data?.length) return rows;
    rows.push(...result.data);
    // Continue even after a short page: a deployment may have a lower server row cap.
  }
}
