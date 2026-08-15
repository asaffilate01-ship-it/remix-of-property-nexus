import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// Resolve the user's primary agency (owner first, then membership). Used to stamp agency_id.
async function resolveAgencyId(supabase: any, userId: string): Promise<string | null> {
  const owned = await supabase.from("agencies").select("id").eq("owner_id", userId).limit(1).maybeSingle();
  if (owned.data?.id) return owned.data.id;
  const mem = await supabase.from("agency_members").select("agency_id").eq("user_id", userId).limit(1).maybeSingle();
  return mem.data?.agency_id ?? null;
}

export const fetchOpsData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [contacts, workOrders, updates, media, properties, rooms, tenancies, sales, leads, listings, visits, shareTokens] = await Promise.all([
      supabase.from("contacts").select("*").order("is_preferred", { ascending: false }).order("full_name"),
      supabase.from("work_orders").select("*").order("created_at", { ascending: false }),
      supabase.from("work_order_updates").select("*").order("created_at", { ascending: false }),
      supabase.from("job_media").select("*").order("created_at", { ascending: false }),
      supabase.from("properties").select("id, title, address, city, postcode, latitude, longitude"),
      supabase.from("rooms").select("id, name, property_id"),
      supabase.from("tenancies").select("id, tenant_name, property_id, room_id, status"),
      supabase.from("sales_deals").select("*").order("created_at", { ascending: false }),
      supabase.from("leads").select("id, name, email, phone, status"),
      supabase.from("listings").select("id, title, listing_type, status, price"),
      supabase.from("work_order_visits").select("*").order("check_in_at", { ascending: false }).limit(500),
      supabase.from("work_order_share_tokens").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    return {
      contacts: contacts.data ?? [],
      workOrders: workOrders.data ?? [],
      updates: updates.data ?? [],
      media: media.data ?? [],
      properties: properties.data ?? [],
      rooms: rooms.data ?? [],
      tenancies: tenancies.data ?? [],
      sales: sales.data ?? [],
      leads: leads.data ?? [],
      listings: listings.data ?? [],
      visits: visits.data ?? [],
      shareTokens: shareTokens.data ?? [],
    };
  });

const contactSchema = z.object({
  id: z.string().uuid().optional(),
  contact_type: z.string().min(1),
  company_name: z.string().max(200).optional().nullable(),
  full_name: z.string().min(1).max(200),
  email: z.string().email().max(255).optional().nullable().or(z.literal("")),
  phone: z.string().max(40).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  postcode: z.string().max(20).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  rating: z.number().int().min(1).max(5).optional().nullable(),
  hourly_rate: z.number().nonnegative().optional().nullable(),
  insurance_expires_at: z.string().optional().nullable(),
  is_preferred: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

export const saveContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => contactSchema.parse(d))
  .handler(async ({ data, context }) => {
    const agencyId = await resolveAgencyId(context.supabase, context.userId);
    if (!agencyId) throw new Error("No agency. Create one in Agency settings first.");
    const payload = {
      agency_id: agencyId,
      contact_type: data.contact_type as any,
      company_name: data.company_name || null,
      full_name: data.full_name,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
      postcode: data.postcode || null,
      notes: data.notes || null,
      rating: data.rating ?? null,
      hourly_rate: data.hourly_rate ?? null,
      insurance_expires_at: data.insurance_expires_at || null,
      is_preferred: data.is_preferred ?? false,
      is_active: data.is_active ?? true,
    };
    if (data.id) {
      const { error } = await context.supabase.from("contacts").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: ins, error } = await context.supabase.from("contacts").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true, id: ins.id };
  });

export const deleteContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("contacts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const workOrderSchema = z.object({
  id: z.string().uuid().optional(),
  property_id: z.string().uuid().optional().nullable(),
  room_id: z.string().uuid().optional().nullable(),
  tenancy_id: z.string().uuid().optional().nullable(),
  contact_id: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(200),
  description: z.string().max(4000).optional().nullable(),
  status: z.enum(["open", "in_progress", "on_hold", "completed", "cancelled"]).optional(),
  priority: z.enum(["low", "medium", "high", "emergency"]).optional(),
  category: z.string().max(80).optional().nullable(),
  scheduled_for: z.string().optional().nullable(),
  completed_at: z.string().optional().nullable(),
  estimated_cost: z.number().nonnegative().optional().nullable(),
  actual_cost: z.number().nonnegative().optional().nullable(),
});

export const saveWorkOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => workOrderSchema.parse(d))
  .handler(async ({ data, context }) => {
    const agencyId = await resolveAgencyId(context.supabase, context.userId);
    if (!agencyId) throw new Error("No agency. Create one in Agency settings first.");
    const payload = {
      agency_id: agencyId,
      property_id: data.property_id || null,
      room_id: data.room_id || null,
      tenancy_id: data.tenancy_id || null,
      contact_id: data.contact_id || null,
      title: data.title,
      description: data.description || null,
      status: data.status ?? "open",
      priority: data.priority ?? "medium",
      category: data.category || null,
      reported_by: context.userId,
      scheduled_for: data.scheduled_for || null,
      completed_at: data.completed_at || (data.status === "completed" ? new Date().toISOString() : null),
      estimated_cost: data.estimated_cost ?? null,
      actual_cost: data.actual_cost ?? null,
    };
    if (data.id) {
      const { error } = await context.supabase.from("work_orders").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: ins, error } = await context.supabase.from("work_orders").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true, id: ins.id };
  });

export const addWorkOrderUpdate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({
    work_order_id: z.string().uuid(),
    note: z.string().min(1).max(2000),
    status_change: z.enum(["open", "in_progress", "on_hold", "completed", "cancelled"]).optional().nullable(),
  }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("work_order_updates").insert({
      work_order_id: data.work_order_id,
      author_id: context.userId,
      note: data.note,
      status_change: data.status_change ?? null,
    });
    if (error) throw new Error(error.message);
    if (data.status_change) {
      await context.supabase.from("work_orders").update({
        status: data.status_change,
        completed_at: data.status_change === "completed" ? new Date().toISOString() : null,
      }).eq("id", data.work_order_id);
    }
    return { ok: true };
  });

// Records media metadata after client upload to storage.
export const saveJobMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({
    work_order_id: z.string().uuid().optional().nullable(),
    property_id: z.string().uuid().optional().nullable(),
    visit_id: z.string().uuid().optional().nullable(),
    stage: z.enum(["before", "progress", "after"]).optional().nullable(),
    kind: z.enum(["photo", "video"]),
    storage_path: z.string().min(1).max(500),
    mime_type: z.string().max(100).optional().nullable(),
    file_size: z.number().int().nonnegative().optional().nullable(),
    caption: z.string().max(500).optional().nullable(),
    captured_at: z.string().optional().nullable(),
    latitude: z.number().min(-90).max(90).optional().nullable(),
    longitude: z.number().min(-180).max(180).optional().nullable(),
    accuracy_m: z.number().nonnegative().optional().nullable(),
    altitude_m: z.number().optional().nullable(),
    source: z.string().max(20).optional(),
    has_exif_gps: z.boolean().optional(),
    has_overlay: z.boolean().optional(),
    width: z.number().int().positive().optional().nullable(),
    height: z.number().int().positive().optional().nullable(),
    duration_s: z.number().nonnegative().optional().nullable(),
  }))
  .handler(async ({ data, context }) => {
    const agencyId = await resolveAgencyId(context.supabase, context.userId);
    if (!agencyId) throw new Error("No agency.");
    const { error } = await context.supabase.from("job_media").insert({
      agency_id: agencyId,
      uploader_id: context.userId,
      work_order_id: data.work_order_id || null,
      property_id: data.property_id || null,
      visit_id: data.visit_id || null,
      stage: data.stage || null,
      kind: data.kind,
      storage_path: data.storage_path,
      mime_type: data.mime_type || null,
      file_size: data.file_size ?? null,
      caption: data.caption || null,
      captured_at: data.captured_at || null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      accuracy_m: data.accuracy_m ?? null,
      altitude_m: data.altitude_m ?? null,
      source: data.source ?? "browser",
      has_exif_gps: data.has_exif_gps ?? false,
      has_overlay: data.has_overlay ?? false,
      width: data.width ?? null,
      height: data.height ?? null,
      duration_s: data.duration_s ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const signMediaUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({
    path: z.string().min(1).max(500),
    expires: z.number().int().min(60).max(3600).optional(),
  }))
  .handler(async ({ data, context }) => {
    const { data: signed, error } = await context.supabase.storage
      .from("job-media")
      .createSignedUrl(data.path, data.expires ?? 600);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });

export const signListingPhotoUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ path: z.string().min(1).max(500), expires: z.number().int().min(60).max(3600).optional() }))
  .handler(async ({ data, context }) => {
    const { data: signed, error } = await context.supabase.storage
      .from("listing-photos")
      .createSignedUrl(data.path, data.expires ?? 600);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });

export const resolveCurrentAgency = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const id = await resolveAgencyId(context.supabase, context.userId);
    return { agency_id: id };
  });

const salesSchema = z.object({
  id: z.string().uuid().optional(),
  property_id: z.string().uuid().optional().nullable(),
  listing_id: z.string().uuid().optional().nullable(),
  buyer_lead_id: z.string().uuid().optional().nullable(),
  seller_conveyancer_id: z.string().uuid().optional().nullable(),
  buyer_conveyancer_id: z.string().uuid().optional().nullable(),
  offer_amount: z.number().nonnegative().optional().nullable(),
  agreed_price: z.number().nonnegative().optional().nullable(),
  status: z.string().min(1).max(40),
  chain_position: z.string().max(80).optional().nullable(),
  memo_of_sale_at: z.string().optional().nullable(),
  searches_ordered_at: z.string().optional().nullable(),
  enquiries_returned_at: z.string().optional().nullable(),
  mortgage_offer_at: z.string().optional().nullable(),
  exchange_at: z.string().optional().nullable(),
  completion_at: z.string().optional().nullable(),
  fall_through_reason: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const saveSalesDeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => salesSchema.parse(d))
  .handler(async ({ data, context }) => {
    const agencyId = await resolveAgencyId(context.supabase, context.userId);
    if (!agencyId) throw new Error("No agency.");
    const payload = {
      agency_id: agencyId,
      property_id: data.property_id || null,
      listing_id: data.listing_id || null,
      buyer_lead_id: data.buyer_lead_id || null,
      seller_conveyancer_id: data.seller_conveyancer_id || null,
      buyer_conveyancer_id: data.buyer_conveyancer_id || null,
      offer_amount: data.offer_amount ?? null,
      agreed_price: data.agreed_price ?? null,
      status: data.status,
      chain_position: data.chain_position || null,
      memo_of_sale_at: data.memo_of_sale_at || null,
      searches_ordered_at: data.searches_ordered_at || null,
      enquiries_returned_at: data.enquiries_returned_at || null,
      mortgage_offer_at: data.mortgage_offer_at || null,
      exchange_at: data.exchange_at || null,
      completion_at: data.completion_at || null,
      fall_through_reason: data.fall_through_reason || null,
      notes: data.notes || null,
    };
    if (data.id) {
      const { error } = await context.supabase.from("sales_deals").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: ins, error } = await context.supabase.from("sales_deals").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true, id: ins.id };
  });
