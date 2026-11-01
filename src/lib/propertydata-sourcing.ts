/**
 * PropertyData's /sourced-properties data model. The service provides
 * transformed investment-search results derived in part from major portals.
 *
 * No portal HTML crawling, screenshots or images. On-demand API calls only.
 * Commercial SaaS reuse is subject to PropertyData's published 60-day rule.
 */
export const PROPERTYDATA_LISTS = [
  "unmodernised-properties",
  "reduced-properties",
  "repossessed-properties",
  "auction-properties",
  "slow-to-sell-properties",
  "quick-sale-properties",
  "cheap-per-square-foot",
  "cash-buyers-only-properties",
  "back-on-market",
  "properties-with-no-chain",
  "short-lease-properties",
  "derelict-properties",
] as const;
export type PropertyDataSourcingList = (typeof PROPERTYDATA_LISTS)[number];

export type LicensedSourcingCandidate = {
  provider: "propertydata";
  providerListingId: string;
  title: string;
  askingPrice: number;
  postcode: string;
  broadPropertyType: "house" | "flat" | "other";
  detailedPropertyType: string;
  bedrooms: number | null;
  floorAreaSqft: number | null;
  daysOnMarket: number | null;
  priceReductionPercent: number | null;
  previousAskingPrice: number | null;
  sourcePortal: string | null;
  sourceUrl: string | null;
  sourcingLists: string[];
  sstc: boolean;
  retrievedAt: string;
  expiresAt: string;
};

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}
function finitePositive(value: unknown): number | null {
  const number = typeof value === "number" ? value :
    typeof value === "string" && value.trim() ? Number(value) : NaN;
  return Number.isFinite(number) && number > 0 && number <= 100_000_000 ? number : null;
}
function truncated(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
const validPostcode = (value: string) => /^[A-Z]{1,2}[0-9][0-9A-Z]?\s*[0-9][A-Z]{2}$/.test(value);
export function approvedPropertyDataUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const u = new URL(value);
    if (u.protocol !== "https:" || u.hostname !== "propertydata.co.uk" ||
      u.username || u.password || !u.pathname.startsWith("/outbound/")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function normalisePropertyDataRecord(value: unknown, when: Date): LicensedSourcingCandidate | null {
  const raw = object(value);
  if (!raw || !Number.isFinite(when.getTime())) return null;
  const id = truncated(raw.id, 32);
  const price = finitePositive(raw.price);
  const postcode = truncated(raw.postcode, 12).toUpperCase().replace(/\s+/g, "");
  if (!/^[A-Za-z][A-Za-z0-9-]{3,31}$/.test(id) || price === null || !validPostcode(postcode)) return null;
  const t = truncated(raw.type_standardised || raw.type, 80);
  const lower = t.toLowerCase();
  const broadPropertyType = lower.includes("flat") || lower.includes("apartment")
    ? "flat" as const
    : lower.includes("house") || lower.includes("detached") || lower.includes("terrace")
      ? "house" as const : "other" as const;
  const beds = raw.bedrooms == null ? null : Number(raw.bedrooms);
  const area = raw.sqf == null ? null : Number(raw.sqf);
  const days = raw.days_on_market == null ? null : Number(raw.days_on_market);
  const historical = Array.isArray(raw.price_history) ? raw.price_history
    .map(row => finitePositive(object(row)?.price)).filter((n): n is number => n !== null) : [];
  const previous = historical.length ? Math.max(...historical) : null;
  const reduction = previous && previous > price
    ? Math.round((previous - price) / previous * 10000) / 100 : null;
  const href = approvedPropertyDataUrl(raw.url);
  const portal = href ? new URL(href).pathname.split("/")[2] || null : null;
  const lists = Array.isArray(raw.lists)
    ? raw.lists.map(row => truncated(object(row)?.id, 80)).filter(Boolean).slice(0, 10)
    : [];
  const title = truncated(raw.address, 180) || truncated(raw.precise_address, 180) || "Sourced property";
  return {
    provider: "propertydata",
    providerListingId: id, title, askingPrice: price, postcode,
    broadPropertyType, detailedPropertyType: t || "Not specified",
    bedrooms: beds !== null && Number.isInteger(beds) && beds >= 0 && beds <= 40 ? beds : null,
    floorAreaSqft: area !== null && Number.isFinite(area) && area >= 100 && area <= 100000 ? area : null,
    daysOnMarket: days !== null && Number.isInteger(days) && days >= 0 && days < 5000 ? days : null,
    priceReductionPercent: reduction, previousAskingPrice: reduction ? previous : null,
    sourcePortal: portal, sourceUrl: href, sourcingLists: lists,
    sstc: raw.sstc === 1 || raw.sstc === true || raw.sstc === "1",
    retrievedAt: when.toISOString(),
    expiresAt: new Date(when.getTime() + 60 * 86400000).toISOString(),
  };
}

export function normalisePropertyDataResults(
  payload: unknown, when: Date, max = 10,
): LicensedSourcingCandidate[] {
  const response = object(payload);
  if (response?.status !== "success" || !Array.isArray(response.properties)) {
    throw new Error("PropertyData did not return a valid sourcing response");
  }
  if (!Number.isInteger(max) || max < 1 || max > 50) throw new Error("Invalid provider page size");
  const unique = new Set<string>();
  const result: LicensedSourcingCandidate[] = [];
  for (const raw of response.properties) {
    const item = normalisePropertyDataRecord(raw, when);
    if (!item || item.sstc || unique.has(item.providerListingId)) continue;
    unique.add(item.providerListingId);
    result.push(item);
    if (result.length >= max) break;
  }
  return result.sort((a,b) =>
    (b.priceReductionPercent ?? -1) - (a.priceReductionPercent ?? -1) ||
    a.askingPrice - b.askingPrice ||
    a.providerListingId.localeCompare(b.providerListingId));
}
