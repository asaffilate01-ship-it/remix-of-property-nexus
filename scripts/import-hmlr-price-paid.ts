/**
 * HMLR Price Paid Data importer for a trusted server/runner.
 *
 * Example:
 *   npm run hmlr:import -- --file ./pp-2026.csv --release 2026-10-28 --dry-run
 *   npm run hmlr:import -- --file ./pp-2026.csv --release 2026-10-28 --confirm
 *
 * For a monthly update, use its official PUBLICATION date as --release.
 * For historical data, import earlier baseline files before subsequent
 * monthly updates. This script never scrapes portals or guesses source URLs.
 */
import { createReadStream, statSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { normalizeHmlrRecord, streamHmlrCsvRows, HMLR_ATTRIBUTION, type HmlrChange } from "../src/lib/hmlr-ingestion.ts";

const args = process.argv.slice(2);
function flag(key: string): string | null {
  const at = args.indexOf(key);
  if (at < 0) return null;
  return args[at+1] || null;
}
const file = flag("--file");
const release = flag("--release");
const confirm = args.includes("--confirm");
const dryRun = args.includes("--dry-run");
const maxRows = flag("--max-rows") ? Number(flag("--max-rows")) : 20_000_000;
if (!file || !release || !/^\d{4}-\d{2}-\d{2}$/.test(release) ||
  !Number.isInteger(maxRows) || maxRows < 1 || maxRows > 50_000_000 ||
  new Date(release+"T12:00:00Z").toISOString().slice(0,10) !== release ||
  (!confirm && !dryRun)) {
  throw new Error("Use --file <official-HMLR.csv> --release YYYY-MM-DD and either --dry-run or --confirm.");
}
if (statSync(file).size < 1) throw new Error("Empty Price Paid file");
if (!confirm && !dryRun) throw new Error("Import requires --confirm");

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!dryRun && (!url || !key)) {
  throw new Error("SUPABASE_URL and a server-only SUPABASE_SERVICE_ROLE_KEY are required.");
}
const supabase = !dryRun
  ? createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;
const BATCH = 300;
let read = 0, invalid = 0, applied = 0, ignored = 0, deletions = 0;
const pending: HmlrChange[] = [];

async function flush() {
  if (!pending.length) return;
  const batch = pending.splice(0, pending.length);
  if (dryRun) {
    applied += batch.length;
    return;
  }
  // Server function is service-role restricted and applies correction/deletion
  // changes atomically in HMLR release order.
  const { data, error } = await supabase!.rpc("apply_deal_hmlr_changes" as never, {
    _release_on: release,
    _changes: batch,
  } as never);
  if (error) throw new Error("Price Paid batch rejected: "+error.message);
  const result = Array.isArray(data) ? data[0] as { applied?: number; ignored?: number } : null;
  applied += result?.applied ?? batch.length;
  ignored += result?.ignored ?? 0;
}
const source = createReadStream(file, { highWaterMark: 128 * 1024 });
try {
  for await (const record of streamHmlrCsvRows(source)) {
    if (++read > maxRows) throw new Error("Exceeded configured maximum row count");
    const change = normalizeHmlrRecord(record);
    if (!change) { invalid++; continue; }
    if (change.record_status === "D") deletions++;
    pending.push(change);
    if (pending.length >= BATCH) await flush();
    if (read % 100_000 === 0) {
      console.log(`Processed ${read} rows, invalid ${invalid}, queued ${applied}, deletions ${deletions}`);
    }
  }
  await flush();
  console.log(JSON.stringify({
    success: true, dryRun, release, read, invalid, applied,
    ignoredOlderRelease: ignored, deletions,
    licence: HMLR_ATTRIBUTION,
  }, null, 2));
  if (read === 0 || invalid / read > 0.15) {
    console.error("Source quality review needed: empty or >15% invalid rows.");
    process.exitCode = 1;
  }
} finally {
  source.destroy();
}
