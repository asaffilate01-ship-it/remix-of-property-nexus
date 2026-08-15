import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const MAX_DISTANCE_M = 150;
const TOKEN_BYTES = 24;

function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
}

async function resolveAgencyId(supabase: any, userId: string): Promise<string | null> {
  const owned = await supabase.from("agencies").select("id").eq("owner_id", userId).limit(1).maybeSingle();
  if (owned.data?.id) return owned.data.id;
  const mem = await supabase.from("agency_members").select("agency_id").eq("user_id", userId).limit(1).maybeSingle();
  return mem.data?.agency_id ?? null;
}

function genToken() {
  const buf = new Uint8Array(TOKEN_BYTES);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function validateDistance(supabase: any, workOrderId: string, lat?: number | null, lng?: number | null) {
  const { data: wo } = await supabase.from("work_orders").select("property_id").eq("id", workOrderId).single();
  if (!wo?.property_id) return { distance: null as number | null };
  const { data: prop } = await supabase.from("properties").select("latitude,longitude").eq("id", wo.property_id).single();
  if (!prop?.latitude || !prop?.longitude || lat == null || lng == null) return { distance: null };
  const d = haversineMeters(Number(prop.latitude), Number(prop.longitude), lat, lng);
  if (d > MAX_DISTANCE_M) throw new Error(`Too far from property (${Math.round(d)}m). Must be within ${MAX_DISTANCE_M}m to check in.`);
  return { distance: d };
}

// ============ Authenticated (internal staff + contractors with login) ============

export const startVisit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({
    work_order_id: z.string().uuid(),
    latitude: z.number().min(-90).max(90).optional().nullable(),
    longitude: z.number().min(-180).max(180).optional().nullable(),
    accuracy_m: z.number().nonnegative().optional().nullable(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: wo, error: woErr } = await supabase.from("work_orders").select("id, agency_id, property_id, contact_id").eq("id", data.work_order_id).single();
    if (woErr || !wo) throw new Error("Work order not found");
    const dist = await validateDistance(supabase, data.work_order_id, data.latitude, data.longitude);

    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle();
    const { data: ins, error } = await supabase.from("work_order_visits").insert({
      work_order_id: wo.id,
      agency_id: wo.agency_id,
      property_id: wo.property_id,
      worker_user_id: userId,
      worker_contact_id: wo.contact_id,
      worker_name: profile?.full_name || null,
      status: "checked_in",
      check_in_lat: data.latitude ?? null,
      check_in_lng: data.longitude ?? null,
      check_in_accuracy_m: data.accuracy_m ?? null,
      check_in_distance_m: dist.distance,
      source: "internal",
    }).select("id").single();
    if (error) throw new Error(error.message);

    await supabase.from("work_order_updates").insert({
      work_order_id: wo.id, author_id: userId,
      note: `Checked in${dist.distance != null ? ` (${Math.round(dist.distance)}m from property)` : ""}`,
      status_change: "in_progress",
    });
    await supabase.from("work_orders").update({ status: "in_progress" }).eq("id", wo.id).neq("status", "completed");
    return { ok: true, visit_id: ins.id };
  });

export const endVisit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({
    visit_id: z.string().uuid(),
    latitude: z.number().min(-90).max(90).optional().nullable(),
    longitude: z.number().min(-180).max(180).optional().nullable(),
    accuracy_m: z.number().nonnegative().optional().nullable(),
    notes: z.string().max(4000).optional().nullable(),
    signature_data_url: z.string().max(500_000).optional().nullable(),
    mark_completed: z.boolean().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: visit, error: vErr } = await supabase.from("work_order_visits").select("*").eq("id", data.visit_id).single();
    if (vErr || !visit) throw new Error("Visit not found");
    if (visit.status === "completed") throw new Error("Already checked out");

    let signaturePath: string | null = null;
    if (data.signature_data_url?.startsWith("data:image/")) {
      const m = data.signature_data_url.match(/^data:(image\/\w+);base64,(.*)$/);
      if (m) {
        const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
        const path = `${visit.agency_id}/${visit.work_order_id}/visit-${visit.id}-signature.png`;
        const up = await supabase.storage.from("job-media").upload(path, bytes, { contentType: m[1], upsert: true });
        if (up.error) throw new Error(up.error.message);
        signaturePath = path;
      }
    }

    const checkOut = new Date();
    const duration = visit.check_in_at ? Math.round((checkOut.getTime() - new Date(visit.check_in_at).getTime()) / 60000) : null;
    const { error } = await supabase.from("work_order_visits").update({
      status: "completed",
      check_out_at: checkOut.toISOString(),
      check_out_lat: data.latitude ?? null,
      check_out_lng: data.longitude ?? null,
      check_out_accuracy_m: data.accuracy_m ?? null,
      notes: data.notes ?? visit.notes,
      signature_path: signaturePath ?? visit.signature_path,
      duration_minutes: duration,
    }).eq("id", visit.id);
    if (error) throw new Error(error.message);

    await supabase.from("work_order_updates").insert({
      work_order_id: visit.work_order_id, author_id: userId,
      note: `Checked out${duration != null ? ` (on site ${duration} min)` : ""}${data.notes ? `\n${data.notes}` : ""}`,
      status_change: data.mark_completed ? "completed" : null,
    });
    if (data.mark_completed) {
      await supabase.from("work_orders").update({ status: "completed", completed_at: checkOut.toISOString() }).eq("id", visit.work_order_id);
    }
    return { ok: true };
  });

export const createShareToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({
    work_order_id: z.string().uuid(),
    contractor_name: z.string().min(1).max(200),
    contractor_phone: z.string().max(40).optional().nullable(),
    contractor_email: z.string().email().max(255).optional().nullable().or(z.literal("")),
    expires_in_days: z.number().int().min(1).max(60).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const agencyId = await resolveAgencyId(context.supabase, context.userId);
    if (!agencyId) throw new Error("No agency.");
    const token = genToken();
    const days = data.expires_in_days ?? 7;
    const expires = new Date(Date.now() + days * 86400_000).toISOString();
    const { error } = await context.supabase.from("work_order_share_tokens").insert({
      work_order_id: data.work_order_id,
      agency_id: agencyId,
      token,
      contractor_name: data.contractor_name,
      contractor_phone: data.contractor_phone || null,
      contractor_email: data.contractor_email || null,
      expires_at: expires,
      created_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { token, expires_at: expires };
  });

export const listVisits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [visits, tokens] = await Promise.all([
      context.supabase.from("work_order_visits").select("*").order("check_in_at", { ascending: false }).limit(200),
      context.supabase.from("work_order_share_tokens").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    return { visits: visits.data ?? [], tokens: tokens.data ?? [] };
  });

// ============ Public (tokenised, no login) ============

async function loadByToken(token: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: tok } = await supabaseAdmin.from("work_order_share_tokens").select("*").eq("token", token).maybeSingle();
  if (!tok) throw new Error("Invalid link");
  if (tok.revoked_at) throw new Error("Link revoked");
  if (tok.expires_at && new Date(tok.expires_at) < new Date()) throw new Error("Link expired");
  return { tok, supabaseAdmin };
}

export const getVisitContext = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ token: z.string().min(20).max(128) }).parse(d))
  .handler(async ({ data }) => {
    const { tok, supabaseAdmin } = await loadByToken(data.token);
    const { data: wo } = await supabaseAdmin.from("work_orders").select("id, title, description, status, priority, scheduled_for, property_id, agency_id").eq("id", tok.work_order_id).single();
    const { data: prop } = wo?.property_id
      ? await supabaseAdmin.from("properties").select("title, address, city, postcode, latitude, longitude").eq("id", wo.property_id).single()
      : { data: null };
    const { data: agency } = await supabaseAdmin.from("agencies").select("name, logo_url").eq("id", tok.agency_id).single();
    const { data: visits } = await supabaseAdmin.from("work_order_visits").select("id, status, check_in_at, check_out_at, duration_minutes, notes, worker_name").eq("work_order_id", tok.work_order_id).order("check_in_at", { ascending: false });
    return { token: tok.token, contractor_name: tok.contractor_name, expires_at: tok.expires_at, work_order: wo, property: prop, agency, visits: visits ?? [] };
  });

export const tokenStartVisit = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({
    token: z.string().min(20).max(128),
    latitude: z.number().min(-90).max(90).optional().nullable(),
    longitude: z.number().min(-180).max(180).optional().nullable(),
    accuracy_m: z.number().nonnegative().optional().nullable(),
    user_agent: z.string().max(500).optional().nullable(),
  }).parse(d))
  .handler(async ({ data }) => {
    const { tok, supabaseAdmin } = await loadByToken(data.token);
    const dist = await validateDistance(supabaseAdmin, tok.work_order_id, data.latitude, data.longitude);
    const { data: wo } = await supabaseAdmin.from("work_orders").select("property_id").eq("id", tok.work_order_id).single();
    const { data: ins, error } = await supabaseAdmin.from("work_order_visits").insert({
      work_order_id: tok.work_order_id,
      agency_id: tok.agency_id,
      property_id: wo?.property_id ?? null,
      worker_name: tok.contractor_name,
      worker_phone: tok.contractor_phone,
      status: "checked_in",
      check_in_lat: data.latitude ?? null,
      check_in_lng: data.longitude ?? null,
      check_in_accuracy_m: data.accuracy_m ?? null,
      check_in_distance_m: dist.distance,
      source: "tokenised",
      user_agent: data.user_agent ?? null,
    }).select("id").single();
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("work_order_share_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", tok.id);
    await supabaseAdmin.from("work_order_updates").insert({
      work_order_id: tok.work_order_id,
      note: `${tok.contractor_name} checked in (link)${dist.distance != null ? ` — ${Math.round(dist.distance)}m from property` : ""}`,
      status_change: "in_progress",
    });
    await supabaseAdmin.from("work_orders").update({ status: "in_progress" }).eq("id", tok.work_order_id).neq("status", "completed");
    return { ok: true, visit_id: ins.id };
  });

export const tokenEndVisit = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({
    token: z.string().min(20).max(128),
    visit_id: z.string().uuid(),
    latitude: z.number().min(-90).max(90).optional().nullable(),
    longitude: z.number().min(-180).max(180).optional().nullable(),
    accuracy_m: z.number().nonnegative().optional().nullable(),
    notes: z.string().max(4000).optional().nullable(),
    signature_data_url: z.string().max(500_000).optional().nullable(),
  }).parse(d))
  .handler(async ({ data }) => {
    const { tok, supabaseAdmin } = await loadByToken(data.token);
    const { data: visit } = await supabaseAdmin.from("work_order_visits").select("*").eq("id", data.visit_id).single();
    if (!visit || visit.work_order_id !== tok.work_order_id) throw new Error("Visit not found");
    if (visit.status === "completed") throw new Error("Already checked out");

    let signaturePath: string | null = null;
    if (data.signature_data_url?.startsWith("data:image/")) {
      const m = data.signature_data_url.match(/^data:(image\/\w+);base64,(.*)$/);
      if (m) {
        const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
        const path = `${visit.agency_id}/${visit.work_order_id}/visit-${visit.id}-signature.png`;
        const up = await supabaseAdmin.storage.from("job-media").upload(path, bytes, { contentType: m[1], upsert: true });
        if (up.error) throw new Error(up.error.message);
        signaturePath = path;
      }
    }

    const checkOut = new Date();
    const duration = visit.check_in_at ? Math.round((checkOut.getTime() - new Date(visit.check_in_at).getTime()) / 60000) : null;
    await supabaseAdmin.from("work_order_visits").update({
      status: "completed",
      check_out_at: checkOut.toISOString(),
      check_out_lat: data.latitude ?? null,
      check_out_lng: data.longitude ?? null,
      check_out_accuracy_m: data.accuracy_m ?? null,
      notes: data.notes ?? visit.notes,
      signature_path: signaturePath ?? visit.signature_path,
      duration_minutes: duration,
    }).eq("id", visit.id);
    await supabaseAdmin.from("work_order_updates").insert({
      work_order_id: tok.work_order_id,
      note: `${tok.contractor_name} checked out (link)${duration != null ? ` — on site ${duration} min` : ""}${data.notes ? `\n${data.notes}` : ""}`,
    });
    return { ok: true };
  });

export const tokenRequestUploadUrl = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({
    token: z.string().min(20).max(128),
    visit_id: z.string().uuid(),
    ext: z.string().regex(/^[a-z0-9]{1,5}$/i),
  }).parse(d))
  .handler(async ({ data }) => {
    const { tok, supabaseAdmin } = await loadByToken(data.token);
    const id = crypto.randomUUID();
    const path = `${tok.agency_id}/${tok.work_order_id}/${id}.${data.ext.toLowerCase()}`;
    const { data: sig, error } = await supabaseAdmin.storage.from("job-media").createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    return { path, token: sig.token, signed_url: sig.signedUrl };
  });

export const tokenRecordMedia = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({
    token: z.string().min(20).max(128),
    visit_id: z.string().uuid(),
    stage: z.enum(["before", "progress", "after"]),
    kind: z.enum(["photo", "video"]),
    storage_path: z.string().min(1).max(500),
    mime_type: z.string().max(100).optional().nullable(),
    file_size: z.number().int().nonnegative().optional().nullable(),
    captured_at: z.string().optional().nullable(),
    latitude: z.number().min(-90).max(90).optional().nullable(),
    longitude: z.number().min(-180).max(180).optional().nullable(),
    accuracy_m: z.number().nonnegative().optional().nullable(),
    has_exif_gps: z.boolean().optional(),
    has_overlay: z.boolean().optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const { tok, supabaseAdmin } = await loadByToken(data.token);
    const { data: wo } = await supabaseAdmin.from("work_orders").select("property_id").eq("id", tok.work_order_id).single();
    const { error } = await supabaseAdmin.from("job_media").insert({
      agency_id: tok.agency_id,
      work_order_id: tok.work_order_id,
      property_id: wo?.property_id ?? null,
      visit_id: data.visit_id,
      stage: data.stage,
      kind: data.kind,
      storage_path: data.storage_path,
      mime_type: data.mime_type ?? null,
      file_size: data.file_size ?? null,
      captured_at: data.captured_at ?? null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      accuracy_m: data.accuracy_m ?? null,
      source: data.has_exif_gps ? "exif" : "browser",
      has_exif_gps: data.has_exif_gps ?? false,
      has_overlay: data.has_overlay ?? false,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
