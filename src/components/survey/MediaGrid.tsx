import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Trash2, Play, Image as ImageIcon, ExternalLink } from "lucide-react";
import { signedUrl, deleteCapture } from "@/lib/survey";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export type Capture = {
  id: string;
  kind: "photo" | "video";
  storage_path: string;
  caption: string | null;
  lat: number | null;
  lng: number | null;
  accuracy_m: number | null;
  captured_at: string;
  width: number | null;
  height: number | null;
  duration_ms: number | null;
};

export function MediaGrid({ captures, onChanged }: { captures: Capture[]; onChanged?: () => void }) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<Capture | null>(null);

  useEffect(() => {
    (async () => {
      const needed = captures.filter((c) => !urls[c.id]);
      if (!needed.length) return;
      const next: Record<string, string> = {};
      await Promise.all(needed.map(async (c) => {
        try { next[c.id] = await signedUrl(c.storage_path); } catch { /* ignore */ }
      }));
      setUrls((u) => ({ ...u, ...next }));
    })();
  }, [captures]);

  if (!captures.length) {
    return (
      <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
        <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
        Nothing here yet. Use Capture to add photos or video.
      </div>
    );
  }

  const remove = async (c: Capture) => {
    if (!confirm("Delete this capture?")) return;
    try { await deleteCapture(c.id, c.storage_path); toast.success("Deleted"); onChanged?.(); }
    catch (e: any) { toast.error(e.message ?? "Delete failed"); }
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {captures.map((c) => {
          const u = urls[c.id];
          return (
            <Card key={c.id} className="group overflow-hidden relative">
              <button onClick={() => setOpen(c)} className="block aspect-square w-full bg-muted relative">
                {u && c.kind === "photo" && <img src={u} alt={c.caption ?? ""} className="h-full w-full object-cover" />}
                {u && c.kind === "video" && (
                  <>
                    <video src={u} className="h-full w-full object-cover" muted preload="metadata" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <Play className="h-8 w-8 text-white drop-shadow" fill="currentColor" />
                    </div>
                  </>
                )}
                {!u && <div className="h-full w-full animate-pulse" />}
                {c.lat !== null && (
                  <Badge variant="secondary" className="absolute top-1.5 left-1.5 gap-1 text-[10px]">
                    <MapPin className="h-3 w-3" /> geo
                  </Badge>
                )}
              </button>
              <div className="p-2 flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground truncate">
                  {new Date(c.captured_at).toLocaleDateString()}
                </span>
                <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => remove(c)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{open?.caption || (open?.kind === "video" ? "Video" : "Photo")}</DialogTitle>
          </DialogHeader>
          {open && urls[open.id] && (
            open.kind === "photo"
              ? <img src={urls[open.id]} alt="" className="w-full rounded-lg" />
              : <video src={urls[open.id]} controls className="w-full rounded-lg" />
          )}
          {open && (
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground pt-2">
              <span>{new Date(open.captured_at).toLocaleString()}</span>
              {open.width && open.height && <span>{open.width}×{open.height}</span>}
              {open.duration_ms != null && <span>{(open.duration_ms / 1000).toFixed(1)}s</span>}
              {open.lat !== null && open.lng !== null && (
                <a href={`https://www.google.com/maps?q=${open.lat},${open.lng}`} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1 hover:underline">
                  <MapPin className="h-3.5 w-3.5" /> {open.lat.toFixed(5)}, {open.lng.toFixed(5)}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
