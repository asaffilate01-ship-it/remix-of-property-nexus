/**
 * Marketing-only sample data for the statement walkthrough.
 *
 * The real statement importer lives in statement-import.ts / StatementImport.tsx.
 * Classifying rows in this module never saves transactions or settles rent.
 */
export type DemoReviewCategory =
  | "unassigned"
  | "rent"
  | "other_income"
  | "maintenance"
  | "utilities"
  | "other_expense";

export type DemoStatementRow = {
  id: string;
  day: string;
  descriptionEn: string;
  descriptionDe: string;
  amountMinor: number;
};

export const DEMO_STATEMENT_ROWS: readonly DemoStatementRow[] = [
  { id: "a1", day: "02", descriptionEn: "Rent · Linden Close", descriptionDe: "Miete · Lindenstraße", amountMinor: 95000 },
  { id: "a2", day: "04", descriptionEn: "Heating parts", descriptionDe: "Heizung Ersatzteile", amountMinor: -3850 },
  { id: "a3", day: "08", descriptionEn: "Building insurance", descriptionDe: "Gebäudeversicherung", amountMinor: -12000 },
  { id: "a4", day: "09", descriptionEn: "Rent · Garden Road (part payment)", descriptionDe: "Miete · Gartenstraße (Teilzahlung)", amountMinor: 40000 },
  { id: "a5", day: "12", descriptionEn: "Water and utilities", descriptionDe: "Wasser und Nebenkosten", amountMinor: -6000 },
];

const incomeCategories: readonly DemoReviewCategory[] = ["unassigned", "rent", "other_income"];
const expenseCategories: readonly DemoReviewCategory[] = ["unassigned", "maintenance", "utilities", "other_expense"];

export function optionsForDemoRow(row: DemoStatementRow): readonly DemoReviewCategory[] {
  if (!Number.isSafeInteger(row.amountMinor) || row.amountMinor === 0) {
    throw new Error("Invalid demo statement amount");
  }
  return row.amountMinor > 0 ? incomeCategories : expenseCategories;
}

export function summarizeDemoReview(
  rows: readonly DemoStatementRow[],
  choices: Readonly<Record<string, DemoReviewCategory | undefined>>,
) {
  const seen = new Set<string>();
  let reviewed = 0;
  for (const row of rows) {
    if (seen.has(row.id)) throw new Error("Duplicate demo statement row");
    seen.add(row.id);
    const category = choices[row.id] ?? "unassigned";
    if (!optionsForDemoRow(row).includes(category)) {
      throw new Error("Statement category does not match transaction direction");
    }
    if (category !== "unassigned") reviewed++;
  }
  return { reviewed, total: rows.length, ready: rows.length > 0 && reviewed === rows.length };
}

export function summarizeDemoStatement(rows: readonly DemoStatementRow[]) {
  let incomeMinor = 0;
  let expensesMinor = 0;
  for (const row of rows) {
    optionsForDemoRow(row);
    if (row.amountMinor > 0) incomeMinor += row.amountMinor;
    else expensesMinor -= row.amountMinor;
  }
  return { incomeMinor, expensesMinor, netMinor: incomeMinor - expensesMinor };
}
