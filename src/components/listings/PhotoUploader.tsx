import { useEffect, useRef, useState, DragEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, X, Star, Image as ImageIcon, ImageOff } from "lucide-react";
import { toast } from "sonner";
import { signMediaUrl } from "@/lib/ops.functions";
import { extractListingPhotoPath, toListingPhotoRef } from "@/lib/listing-photos";

export type ListingPhoto = { url: string; path?: string | null; room?: string | null };

const MAX_PARALLEL_UPLOADS = 3;
const MAX_IMAGE_EDGE = 2200;
const COMPRESS_AFTER_BYTES = 2 * 1024 * 1024;
const SIGN_RETRY_DELAYS_MS = [0, 300, 900, 1800];

async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image load failed"));
    };
    img.src = url;
  });
}

async function optimizeImageFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") return file;
  if (file.size <= COMPRESS_AFTER_BYTES) return file;

  try {
    const image = await loadImage(file);
    const longestEdge = Math.max(image.naturalWidth, image.naturalHeight);
    const scale = longestEdge > MAX_IMAGE_EDGE ? MAX_IMAGE_EDGE / longestEdge : 1;

    if (scale >= 1 && file.type === "image/png") return file;

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
    const quality = outputType === "image/png" ? undefined : 0.82;
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, outputType, quality));

    if (!blob || blob.size >= file.size * 0.95) return file;

    const nextName = file.name.replace(/\.[^.]+$/, outputType === "image/png" ? ".png" : ".jpg");
    return new File([blob], nextName === file.name ? `${file.name}.jpg` : nextName, {
      type: outputType,
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  }
}

async function runWithConcurrency<T>(items: T[], limit: number, worker: (item: T, index: number) => Promise<void>) {
  let nextIndex = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const current = nextIndex;
      nextIndex += 1;
      await worker(items[current], current);
    }
  });
  await Promise.all(runners);
}

async function waitForSignedPreview(path: string, sign: (args: { data: { bucket: "listing-photos"; path: string; expires: number } }) => Promise<{ url: string }>): Promise<string | null> {
  for (const delay of SIGN_RETRY_DELAYS_MS) {
    if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
    try {
      const data = await sign({ data: { bucket: "listing-photos", path, expires: 3600 } });
      if (data?.url) return data.url;
    } catch {
      // retry
    }
  }
  return null;
}

// Renders a storage-backed thumbnail by re-signing on demand, so a long-lived
// signed URL from upload time never blocks the preview.
function Thumb({ photo }: { photo: ListingPhoto }) {
  const sign = useServerFn(signMediaUrl);
  const [src, setSrc] = useState<string | null>(() => (photo.path ? null : photo.url || null));
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    const path = photo.path ?? extractListingPhotoPath(photo.url);
    if (path) {
      const signWithRetry = async () => {
        for (const delay of SIGN_RETRY_DELAYS_MS) {
          if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
          try {
            const data = await sign({ data: { bucket: "listing-photos", path, expires: 3600 } });
            if (!alive) return;
            if (data?.url) {
              setSrc(data.url);
              return;
            }
          } catch {
            // retry
          }
          if (!alive) return;
        }
        if (alive) setFailed(true);
      };
      void signWithRetry();
    } else {
      setSrc(photo.url || null);
    }
    return () => { alive = false; };
  }, [photo.path, photo.url, sign]);
  if (failed || (!src && !photo.path)) {
    return <div className="h-full w-full flex items-center justify-center bg-muted"><ImageOff className="h-6 w-6 opacity-50" /></div>;
  }
  if (!src) return <div className="h-full w-full bg-muted animate-pulse" />;
  return <img src={src} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} loading="lazy" />;
}

type Props = {
  photos: ListingPhoto[];
  onChange: (next: ListingPhoto[]) => void;
  coverIndex: number;
  onCoverChange: (idx: number) => void;
  roomOptions?: string[];
  onUploadingChange?: (uploading: boolean) => void;
};

export function PhotoUploader({ photos, onChange, coverIndex, onCoverChange, roomOptions = [], onUploadingChange }: Props) {
  const sign = useServerFn(signMediaUrl);
  const fileRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef<ListingPhoto[]>(photos);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  const commitPhotos = (updater: (current: ListingPhoto[]) => ListingPhoto[]) => {
    const next = updater(photosRef.current);
    photosRef.current = next;
    onChange(next);
  };

  const upload = async (files: FileList | File[]) => {
    setBusy(true);
    onUploadingChange?.(true);
    try {
      const { data: u, error: authErr } = await supabase.auth.getUser();
      if (authErr || !u?.user) throw new Error("Sign in required to upload photos");

      const validFiles = Array.from(files).filter((file) => {
        if (!file.type.startsWith("image/")) {
          toast.error(`Skipped ${file.name}: not an image`);
          return false;
        }
        if (file.size > 15 * 1024 * 1024) {
          toast.error(`Skipped ${file.name}: over 15MB`);
          return false;
        }
        return true;
      });

      if (!validFiles.length) return;

      const added: Array<ListingPhoto | null> = Array.from({ length: validFiles.length }, () => null);
      setProgress({ done: 0, total: validFiles.length });

      await runWithConcurrency(validFiles, MAX_PARALLEL_UPLOADS, async (file, index) => {
        const prepared = await optimizeImageFile(file);
        const safe = prepared.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${u.user.id}/${Date.now()}-${index}-${crypto.randomUUID()}-${safe}`;
        const { error: upErr } = await supabase.storage
          .from("listing-photos")
          .upload(path, prepared, { upsert: false, contentType: prepared.type || file.type });

        if (upErr) {
          console.error("[PhotoUploader] upload failed", upErr);
          toast.error(`Upload failed: ${upErr.message}`);
        } else {
          const previewUrl = await waitForSignedPreview(path, sign);
          if (!previewUrl) {
            console.error("[PhotoUploader] upload verification failed", { path });
            toast.error(`Upload failed to verify: ${file.name}`);
          } else {
            added[index] = { url: toListingPhotoRef(path), path, room: null };
          }
        }

        setProgress((prev) => (prev ? { ...prev, done: prev.done + 1 } : prev));
      });

      const completed = added.filter((item): item is ListingPhoto => item !== null);
      if (completed.length) {
        commitPhotos((current) => [...current, ...completed]);
        toast.success(`${completed.length} photo${completed.length === 1 ? "" : "s"} added`);
      }
    } catch (e: any) {
      console.error("[PhotoUploader] error", e);
      toast.error(e.message ?? "Upload failed");
    } finally {
      setBusy(false);
      setProgress(null);
      onUploadingChange?.(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault(); setDragging(false);
    if (e.dataTransfer.files?.length) upload(e.dataTransfer.files);
  };

  const remove = (idx: number) => {
    const next = photosRef.current.filter((_, i) => i !== idx);
    photosRef.current = next;
    onChange(next);
    if (coverIndex === idx) onCoverChange(0);
    else if (coverIndex > idx) onCoverChange(coverIndex - 1);
  };

  const setRoom = (idx: number, room: string) => {
    commitPhotos((current) => current.map((p, i) => i === idx ? { ...p, room: room.trim() || null } : p));
  };

  const addUrl = () => {
    const url = prompt("Paste image URL");
    if (url) commitPhotos((current) => [...current, { url, room: null }]);
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${dragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"}`}
      >
        <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <div className="text-sm">Drag & drop images here</div>
        <div className="text-xs text-muted-foreground mt-1">or</div>
        <div className="flex gap-2 justify-center mt-2">
          <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
            <Upload className="h-3 w-3 mr-1" /> {busy ? `Uploading ${progress?.done ?? 0}/${progress?.total ?? 0}…` : "Choose files"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={addUrl} disabled={busy}>Add by URL</Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && upload(e.target.files)}
        />
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((p, idx) => (
            <div key={idx} className="relative group rounded-md overflow-hidden border bg-muted">
              <div className="aspect-[4/3]">
                <Thumb photo={p} />
              </div>
              <button
                type="button"
                title="Set as cover"
                onClick={() => onCoverChange(idx)}
                className={`absolute top-1 left-1 rounded-full p-1 ${coverIndex === idx ? "bg-primary text-primary-foreground" : "bg-card/80 text-muted-foreground hover:bg-card"}`}
              >
                <Star className="h-3 w-3" fill={coverIndex === idx ? "currentColor" : "none"} />
              </button>
              <button
                type="button"
                title="Remove"
                onClick={() => remove(idx)}
                className="absolute top-1 right-1 rounded-full p-1 bg-card/80 text-destructive opacity-0 group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
              <div className="border-t bg-card/95 p-2">
                <Input
                  value={p.room ?? ""}
                  onChange={(e) => setRoom(idx, e.target.value)}
                  placeholder={roomOptions.length > 0 ? "Where in the property is this?" : "Where in the property is this?"}
                  list={roomOptions.length > 0 ? `photo-room-options-${idx}` : undefined}
                  className="h-8 text-xs"
                />
                {roomOptions.length > 0 && (
                  <datalist id={`photo-room-options-${idx}`}>
                    {roomOptions.map((r) => <option key={r} value={r} />)}
                    <option value="Communal" />
                    <option value="Exterior" />
                  </datalist>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
