import { supabase } from "@/integrations/supabase/client";

export type Geo = {
  lat: number | null;
  lng: number | null;
  accuracy_m: number | null;
  heading: number | null;
  altitude: number | null;
};

export const EMPTY_GEO: Geo = { lat: null, lng: null, accuracy_m: null, heading: null, altitude: null };

export function getGeo(timeoutMs = 8000): Promise<Geo> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(EMPTY_GEO);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy_m: pos.coords.accuracy ?? null,
        heading: pos.coords.heading ?? null,
        altitude: pos.coords.altitude ?? null,
      }),
      () => resolve(EMPTY_GEO),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 },
    );
  });
}

export async function uploadCapture(args: {
  file: File;
  userId: string;
  folderId?: string | null;
  propertyId?: string | null;
  workOrderId?: string | null;
  agencyId?: string | null;
  caption?: string;
  geo?: Geo;
}) {
  const { file, userId } = args;
  const kind: "photo" | "video" = file.type.startsWith("video") ? "video" : "photo";
  const ext = file.name.split(".").pop() || (kind === "video" ? "webm" : "jpg");
  const path = `${userId}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;

  const up = await supabase.storage.from("survey-media").upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (up.error) throw up.error;

  // probe dimensions/duration in browser (best effort)
  let width: number | null = null, height: number | null = null, duration_ms: number | null = null;
  try {
    if (kind === "photo") {
      const dims = await new Promise<{ w: number; h: number }>((res, rej) => {
        const img = new Image();
        img.onload = () => res({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = rej;
        img.src = URL.createObjectURL(file);
      });
      width = dims.w; height = dims.h;
    } else {
      const meta = await new Promise<{ w: number; h: number; d: number }>((res, rej) => {
        const v = document.createElement("video");
        v.preload = "metadata";
        v.onloadedmetadata = () => res({ w: v.videoWidth, h: v.videoHeight, d: Math.round(v.duration * 1000) });
        v.onerror = rej;
        v.src = URL.createObjectURL(file);
      });
      width = meta.w; height = meta.h; duration_ms = meta.d;
    }
  } catch { /* ignore */ }

  const geo = args.geo ?? EMPTY_GEO;
  const ins = await supabase.from("survey_captures").insert({
    user_id: userId,
    folder_id: args.folderId ?? null,
    property_id: args.propertyId ?? null,
    work_order_id: args.workOrderId ?? null,
    agency_id: args.agencyId ?? null,
    kind,
    storage_path: path,
    mime_type: file.type || null,
    bytes: file.size,
    width, height, duration_ms,
    caption: args.caption || null,
    lat: geo.lat, lng: geo.lng, accuracy_m: geo.accuracy_m,
    heading: geo.heading, altitude: geo.altitude,
  }).select("*").single();
  if (ins.error) throw ins.error;
  return ins.data;
}

export async function signedUrl(path: string, expiresIn = 3600) {
  const { data, error } = await supabase.storage.from("survey-media").createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteCapture(id: string, storagePath: string) {
  await supabase.storage.from("survey-media").remove([storagePath]);
  const { error } = await supabase.from("survey_captures").delete().eq("id", id);
  if (error) throw error;
}
