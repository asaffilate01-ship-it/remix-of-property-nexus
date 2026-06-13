import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const categorySchema = z.enum(["all", "sale", "rent", "hmo", "commercial"]).optional();
const sortSchema = z.enum(["newest", "price_asc", "price_desc", "beds_desc"]).optional();

export const fetchListings = createServerFn({ method: "GET" })
  .inputValidator(z.object({
    q: z.string().optional(),
    category: categorySchema,
    city: z.string().optional(),
    min_price: z.number().optional(),
    max_price: z.number().optional(),
    beds: z.number().optional(),
    baths: z.number().optional(),
    bills_included: z.boolean().optional(),
    furnished: z.string().optional(),
    available_from: z.string().optional(),
    sort: sortSchema,
    agency_id: z.string().uuid().optional(),
  }).optional())
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin.from("listings")
      .select("id, slug, title, listing_type, purpose, price, price_qualifier, currency, bedrooms, bathrooms, city, postcode, cover_image, is_hmo, status, agency_id, created_at, view_count, properties!inner(property_type)")
      .in("status", ["published", "under_offer", "let_agreed"])
      .eq("marketplace_publish", true)
      .limit(120);

    const cat = data?.category ?? "all";
    if (cat === "sale") query = query.eq("purpose", "sale");
    else if (cat === "rent") query = query.eq("purpose", "rent").eq("is_hmo", false);
    else if (cat === "hmo") query = query.eq("is_hmo", true);
    else if (cat === "commercial") query = query.eq("properties.property_type", "commercial");

    if (data?.city) query = query.ilike("city", `%${data.city}%`);
    if (data?.q) query = query.or(`title.ilike.%${data.q}%,description.ilike.%${data.q}%,postcode.ilike.%${data.q}%`);
    if (data?.min_price) query = query.gte("price", data.min_price);
    if (data?.max_price) query = query.lte("price", data.max_price);
    if (data?.beds) query = query.gte("bedrooms", data.beds);
    if (data?.baths) query = query.gte("bathrooms", data.baths);
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
    return { listings: rows ?? [] };
  });

export const fetchMarketplaceMeta = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ count: total }, { data: cities }, { count: agencyCount }, { data: featured }] = await Promise.all([
    supabaseAdmin.from("listings").select("id", { count: "exact", head: true }).in("status", ["published", "under_offer", "let_agreed"]).eq("marketplace_publish", true),
    supabaseAdmin.from("listings").select("city").not("city", "is", null).limit(500),
    supabaseAdmin.from("agencies").select("id", { count: "exact", head: true }).eq("is_published", true),
    supabaseAdmin.from("agencies").select("id, name, slug, logo_url, city").eq("is_published", true).limit(8),
  ]);
  const cityCount = new Set((cities ?? []).map((c) => (c.city ?? "").trim().toLowerCase()).filter(Boolean)).size;
  return { total: total ?? 0, cityCount, agencyCount: agencyCount ?? 0, featured: featured ?? [] };
});

export const fetchListing = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: z.string() }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.from("listings")
      .select("*, agencies(id, name, slug, logo_url, phone, email, website, city), properties(property_type, listing_purpose)")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return { listing: null, similar: [] };
    await supabaseAdmin.from("listings").update({ view_count: (row.view_count ?? 0) + 1 }).eq("id", row.id);

    let similarQ = supabaseAdmin.from("listings")
      .select("id, slug, title, listing_type, purpose, price, price_qualifier, currency, bedrooms, bathrooms, city, cover_image, is_hmo, created_at")
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
    .select("id, name, slug, logo_url, description, city, cover_image")
    .eq("is_published", true)
    .order("name");
  if (error) throw new Error(error.message);
  return { agencies: data ?? [] };
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
