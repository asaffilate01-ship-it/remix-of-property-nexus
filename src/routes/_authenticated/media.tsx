import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Image as ImageIcon } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/media")({
  head: () => ({ meta: [{ title: "Floorplans & EPC — Estately" }] }),
  component: MediaPage,
});

type Property = { id: string; address: string | null; city: string | null; floorplan_url: string | null; epc_url: string | null; photos: any };

function MediaPage() {
  const [rows, setRows] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("properties").select("id, address, city, floorplan_url, epc_url, photos");
      setRows((data as any) ?? []); setLoading(false);
    })();
  }, []);

  const stats = {
    total: rows.length,
    photos: rows.filter((r) => Array.isArray(r.photos) && r.photos.length > 0).length,
    floorplans: rows.filter((r) => r.floorplan_url).length,
    epcs: rows.filter((r) => r.epc_url).length,
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Floorplans & EPC" description="Photo, floorplan and EPC coverage across your portfolio." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-0 shadow-card"><CardContent className="p-4"><div className="text-xs text-muted-foreground">Properties</div><div className="text-xl font-bold">{stats.total}</div></CardContent></Card>
        <Card className="border-0 shadow-card"><CardContent className="p-4"><div className="text-xs text-muted-foreground">With photos</div><div className="text-xl font-bold">{stats.photos}</div></CardContent></Card>
        <Card className="border-0 shadow-card"><CardContent className="p-4"><div className="text-xs text-muted-foreground">Floorplans</div><div className="text-xl font-bold">{stats.floorplans}</div></CardContent></Card>
        <Card className="border-0 shadow-card"><CardContent className="p-4"><div className="text-xs text-muted-foreground">EPC certs</div><div className="text-xl font-bold">{stats.epcs}</div></CardContent></Card>
      </div>

      {loading ? <Card className="animate-pulse"><CardContent className="h-32" /></Card> :
       rows.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent"><CardContent className="p-12 text-center text-muted-foreground"><ImageIcon className="mx-auto h-10 w-10 mb-3 opacity-40" /><div>No properties yet.</div></CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((p) => {
            const photoCount = Array.isArray(p.photos) ? p.photos.length : 0;
            return (
              <Card key={p.id} className="border-0 shadow-card">
                <CardContent className="p-5 space-y-3">
                  <Link to="/properties" className="font-semibold hover:underline truncate block">{[p.address, p.city].filter(Boolean).join(", ")}</Link>
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    <Badge variant={photoCount > 0 ? "default" : "outline"} className={photoCount === 0 ? "border-amber-300 text-amber-700" : "font-normal"}>{photoCount} photos</Badge>
                    <Badge variant="outline" className={p.floorplan_url ? "border-emerald-300 text-emerald-700" : "border-amber-300 text-amber-700"}>{p.floorplan_url ? "Floorplan ✓" : "No floorplan"}</Badge>
                    <Badge variant="outline" className={p.epc_url ? "border-emerald-300 text-emerald-700" : "border-amber-300 text-amber-700"}>{p.epc_url ? "EPC ✓" : "No EPC"}</Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
