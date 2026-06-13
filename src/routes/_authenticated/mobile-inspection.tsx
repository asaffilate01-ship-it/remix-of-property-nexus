import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Camera, Check, ChevronRight, ChevronLeft, Mic, MapPin, CloudOff, Save, Home } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/mobile-inspection")({
  head: () => ({ meta: [{ title: "Mobile inspection — Estately" }] }),
  component: MobileInspectionPage,
});

type Room = { name: string; items: { label: string; status?: "Good" | "Fair" | "Poor"; note?: string; photos: number }[] };

const TEMPLATE: Room[] = [
  { name: "Entrance hall", items: [{ label: "Walls & ceiling", photos: 0 }, { label: "Flooring", photos: 0 }, { label: "Smoke alarm", photos: 0 }, { label: "Front door & locks", photos: 0 }] },
  { name: "Lounge", items: [{ label: "Walls & ceiling", photos: 0 }, { label: "Carpet/flooring", photos: 0 }, { label: "Windows", photos: 0 }, { label: "Radiator", photos: 0 }, { label: "Sockets & switches", photos: 0 }] },
  { name: "Kitchen", items: [{ label: "Units & worktops", photos: 0 }, { label: "Hob & oven", photos: 0 }, { label: "Extractor", photos: 0 }, { label: "Boiler", photos: 0 }, { label: "Sink & taps", photos: 0 }] },
  { name: "Bathroom", items: [{ label: "Bath / shower", photos: 0 }, { label: "WC", photos: 0 }, { label: "Sealant", photos: 0 }, { label: "Ventilation", photos: 0 }] },
  { name: "Bedroom 1", items: [{ label: "Walls & ceiling", photos: 0 }, { label: "Carpet", photos: 0 }, { label: "Window", photos: 0 }, { label: "Wardrobe", photos: 0 }] },
];

const TONE = { Good: "bg-emerald-50 text-emerald-700 border-emerald-200", Fair: "bg-amber-50 text-amber-700 border-amber-200", Poor: "bg-red-50 text-red-700 border-red-200" };

function MobileInspectionPage() {
  const [rooms, setRooms] = useState(TEMPLATE);
  const [active, setActive] = useState(0);
  const room = rooms[active];

  const total = rooms.reduce((a, r) => a + r.items.length, 0);
  const done = rooms.reduce((a, r) => a + r.items.filter(i => i.status).length, 0);
  const pct = Math.round((done / total) * 100);

  const set = (i: number, patch: Partial<Room["items"][number]>) => {
    setRooms((rs) => rs.map((r, ri) => ri !== active ? r : { ...r, items: r.items.map((it, ii) => ii === i ? { ...it, ...patch } : it) }));
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-24">
      <div className="sticky top-0 -mx-4 px-4 py-3 bg-background/95 backdrop-blur border-b z-10">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">Inspection · 12 Acacia Avenue</div>
            <div className="font-semibold text-sm truncate flex items-center gap-1"><Home className="h-3.5 w-3.5" /> Quarterly · Sarah Mitchell</div>
          </div>
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 shrink-0"><CloudOff className="h-3 w-3 mr-1" /> Offline</Badge>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} /></div>
        <div className="text-xs text-muted-foreground mt-1 tabular-nums">{done} of {total} items · {pct}%</div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto -mx-4 px-4 pb-1">
        {rooms.map((r, i) => {
          const rDone = r.items.filter(it => it.status).length;
          const complete = rDone === r.items.length;
          return (
            <button key={r.name} onClick={() => setActive(i)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap shrink-0 transition ${active === i ? "bg-primary text-primary-foreground border-primary" : complete ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "hover:bg-muted"}`}>
              {complete && <Check className="h-3 w-3 inline mr-1" />}{r.name}
            </button>
          );
        })}
      </div>

      <Card className="border-0 shadow-card">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-semibold">{room.name}</div>
            <Badge variant="secondary" className="text-xs"><MapPin className="h-3 w-3 mr-1" /> GPS locked</Badge>
          </div>

          {room.items.map((it, i) => (
            <div key={it.label} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium text-sm">{it.label}</div>
                {it.status && <Badge variant="outline" className={TONE[it.status]}>{it.status}</Badge>}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(["Good","Fair","Poor"] as const).map((s) => (
                  <button key={s} onClick={() => set(i, { status: s })}
                    className={`h-9 rounded-md text-xs font-medium border transition ${it.status === s ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>
                    {s}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="outline" className="flex-1 h-9" onClick={() => { set(i, { photos: it.photos + 1 }); toast.success("Photo captured"); }}>
                  <Camera className="h-3.5 w-3.5 mr-1" /> {it.photos > 0 ? `${it.photos} photo${it.photos > 1 ? "s" : ""}` : "Photo"}
                </Button>
                <Button size="sm" variant="outline" className="h-9" onClick={() => toast.success("Recording…")}><Mic className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur px-4 py-3 flex items-center gap-2 z-20">
        <Button variant="outline" size="lg" disabled={active === 0} onClick={() => setActive(a => a - 1)}><ChevronLeft className="h-4 w-4" /></Button>
        <Button variant="outline" size="lg" className="flex-1" onClick={() => toast.success("Saved offline — will sync when online")}><Save className="h-4 w-4 mr-2" /> Save draft</Button>
        {active < rooms.length - 1 ? (
          <Button size="lg" onClick={() => setActive(a => a + 1)}>Next <ChevronRight className="h-4 w-4 ml-1" /></Button>
        ) : (
          <Button size="lg" onClick={() => toast.success("Report submitted to landlord")}>Finish <Check className="h-4 w-4 ml-1" /></Button>
        )}
      </div>
    </div>
  );
}
