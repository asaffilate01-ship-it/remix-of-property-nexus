import { useEffect, useRef, useState, DragEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, X, Star, Image as ImageIcon, ImageOff } from "lucide-react";
import { toast } from "sonner";

export type ListingPhoto = { url: string; path?: string | null; room?: string | null };

// Renders a storage-backed thumbnail by re-signing on demand, so a long-lived
// signed URL from upload time never blocks the preview.
function Thumb({ photo }: { photo: ListingPhoto }) {
  const [src, setSrc] = useState<string | null>(() => (photo.path ? null : photo.url || null));
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    if (photo.path) {
      supabase.storage.from("listing-photos").createSignedUrl(photo.path, 3600)
        .then(({ data, error }) => {
          if (!alive) return;
          if (error || !data?.signedUrl) { setFailed(true); return; }
          setSrc(data.signedUrl);
        })
        .catch(() => { if (alive) setFailed(true); });
    } else {
      setSrc(photo.url || null);
    }
    return () => { alive = false; };
  }, [photo.path, photo.url]);
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

const LONG_TTL = 60 * 60 * 24 * 365; // 1 year (max Supabase signed-URL TTL on most plans)

export function PhotoUploader({ photos, onChange, coverIndex, onCoverChange, roomOptions = [], onUploadingChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  const upload = async (files: FileList | File[]) => {
    setBusy(true);
    onUploadingChange?.(true);
    try {
      const { data: u, error: authErr } = await supabase.auth.getUser();
      if (authErr || !u?.user) throw new Error("Sign in required to upload photos");
      const added: ListingPhoto[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          toast.error(`Skipped ${file.name}: not an image`);
          continue;
        }
        if (file.size > 15 * 1024 * 1024) {
          toast.error(`Skipped ${file.name}: over 15MB`);
          continue;
        }
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${u.user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${safe}`;
        const { error: upErr } = await supabase.storage.from("listing-photos").upload(path, file, { upsert: false, contentType: file.type });
        if (upErr) {
          console.error("[PhotoUploader] upload failed", upErr);
          toast.error(`Upload failed: ${upErr.message}`);
          continue;
        }
        const { data: signed, error: sErr } = await supabase.storage.from("listing-photos").createSignedUrl(path, LONG_TTL);
        if (sErr || !signed?.signedUrl) {
          console.error("[PhotoUploader] signed-url failed", sErr);
          toast.error(`Couldn't preview ${file.name}: ${sErr?.message ?? "no URL"}`);
          continue;
        }
        added.push({ url: signed.signedUrl, room: null });
      }
      if (added.length) {
        onChange([...photos, ...added]);
        toast.success(`${added.length} photo${added.length === 1 ? "" : "s"} added`);
      }
    } catch (e: any) {
      console.error("[PhotoUploader] error", e);
      toast.error(e.message ?? "Upload failed");
    } finally {
      setBusy(false);
      onUploadingChange?.(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault(); setDragging(false);
    if (e.dataTransfer.files?.length) upload(e.dataTransfer.files);
  };

  const remove = (idx: number) => {
    const next = photos.filter((_, i) => i !== idx);
    onChange(next);
    if (coverIndex === idx) onCoverChange(0);
    else if (coverIndex > idx) onCoverChange(coverIndex - 1);
  };

  const setRoom = (idx: number, room: string) => {
    onChange(photos.map((p, i) => i === idx ? { ...p, room: room || null } : p));
  };

  const addUrl = () => {
    const url = prompt("Paste image URL");
    if (url) onChange([...photos, { url, room: null }]);
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
            <Upload className="h-3 w-3 mr-1" /> {busy ? "Uploading…" : "Choose files"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={addUrl}>Add by URL</Button>
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
                <img src={p.url} alt="" className="h-full w-full object-cover" />
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
              {roomOptions.length > 0 ? (
                <select
                  value={p.room ?? ""}
                  onChange={(e) => setRoom(idx, e.target.value)}
                  className="w-full text-xs bg-card border-t px-2 py-1 outline-none"
                >
                  <option value="">No room tag</option>
                  {roomOptions.map((r) => <option key={r} value={r}>{r}</option>)}
                  <option value="Communal">Communal</option>
                  <option value="Exterior">Exterior</option>
                </select>
              ) : (
                <Input
                  value={p.room ?? ""}
                  onChange={(e) => setRoom(idx, e.target.value)}
                  placeholder="Label (e.g. Kitchen)"
                  className="rounded-none border-0 border-t h-7 text-xs"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
