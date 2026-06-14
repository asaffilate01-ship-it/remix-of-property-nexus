import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { saveJobMedia, resolveCurrentAgency } from "@/lib/ops.functions";
import exifr from "exifr";

type Props = {
  workOrderId?: string | null;
  propertyId?: string | null;
  visitId?: string | null;
  stage?: "before" | "progress" | "after" | null;
  label?: string;
  onUploaded?: () => void;
};

// Burns lat/long/timestamp into the image bottom bar (for photos only).
async function watermarkImage(file: File, info: { lat?: number; lng?: number; when: Date; address?: string }): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const maxW = 1920;
      const scale = img.width > maxW ? maxW / img.width : 1;
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const barH = Math.max(80, Math.round(canvas.height * 0.09));
      const grad = ctx.createLinearGradient(0, canvas.height - barH, 0, canvas.height);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(0.4, "rgba(0,0,0,0.55)");
      grad.addColorStop(1, "rgba(0,0,0,0.85)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, canvas.height - barH, canvas.width, barH);

      const pad = Math.round(barH * 0.18);
      const fs = Math.round(barH * 0.28);
      ctx.fillStyle = "#fff";
      ctx.font = `600 ${fs}px system-ui, -apple-system, Segoe UI, sans-serif`;
      ctx.textBaseline = "top";
      const when = info.when.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
      const geo = info.lat != null && info.lng != null
        ? `${info.lat.toFixed(5)}, ${info.lng.toFixed(5)}`
        : "Location unavailable";
      ctx.fillText(`Estately • ${when}`, pad, canvas.height - barH + pad);
      ctx.font = `400 ${Math.round(fs * 0.85)}px system-ui, -apple-system, Segoe UI, sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fillText(geo, pad, canvas.height - barH + pad + fs + 4);

      canvas.toBlob((b) => {
        URL.revokeObjectURL(url);
        b ? resolve(b) : reject(new Error("Canvas export failed"));
      }, "image/jpeg", 0.9);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")); };
    img.src = url;
  });
}

function getBrowserLocation(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve(p),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30_000 },
    );
  });
}

export function GeoMediaUpload({ workOrderId, propertyId, visitId, stage, label, onUploaded }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const save = useServerFn(saveJobMedia);
  const getAgency = useServerFn(resolveCurrentAgency);

  const onPick = () => fileRef.current?.click();

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const { agency_id } = await getAgency();
      if (!agency_id) throw new Error("No agency yet. Create one in Agency settings.");
      const pos = await getBrowserLocation();
      for (const file of Array.from(files)) {
        const isVideo = file.type.startsWith("video/");
        let exif: any = null;
        let hasExifGps = false;
        let captured = new Date();
        let lat = pos?.coords.latitude;
        let lng = pos?.coords.longitude;
        const acc = pos?.coords.accuracy;
        const alt = pos?.coords.altitude ?? undefined;

        if (!isVideo) {
          try {
            exif = await exifr.parse(file, { gps: true, exif: true });
            if (exif?.latitude != null && exif?.longitude != null) {
              lat = exif.latitude; lng = exif.longitude; hasExifGps = true;
            }
            if (exif?.DateTimeOriginal) captured = new Date(exif.DateTimeOriginal);
          } catch { /* ignore */ }
        }

        let blob: Blob = file;
        let mime = file.type;
        let ext = file.name.split(".").pop() || (isVideo ? "mp4" : "jpg");
        let hasOverlay = false;
        if (!isVideo) {
          blob = await watermarkImage(file, { lat, lng, when: captured });
          mime = "image/jpeg"; ext = "jpg"; hasOverlay = true;
        }

        const id = crypto.randomUUID();
        const folder = workOrderId || "general";
        const path = `${agency_id}/${folder}/${id}.${ext}`;
        const up = await supabase.storage.from("job-media").upload(path, blob, { contentType: mime, upsert: false });
        if (up.error) throw new Error(up.error.message);

        await save({ data: {
          work_order_id: workOrderId ?? null,
          property_id: propertyId ?? null,
          kind: isVideo ? "video" : "photo",
          storage_path: path,
          mime_type: mime,
          file_size: blob.size,
          captured_at: captured.toISOString(),
          latitude: lat ?? null,
          longitude: lng ?? null,
          accuracy_m: acc ?? null,
          altitude_m: alt ?? null,
          source: hasExifGps ? "exif" : (pos ? "browser" : "none"),
          has_exif_gps: hasExifGps,
          has_overlay: hasOverlay,
        }});
      }
      toast.success(`${files.length} file${files.length > 1 ? "s" : ""} uploaded`);
      onUploaded?.();
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />
      <Button type="button" onClick={onPick} disabled={busy} variant="default" size="sm">
        {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Camera className="h-4 w-4 mr-2" />}
        Capture photo / video
        <MapPin className="h-3 w-3 ml-2 opacity-60" />
      </Button>
    </>
  );
}
