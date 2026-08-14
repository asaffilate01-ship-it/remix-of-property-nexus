import { extractListingPhotoPath } from "@/lib/listing-photos";
import { safeExternalUrl } from "@/lib/url-safety";
import { findLocation } from "@/content/locations";

const LIVE_STATUSES = ["published", "under_offer", "let_agreed"] as const;

const CARD_COLUMNS =
  "id, slug, title, listing_type, purpose, price, price_qualifier, currency, bedrooms, bathrooms, city, postcode, cover_image, is_hmo, created_at, verified, photos_verified, rooms";

async function signPhoto(admin: any, value: string | null | undefined): Promise<string | null> {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return safeExternalUrl(value);
  const path = extractListingPhotoPath(value);
  if (!path) return null;
  try {
    const { data, error } = await admin.storage.from("listing-photos").createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) return value;
    return data.signedUrl;
  } catch {
    return value;
  }
}

function roomRentFloor(rooms: unknown): number | null {
  if (!Array.isArray(rooms)) return null;
  const rents = rooms
    .map((r) => Number((r as { rent_pcm?: unknown })?.rent_pcm))
    .filter((n) => Number.isFinite(n) && n > 0);
  return rents.length ? Math.min(...rents) : null;
}

export type LocationIntent = "sale" | "rent";

export async function loadLocationMarket(slug: string, intent: LocationIntent) {
  const location = findLocation(slug);
  if (!location) return null;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const base = () =>
    supabaseAdmin
      .from("listings")
      .select(CARD_COLUMNS)
      .in("status", [...LIVE_STATUSES])
      .eq("marketplace_publish", true)
      .ilike("city", location.city);

  const countQuery = () =>
    supabaseAdmin
      .from("listings")
      .select("id", { count: "exact", head: true })
      .in("status", [...LIVE_STATUSES])
      .eq("marketplace_publish", true)
      .ilike("city", location.city);

  const [{ data: rows, error }, { count: totalCount, error: totalError }, { count: otherCount, error: otherError }] = await Promise.all([
    base().eq("purpose", intent).order("created_at", { ascending: false }).limit(48),
    countQuery().eq("purpose", intent),
    countQuery().eq("purpose", intent === "sale" ? "rent" : "sale"),
  ]);
  if (error) throw new Error(error.message);
  if (totalError) throw new Error(totalError.message);
  if (otherError) throw new Error(otherError.message);

  const listings = await Promise.all(
    (rows ?? []).map(async (l) => {
      const price = l.price ?? roomRentFloor(l.rooms);
      return {
        ...l,
        rooms: undefined,
        price,
        price_qualifier: l.price ? l.price_qualifier : price ? l.price_qualifier ?? "from" : null,
        cover_image: await signPhoto(supabaseAdmin, l.cover_image),
      };
    }),
  );

  const prices = listings.map((l) => Number(l.price)).filter((n) => Number.isFinite(n) && n > 0);
  const sorted = [...prices].sort((a, b) => a - b);
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;

  const bedBuckets = [1, 2, 3, 4].map((beds) => ({
    beds,
    count: listings.filter((l) => (l.bedrooms ?? 0) === beds).length,
  }));

  return {
    location,
    intent,
    listings,
    stats: {
      total: totalCount ?? 0,
      shown: listings.length,
      median,
      min: sorted.length ? sorted[0] : null,
      max: sorted.length ? sorted[sorted.length - 1] : null,
      hmoCount: listings.filter((l) => l.is_hmo).length,
      otherIntentCount: otherCount ?? 0,
      bedBuckets,
    },
  };
}
