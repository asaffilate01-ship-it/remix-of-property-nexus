import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Camera, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/evidence")({
  head: () => ({ meta: [{ title: "Evidence capture — Estately" }] }),
  component: EvidencePage,
});

type Capture = { id: string; title: string | null; description: string | null; media_url: string | null; media_type: string | null; captured_at: string | null; created_at: string; tags: string[] | null };

function EvidencePage() {
  const [rows, setRows] = useState<Capture[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("survey_captures").select("*").order("created_at", { ascending: false }).limit(60);
      setRows((data as any) ?? []); setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Evidence capture" description="Photo and video evidence — uploaded via mobile survey." actions={
        <Button asChild variant="outline"><a href="/survey">Open survey</a></Button>
      } />

      {loading ? <div className="grid sm:grid-cols-3 lg:grid-cols-4 gap-3">{Array.from({ length: 8 }).map((_, i) => <Card key={i} className="animate-pulse"><CardContent className="h-40" /></Card>)}</div> :
       rows.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent"><CardContent className="p-12 text-center text-muted-foreground"><Camera className="mx-auto h-10 w-10 mb-3 opacity-40" /><div>No captures yet. Upload via the survey tool.</div></CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {rows.map((c) => (
            <Card key={c.id} className="border-0 shadow-card overflow-hidden">
              <div className="aspect-video bg-muted relative">
                {c.media_url && c.media_type?.startsWith("image") ? (
                  <img src={c.media_url} alt={c.title ?? ""} className="object-cover w-full h-full" loading="lazy" />
                ) : c.media_url ? (
                  <div className="flex items-center justify-center h-full"><Camera className="h-8 w-8 opacity-40" /></div>
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-muted-foreground">No media</div>
                )}
              </div>
              <CardContent className="p-3 space-y-1">
                <div className="font-medium text-sm truncate">{c.title || "Untitled capture"}</div>
                {c.description && <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{new Date(c.captured_at ?? c.created_at).toLocaleDateString()}</span>
                  {c.media_url && <a href={c.media_url} target="_blank" rel="noopener" className="text-primary hover:underline inline-flex items-center gap-1">Open <ExternalLink className="h-3 w-3" /></a>}
                </div>
                {c.tags && c.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">{c.tags.slice(0, 3).map((t) => <Badge key={t} variant="secondary" className="text-[10px] font-normal">{t}</Badge>)}</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
