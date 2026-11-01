import type { SoldComparable } from "./deal-screening.ts";

/** HMLR Price Paid Data CSV, as documented by HM Land Registry.
 * Fields have NO header: id, price, transfer date, postcode, type, new/old,
 * duration, PAON, SAON, street, locality, town, district, county, category,
 * and monthly-file change flag. Data is public but user-uploaded CSV is
 * untrusted until staff verify provenance. No geospatial distance inferred.
 */
export type PricePaidRow = {
  transactionId: string;
  price: number;
  soldAt: string;
  postcode: string;
  propertyCode: "D" | "S" | "T" | "F" | "O";
  town: string;
  addressKey: string;
  category: string;
};
const isValidDay = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value)) && new Date(value + "T12:00:00Z").toISOString().slice(0,10) === value;
const normalize = (value: string) => value.trim().normalize("NFKC").toUpperCase();
const outcode = (postcode: string) => normalize(postcode).replace(/\s+/g, "").replace(/[0-9][A-Z]{2}$/, "");
const postcodeSector = (postcode: string) => {
  const cleaned = normalize(postcode).replace(/\s+/g, "");
  return cleaned.slice(0, -2);
};

/** Streaming-style CSV tokeniser with quoted commas/newlines, avoiding CSV formula evaluation. */
export function parsePricePaidCsv(text: string, maxRows = 100_000): { rows: PricePaidRow[]; read: number; skipped: number; deletions: number } {
  if (typeof text !== "string" || text.length > 16_000_000) throw new Error("Use a local CSV extract under 16 MB (for example a recent yearly or town-filtered file).");
  if (!Number.isInteger(maxRows) || maxRows < 1 || maxRows > 100_000) throw new Error("Invalid row limit");
  const map = new Map<string, PricePaidRow>();
  let row: string[] = [], value = "", quoted = false, pending = false, recordCount = 0, skipped = 0, deletions = 0;
  const record = () => {
    row.push(value); value = "";
    if (row.length === 1 && !row[0].trim()) { row = []; return; }
    recordCount++;
    if (recordCount > maxRows) throw new Error("Too many HMLR rows for a local preview. Use a smaller geographic or yearly extract.");
    if (row.length < 15 || row.length > 16) { skipped++; row = []; return; }
    const id = row[0].replace(/[{}]/g,"").trim();
    const status = row[15]?.trim().toUpperCase() || "A";
    const price = Number(row[1]);
    const soldAt = row[2].slice(0,10);
    const postcode = normalize(row[3]);
    const propertyCode = normalize(row[4]);
    const category = normalize(row[14]);
    if (status === "D") {
      if (id) { map.delete(id); deletions++; }
      row=[]; return;
    }
    if (!id || id.length > 120 || !Number.isFinite(price) || price < 1000 || price > 100_000_000 ||
        !isValidDay(soldAt) || !/^[A-Z]{1,2}[0-9][0-9A-Z]?\s*[0-9][A-Z]{2}$/.test(postcode) ||
        !["D","S","T","F","O"].includes(propertyCode) || category !== "A" || !["A","C"].includes(status)) {
      skipped++; row=[]; return;
    }
    map.set(id, {
      transactionId:id, price, soldAt, postcode,
      propertyCode: propertyCode as PricePaidRow["propertyCode"], category,
      town: normalize(row[11]),
      addressKey: [postcode,normalize(row[7]),normalize(row[8]),normalize(row[9])].join("|"),
    });
    row=[];
  };
  for (let i=0;i<text.length;i++) {
    const char=text[i];
    if (pending) {
      if (char === '"') { value += '"'; pending = false; continue; }
      quoted = false; pending = false;
    }
    if (char === '"' && quoted) { pending = true; continue; }
    if (char === '"' && value.length === 0) { quoted = true; continue; }
    if (char === '"' && !quoted) throw new Error("Malformed quoted CSV field");
    if (!quoted && (char === "," || char === "\n" || char === "\r")) {
      if (char === ",") { row.push(value); value=""; }
      else {
        record();
        if (char === "\r" && text[i+1] === "\n") i++;
      }
      continue;
    }
    value += char;
  }
  if (pending) { quoted=false; pending=false; }
  if (quoted) throw new Error("Unclosed quoted CSV field");
  if (value || row.length) record();
  return { rows: [...map.values()], read:recordCount, skipped, deletions };
}

/** Maps HMLR recorded property type to broad subject categories only.
 * Official source does not distinguish bungalows, nor record bedrooms/area.
 */
export function suggestPricePaidComparables(
  records: PricePaidRow[], subject: { postcode: string; propertyType: string; assessedAt: string }, limit=12,
): SoldComparable[] {
  if (!subject.postcode || !isValidDay(subject.assessedAt) || !Number.isInteger(limit) || limit < 1 || limit > 30) throw new Error("Invalid comparable search");
  const kind = subject.propertyType.trim().toLowerCase();
  const allowed = kind === "flat" ? ["F"] : kind === "house" ? ["D","S","T"] : [];
  if (!allowed.length) return []; // HMLR PPD has no separate bungalow, commercial or studio type.
  const code = outcode(subject.postcode);
  if (!code) return [];
  const targetDate = Date.parse(subject.assessedAt+"T12:00:00Z");
  const byAddress = new Map<string, PricePaidRow>();
  for (const row of records) {
    if (!row || !allowed.includes(row.propertyCode) || outcode(row.postcode) !== code) continue;
    const saleDate = Date.parse(row.soldAt+"T12:00:00Z");
    if (!Number.isFinite(saleDate) || saleDate > targetDate || targetDate - saleDate > 1096 * 86400000) continue;
    const other = byAddress.get(row.addressKey);
    if (!other || row.soldAt > other.soldAt) byAddress.set(row.addressKey, row);
  }
  const sector = postcodeSector(subject.postcode);
  const rows = [...byAddress.values()].sort((a,b) => {
    const aSector = Number(postcodeSector(a.postcode) === sector), bSector = Number(postcodeSector(b.postcode) === sector);
    return bSector - aSector || b.soldAt.localeCompare(a.soldAt) || a.transactionId.localeCompare(b.transactionId);
  });
  return rows.slice(0,limit).map(row => ({
    price:row.price, soldAt:row.soldAt, postcode:row.postcode,
    propertyType:kind, source:"hm_land_registry", evidenceRef:"HMLR-"+row.transactionId,
  }));
}
