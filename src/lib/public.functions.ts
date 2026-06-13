import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const fetchListings = createServerFn({ method: "GET" })
  .inputValidator(z.object({
    q: z.string().optional(),
    type: z.enum(["sale", "rent", "room", "all"]).optional(),
    city: z.string().optional(),
  }).optional())
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin.from("listings")
      .select("id, slug, title, listing_type, price, currency, bedrooms, bathrooms, city, postcode, cover_image, is_hmo, status, agency_id, created_at")
      .in("status", ["published", "under_offer", "let_agreed"])
      .order("created_at", { ascending: false })
      .limit(60);
    if (data?.type && data.type !== "all") query = query.eq("listing_type", data.type);
    if (data?.city) query = query.ilike("city", `%${data.city}%`);
    if (data?.q) query = query.ilike("title", `%${data.q}%`);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return { listings: rows ?? [] };
  });

export const fetchListing = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: z.string() }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.from("listings")
      .select("*, agencies(id, name, slug, logo_url, phone, email)")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return { listing: null };
    // increment view count (best-effort)
    await supabaseAdmin.from("listings").update({ view_count: (row.view_count ?? 0) + 1 }).eq("id", row.id);
    return { listing: row };
  });

export const fetchAgencies = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("agencies")
    .select("id, name, slug, logo_url, description, city")
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
    if (!agency) return { agency: null, listings: [] };
    const { data: listings } = await supabaseAdmin.from("listings")
      .select("id, slug, title, listing_type, price, currency, bedrooms, city, cover_image")
      .eq("agency_id", agency.id)
      .in("status", ["published", "under_offer", "let_agreed"])
      .order("created_at", { ascending: false });
    return { agency, listings: listings ?? [] };
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
