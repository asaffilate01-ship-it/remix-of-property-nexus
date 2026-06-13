import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UploadCloud, FileImage, FileText, Camera, View, Trash2, Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/media")({
  head: () => ({ meta: [{ title: "Floorplans, EPCs & media — Estately" }] }),
  component: MediaPage,
});

type Kind = "Photo" | "Floorplan" | "EPC" | "Brochure" | "Virtual tour" | "Video" | "Drone";
type Asset = { id: string; property: string; kind: Kind; name: string; size: string; uploaded: string; status: "Live" | "Draft" | "Processing"; epcRating?: "A"|"B"|"C"|"D"|"E"|"F"|"G" };

const SEED: Asset[] = [
  { id: "MED-501", property: "12 Acacia Avenue, M14", kind: "Photo", name: "Hero — front elevation.jpg", size: "4.2 MB", uploaded: "2d ago", status: "Live" },
  { id: "MED-502", property: "12 Acacia Avenue, M14", kind: "Floorplan", name: "Floorplan — Ground & First.pdf", size: "780 KB", uploaded: "2d ago", status: "Live" },
  { id: "MED-503", property: "12 Acacia Avenue, M14", kind: "EPC", name: "EPC certificate.pdf", size: "210 KB", uploaded: "2d ago", status: "Live", epcRating: "C" },
  { id: "MED-504", property: "Flat 4, Quay View, M50", kind: "Virtual tour", name: "Matterport 3D tour", size: "—", uploaded: "5d ago", status: "Live" },
  { id: "MED-505", property: "27 King's Crescent, M20", kind: "Drone", name: "Aerial — South facade.mp4", size: "118 MB", uploaded: "today", status: "Processing" },
  { id: "MED-506", property: "27 King's Crescent, M20", kind: "EPC", name: "EPC certificate.pdf", size: "240 KB", uploaded: "today", status: "Live", epcRating: "D" },
  { id: "MED-507", property: "8 Cromwell Road, M16", kind: "Brochure", name: "Sales brochure v2.pdf", size: "3.1 MB", uploaded: "yesterday", status: "Draft" },
];

const ICON: Record<Kind, typeof FileImage> = { Photo: FileImage, Floorplan: FileText, EPC: FileText, Brochure: FileText, "Virtual tour": View, Video: Camera, Drone: Camera };

const RATING_COLOUR = { A: "bg-emerald-600", B: "bg-emerald-500", C: "bg-lime-500", D: "bg-amber-400", E: "bg-orange-500", F: "bg-red-500", G: "bg-red-700" } as const;

function MediaPage() {
  const [filter, setFilter] = useState<"All" | Kind>("All");
  const [assets, setAssets] = useState(SEED);
  const visible = assets.filter((a) => filter === "All" || a.kind === filter);
  const epc = assets.find((a) => a.kind === "EPC" && a.epcRating);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">Floorplans, EPCs & media</h1>
          <p className="text-muted-foreground mt-1">Drag‑and‑drop uploads. Automatic Rightmove / Zoopla sync. EPC ratings auto‑extracted.</p>
        </div>
        <Button onClick={() => toast.success("Uploader opened")}><UploadCloud className="h-4 w-4 mr-2" /> Upload media</Button>
      </div>

      <Card className="border-0 shadow-card border-2 border-dashed bg-muted/20">
        <CardContent className="p-8 text-center">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3"><UploadCloud className="h-6 w-6" /></div>
          <div className="font-semibold">Drop photos, floorplans, EPC certificates or videos</div>
          <div className="text-sm text-muted-foreground mt-1">Photos auto‑enhanced · Floorplans auto‑rotated · EPC PDFs OCR'd for rating + expiry · Videos transcoded for portals.</div>
          <div className="text-xs text-muted-foreground mt-3">JPG · PNG · HEIC · PDF · MP4 · MOV up to 500 MB</div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-1.5">
        {(["All","Photo","Floorplan","EPC","Brochure","Virtual tour","Video","Drone"] as const).map((k) => (
          <button key={k} onClick={() => setFilter(k as "All" | Kind)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium border transition ${filter === k ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>
            {k}{k !== "All" && <span className="ml-1 opacity-60">({assets.filter(a => a.kind === k).length})</span>}
          </button>
        ))}
      </div>

      {epc && (
        <Card className="border-0 shadow-card">
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-3">EPC band — {epc.property}</div>
            <div className="flex items-end gap-1">
              {(["A","B","C","D","E","F","G"] as const).map((r) => (
                <div key={r} className={`flex-1 ${RATING_COLOUR[r]} text-white font-bold flex items-center justify-center rounded-sm ${r === epc.epcRating ? "h-14 ring-4 ring-foreground/10 scale-105" : "h-8 opacity-70"}`}>{r}</div>
              ))}
            </div>
            <div className="text-xs text-muted-foreground mt-3">Minimum Energy Efficiency Standards (MEES): rental properties must be rated <strong>E</strong> or above. Domestic properties targeted to reach <strong>C</strong> by 2030.</div>
          </CardContent>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.map((a) => {
          const Icon = ICON[a.kind];
          return (
            <Card key={a.id} className="border-0 shadow-card hover:shadow-md transition group">
              <CardContent className="p-0">
                <div className="aspect-video bg-gradient-to-br from-muted to-muted/40 flex items-center justify-center text-muted-foreground">
                  <Icon className="h-10 w-10" />
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{a.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{a.property}</div>
                    </div>
                    <Badge variant="outline" className="shrink-0">{a.kind}</Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{a.size} · {a.uploaded}</span>
                    <Badge variant="outline" className={
                      a.status === "Live" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : a.status === "Processing" ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-muted text-foreground border-muted-foreground/20"
                    }>{a.status}</Badge>
                  </div>
                  <div className="mt-3 flex gap-1">
                    <Button size="sm" variant="ghost" className="flex-1"><Download className="h-3.5 w-3.5 mr-1" /> Save</Button>
                    <Button size="sm" variant="ghost" className="flex-1 text-red-600 hover:text-red-700" onClick={() => { setAssets(a2 => a2.filter(x => x.id !== a.id)); toast.success("Removed"); }}><Trash2 className="h-3.5 w-3.5 mr-1" /> Delete</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
