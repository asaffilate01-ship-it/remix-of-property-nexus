import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const categorySchema = z.enum(["all", "sale", "rent", "hmo", "commercial"]).optional();
const sortSchema = z.enum(["newest", "price_asc", "price_desc", "beds_desc", "distance"]).optional();
const propertyTypeSchema = z.enum(["house", "flat", "bungalow", "studio", "room", "commercial", "land", "any"]).optional();

// Geocode a UK postcode (full or outcode) or town via postcodes.io (no key, free).
async function geocodeUK(q: string): Promise<{ lat: number; lng: number; label: string } | null> {
  const trimmed = q.trim();
  if (!trimmed) return null;
  const looksLikePostcode = /^[A-Z]{1,2}\d[A-Z\d]?( ?\d[A-Z]{2})?$/i.test(trimmed);
  try {
    if (looksLikePostcode) {
      const compact = trimmed.replace(/\s+/g, "").toUpperCase();
      // Full postcode lookup
      let r = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(compact)}`);
      if (r.ok) {
        const j = await r.json();
        if (j?.result) return { lat: j.result.latitude, lng: j.result.longitude, label: j.result.postcode };
      }
      // Outcode fallback (e.g. "N1", "SW1A")
      r = await fetch(`https://api.postcodes.io/outcodes/${encodeURIComponent(compact)}`);
      if (r.ok) {
        const j = await r.json();
        if (j?.result) return { lat: j.result.latitude, lng: j.result.longitude, label: j.result.outcode };
      }
    }
    // Town / city lookup
    const r = await fetch(`https://api.postcodes.io/places?q=${encodeURIComponent(trimmed)}&limit=1`);
    if (r.ok) {
      const j = await r.json();
      if (j?.result?.[0]) return { lat: j.result[0].latitude, lng: j.result[0].longitude, label: j.result[0].name_1 };
    }
  } catch {
    // network errors — fall through to null and let the SQL filter cover it
  }
  return null;
}

function haversineMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export const fetchListings = createServerFn({ method: "GET" })
  .inputValidator(z.object({
    q: z.string().optional(),
    category: categorySchema,
    city: z.string().optional(),
    postcode: z.string().max(20).optional(),
    radius_miles: z.number().min(0).max(100).optional(),
    property_type: propertyTypeSchema,
    features: z.array(z.string()).max(20).optional(),
    epc_min: z.enum(["A", "B", "C", "D", "E"]).optional(),
    tenure: z.enum(["freehold", "leasehold", "share_of_freehold"]).optional(),
    min_price: z.number().optional(),
    max_price: z.number().optional(),
    beds: z.number().optional(),
    baths: z.number().optional(),
    receptions: z.number().optional(),
    min_sqft: z.number().optional(),
    bills_included: z.boolean().optional(),
    furnished: z.string().optional(),
    available_from: z.string().optional(),
    sort: sortSchema,
    agency_id: z.string().uuid().optional(),
  }).optional())
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Resolve search centroid from postcode or town
    let centroid: { lat: number; lng: number; label: string } | null = null;
    const radius = data?.radius_miles ?? 0;
    if (data?.postcode) centroid = await geocodeUK(data.postcode);
    else if (data?.city && radius > 0) centroid = await geocodeUK(data.city);

    let query = supabaseAdmin.from("listings")
      .select("id, slug, title, listing_type, purpose, price, price_qualifier, currency, bedrooms, bathrooms, receptions, city, postcode, latitude, longitude, cover_image, is_hmo, features, epc_rating, tenure, floor_area_sqft, status, agency_id, created_at, view_count, verified, photos_verified, last_verified_at, properties(property_type)")
      .in("status", ["published", "under_offer", "let_agreed"])
      .eq("marketplace_publish", true)
      .limit(centroid && radius ? 500 : 120);

    const cat = data?.category ?? "all";
    if (cat === "sale") query = query.eq("purpose", "sale");
    else if (cat === "rent") query = query.eq("purpose", "rent").eq("is_hmo", false);
    else if (cat === "hmo") query = query.eq("is_hmo", true);
    else if (cat === "commercial") query = query.eq("properties.property_type", "commercial");

    if (data?.property_type && data.property_type !== "any") query = query.eq("properties.property_type", data.property_type);
    if (data?.city && !centroid) query = query.ilike("city", `%${data.city}%`);
    if (data?.postcode && !centroid) query = query.ilike("postcode", `${data.postcode.trim()}%`);
    if (data?.q) query = query.or(`title.ilike.%${data.q}%,description.ilike.%${data.q}%,postcode.ilike.%${data.q}%,address.ilike.%${data.q}%`);
    if (data?.min_price) query = query.gte("price", data.min_price);
    if (data?.max_price) query = query.lte("price", data.max_price);
    if (data?.beds) query = query.gte("bedrooms", data.beds);
    if (data?.baths) query = query.gte("bathrooms", data.baths);
    if (data?.receptions) query = query.gte("receptions", data.receptions);
    if (data?.min_sqft) query = query.gte("floor_area_sqft", data.min_sqft);
    if (data?.tenure) query = query.eq("tenure", data.tenure);
    if (data?.epc_min) {
      const bands = ["A", "B", "C", "D", "E"].slice(0, ["A", "B", "C", "D", "E"].indexOf(data.epc_min) + 1);
      query = query.in("epc_rating", bands);
    }
    if (data?.bills_included) query = query.eq("bills_included", true);
    if (data?.furnished) query = query.eq("furnished", data.furnished);
    if (data?.available_from) query = query.lte("available_from", data.available_from);
    if (data?.agency_id) query = query.eq("agency_id", data.agency_id);

    const sort = data?.sort ?? "newest";
    if (sort === "newest") query = query.order("created_at", { ascending: false });
    else if (sort === "price_asc") query = query.order("price", { ascending: true, nullsFirst: false });
    else if (sort === "price_desc") query = query.order("price", { ascending: false, nullsFirst: false });
    else if (sort === "beds_desc") query = query.order("bedrooms", { ascending: false, nullsFirst: false });

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    let listings = rows ?? [];

    // Feature filter (jsonb contains any-of) — done in JS to avoid OR-array gymnastics
    if (data?.features && data.features.length > 0) {
      const wanted = data.features.map((f) => f.toLowerCase());
      listings = listings.filter((l) => {
        const feats = Array.isArray(l.features) ? (l.features as unknown[]).map((x) => String(x).toLowerCase()) : [];
        return wanted.every((w) => feats.some((f) => f.includes(w)));
      });
    }

    // Distance filter + annotation
    let resolvedCentroid: { lat: number; lng: number; label: string } | null = centroid;
    let withDistance: (typeof listings[number] & { distance_miles: number | null })[] = listings.map((l) => ({ ...l, distance_miles: null }));
    if (centroid && radius > 0) {
      withDistance = listings
        .map((l) => {
          const lat = l.latitude != null ? Number(l.latitude) : null;
          const lng = l.longitude != null ? Number(l.longitude) : null;
          const distance_miles = lat != null && lng != null ? haversineMiles(centroid!, { lat, lng }) : null;
          return { ...l, distance_miles };
        })
        .filter((l) => l.distance_miles != null && (l.distance_miles as number) <= radius);
      if (sort === "distance") {
        withDistance.sort((a, b) => (a.distance_miles ?? 1e9) - (b.distance_miles ?? 1e9));
      }
    }
    const final = withDistance.length > 120 ? withDistance.slice(0, 120) : withDistance;

    return { listings: final, centroid: resolvedCentroid };
  });

export const fetchMarketplaceMeta = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ count: total }, { data: cities }, { count: agencyCount }, { data: featured }] = await Promise.all([
    supabaseAdmin.from("listings").select("id", { count: "exact", head: true }).in("status", ["published", "under_offer", "let_agreed"]).eq("marketplace_publish", true),
    supabaseAdmin.from("listings").select("city, cover_image").not("city", "is", null).in("status", ["published", "under_offer", "let_agreed"]).eq("marketplace_publish", true).limit(1000),
    supabaseAdmin.from("agencies").select("id", { count: "exact", head: true }).eq("is_published", true),
    supabaseAdmin.from("agencies").select("id, name, slug, logo_url, city").eq("is_published", true).limit(8),
  ]);
  const cityRows = cities ?? [];
  const cityCount = new Set(cityRows.map((c) => (c.city ?? "").trim().toLowerCase()).filter(Boolean)).size;
  const counts = new Map<string, { name: string; count: number; cover: string | null }>();
  for (const r of cityRows) {
    const key = (r.city ?? "").trim();
    if (!key) continue;
    const k = key.toLowerCase();
    const entry = counts.get(k) ?? { name: key, count: 0, cover: null };
    entry.count += 1;
    if (!entry.cover && r.cover_image) entry.cover = r.cover_image;
    counts.set(k, entry);
  }
  const topCities = Array.from(counts.values()).sort((a, b) => b.count - a.count).slice(0, 8);
  return { total: total ?? 0, cityCount, agencyCount: agencyCount ?? 0, featured: featured ?? [], topCities };
});

export const fetchListing = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: z.string() }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.from("listings")
      .select("*, agencies(id, name, slug, logo_url, phone, email, website, city, verified, rating, review_count, languages, specialties), properties(property_type, listing_purpose)")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return { listing: null, similar: [] };
    await supabaseAdmin.from("listings").update({ view_count: (row.view_count ?? 0) + 1 }).eq("id", row.id);

    let similarQ = supabaseAdmin.from("listings")
      .select("id, slug, title, listing_type, purpose, price, price_qualifier, currency, bedrooms, bathrooms, city, cover_image, is_hmo, created_at, verified, photos_verified")
      .in("status", ["published", "under_offer", "let_agreed"])
      .eq("marketplace_publish", true)
      .neq("id", row.id)
      .limit(6);
    if (row.city) similarQ = similarQ.eq("city", row.city);
    if (row.purpose) similarQ = similarQ.eq("purpose", row.purpose);
    const { data: similar } = await similarQ;
    return { listing: row, similar: similar ?? [] };
  });

export const fetchAgencies = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("agencies")
    .select("id, name, slug, logo_url, description, city, cover_image, verified, rating, review_count, languages, specialties")
    .eq("is_published", true)
    .order("verified", { ascending: false })
    .order("rating", { ascending: false, nullsFirst: false })
    .order("name");
  if (error) throw new Error(error.message);
  const agencies = data ?? [];
  // Count live listings per agency
  const ids = agencies.map((a) => a.id);
  const counts: Record<string, number> = {};
  if (ids.length) {
    const { data: rows } = await supabaseAdmin.from("listings")
      .select("agency_id")
      .in("agency_id", ids)
      .in("status", ["published", "under_offer", "let_agreed"])
      .eq("marketplace_publish", true);
    for (const r of rows ?? []) {
      if (r.agency_id) counts[r.agency_id] = (counts[r.agency_id] ?? 0) + 1;
    }
  }
  return { agencies: agencies.map((a) => ({ ...a, listing_count: counts[a.id] ?? 0 })) };
});

export const fetchAgency = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: z.string() }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: agency } = await supabaseAdmin.from("agencies")
      .select("*").eq("slug", data.slug).eq("is_published", true).maybeSingle();
    if (!agency) return { agency: null, listings: [], stats: { total: 0, sale: 0, rent: 0, hmo: 0 } };
    const { data: listings } = await supabaseAdmin.from("listings")
      .select("id, slug, title, listing_type, purpose, price, price_qualifier, currency, bedrooms, bathrooms, city, cover_image, is_hmo, created_at")
      .eq("agency_id", agency.id)
      .in("status", ["published", "under_offer", "let_agreed"])
      .order("created_at", { ascending: false });
    const rows = listings ?? [];
    const stats = {
      total: rows.length,
      sale: rows.filter((r) => r.purpose === "sale").length,
      rent: rows.filter((r) => r.purpose === "rent" && !r.is_hmo).length,
      hmo: rows.filter((r) => r.is_hmo).length,
    };
    return { agency, listings: rows, stats };
  });

export const submitLead = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    listing_id: z.string().uuid().optional(),
    agency_id: z.string().uuid().optional(),
    owner_id: z.string().uuid().optional(),
    name: z.string().min(1).max(199),
    email: z.string().email().max(199).optional(),
    phone: z.string().max(49).optional(),
    message: z.string().max(4999).optional(),
  }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("leads").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const submitOffer = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    listing_id: z.string().uuid(),
    owner_id: z.string().uuid(),
    agency_id: z.string().uuid().optional(),
    buyer_name: z.string().min(1).max(199),
    buyer_email: z.string().email().max(199).optional(),
    buyer_phone: z.string().max(49).optional(),
    amount: z.number().positive().max(999_999_999),
    financing: z.string().max(99).optional(),
    position_in_chain: z.number().int().min(0).max(20).optional(),
    notes: z.string().max(4999).optional(),
  }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("offers").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
