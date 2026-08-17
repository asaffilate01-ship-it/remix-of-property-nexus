import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/evidence")({
  head: () => ({ meta: [{ title: "Evidence capture — Gabley" }] }),
  component: EvidencePage,
});

type Capture = { id: string; caption: string | null; kind: string | null; storage_path: string | null; thumb_path: string | null; mime_type: string | null; tags: string[] | null; captured_at: string | null; created_at: string; lat: number | null; lng: number | null };

function EvidencePage() {
  const [rows, setRows] = useState<Capture[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("survey_captures").select("*").order("created_at", { ascending: false }).limit(60);
      setRows((data as any) ?? []); setLoading(false);
    })();
  }, []);

  const publicUrl = (path: string | null) => {
    if (!path) return null;
    const { data } = supabase.storage.from("survey-media").getPublicUrl(path);
    return data.publicUrl;
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Evidence capture" description="Photo and video evidence captured via on-site survey." />

      {loading ? <div className="grid sm:grid-cols-3 lg:grid-cols-4 gap-3">{Array.from({ length: 8 }).map((_, i) => <Card key={i} className="animate-pulse"><CardContent className="h-40" /></Card>)}</div> :
       rows.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent"><CardContent className="p-12 text-center text-muted-foreground"><Camera className="mx-auto h-10 w-10 mb-3 opacity-40" /><div>No captures yet. Use the survey tool on site.</div></CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {rows.map((c) => {
            const src = publicUrl(c.thumb_path) ?? publicUrl(c.storage_path);
            const isImage = c.mime_type?.startsWith("image");
            return (
              <Card key={c.id} className="border-0 shadow-card overflow-hidden">
                <div className="aspect-video bg-muted relative">
                  {src && isImage ? (
                    <img src={src} alt={c.caption ?? ""} className="object-cover w-full h-full" loading="lazy" />
                  ) : (
                    <div className="flex items-center justify-center h-full"><Camera className="h-8 w-8 opacity-40" /></div>
                  )}
                </div>
                <CardContent className="p-3 space-y-1">
                  <div className="font-medium text-sm truncate">{c.caption || c.kind || "Capture"}</div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{new Date(c.captured_at ?? c.created_at).toLocaleDateString()}</span>
                    {(c.lat && c.lng) && <span className="text-muted-foreground">{c.lat.toFixed(3)},{c.lng.toFixed(3)}</span>}
                  </div>
                  {c.tags && c.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">{c.tags.slice(0, 3).map((t) => <Badge key={t} variant="secondary" className="text-[10px] font-normal">{t}</Badge>)}</div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
