import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { CaptureButton } from "@/components/survey/CaptureButton";
import { MediaGrid, type Capture } from "@/components/survey/MediaGrid";
import { FolderTree, type Folder } from "@/components/survey/FolderTree";
import { CapturesMap } from "@/components/survey/CapturesMap";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Grid2x2, Map as MapIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/survey")({
  head: () => ({ meta: [{ title: "Survey & site capture — Gabley" }] }),
  component: SurveyPage,
});

function SurveyPage() {
  const { userId, loading } = useUserRole();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setFetching(true);
    const [fRes, cRes] = await Promise.all([
      supabase.from("survey_folders").select("id,name,parent_id").order("name"),
      supabase.from("survey_captures").select("id,kind,storage_path,caption,lat,lng,accuracy_m,captured_at,width,height,duration_ms,folder_id").order("captured_at", { ascending: false }),
    ]);
    if (fRes.error) toast.error(fRes.error.message); else setFolders((fRes.data ?? []) as Folder[]);
    if (cRes.error) toast.error(cRes.error.message); else setCaptures((cRes.data ?? []) as any);
    setFetching(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const createFolder = async (name: string, parent: string | null) => {
    if (!userId) return;
    const { error } = await supabase.from("survey_folders").insert({ user_id: userId, name, parent_id: parent });
    if (error) toast.error(error.message); else { toast.success("Folder created"); load(); }
  };

  const filtered = selected ? captures.filter((c: any) => c.folder_id === selected) : captures;
  const geoPins = filtered.filter((c) => c.lat !== null && c.lng !== null).map((c) => ({
    id: c.id, lat: Number(c.lat), lng: Number(c.lng), kind: c.kind, storage_path: c.storage_path, caption: c.caption, captured_at: c.captured_at,
  }));

  if (loading || !userId) return <div className="p-8"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  const currentFolder = folders.find((f) => f.id === selected);

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">Survey & site capture</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Geo-tagged photos and video, organised by folder. Works on phone with the rear camera.
          </p>
        </div>
        <CaptureButton userId={userId} folderId={selected} onUploaded={load} />
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] gap-6">
        <Card className="p-3 h-fit sticky top-4">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 mb-2">Folders</div>
          <FolderTree folders={folders} selected={selected} onSelect={setSelected} onCreate={createFolder} />
        </Card>

        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-lg">{currentFolder?.name ?? "All captures"}</h2>
              <p className="text-xs text-muted-foreground">
                {filtered.length} item{filtered.length === 1 ? "" : "s"} · {geoPins.length} geo-tagged
              </p>
            </div>
          </div>

          <Tabs defaultValue="grid">
            <TabsList>
              <TabsTrigger value="grid" className="gap-1.5"><Grid2x2 className="h-3.5 w-3.5" /> Grid</TabsTrigger>
              <TabsTrigger value="map" className="gap-1.5"><MapIcon className="h-3.5 w-3.5" /> Map</TabsTrigger>
            </TabsList>
            <TabsContent value="grid" className="mt-4">
              {fetching ? <Loader2 className="h-5 w-5 animate-spin" /> : <MediaGrid captures={filtered} onChanged={load} />}
            </TabsContent>
            <TabsContent value="map" className="mt-4">
              {geoPins.length ? <CapturesMap pins={geoPins} /> : (
                <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground text-sm">
                  No geo-tagged captures yet.
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
