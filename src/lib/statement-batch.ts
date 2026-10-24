import { z } from "zod";
import { statementDate, statementKey } from "./statement-import.ts";
export const statementBatch = z.object({ rows: z.array(z.object({
  booking_date: z.string().refine(v => { try { return statementDate(v) === v; } catch { return false; } }, "Use a valid ISO date"),
  amount: z.number().finite().min(-9999999999.99).max(9999999999.99).refine(v => Math.abs(v * 100 - Math.round(v * 100)) < 0.0001, "Use at most two decimal places"),
  counterparty: z.string().trim().max(500).default(""), reference: z.string().trim().max(1000).default(""), purpose: z.string().trim().max(2000).default(""), iban: z.string().trim().max(64).default(""),
})).min(1).max(500) });
export async function statementId(scope: string, row: z.infer<typeof statementBatch>["rows"][number]) {
  const bytes = new TextEncoder().encode("statement-import-v1:" + scope + ":" + statementKey(row));
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  // Stable, scope-specific UUID: concurrent retries hit the same primary key.
  hash[6] = (hash[6] & 15) | 80; hash[8] = (hash[8] & 63) | 128;
  const h = Array.from(hash.slice(0, 16), v => v.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
