import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Camera, Video, MapPin, Clock, ShieldCheck, Smartphone, Hash, Eye, Download, Share2, Filter, Search, AlertTriangle, CheckCircle2, Fingerprint, Wrench, ClipboardList, Building2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/evidence")({ component: EvidencePage });

type Capture = {
  id: string;
  kind: "Photo" | "Video" | "360°";
  context: "Inspection" | "Work order" | "Check-in" | "Check-out" | "Damage" | "Compliance";
  property: string;
  room?: string;
  capturedAt: string;
  capturedBy: string;
  device: string;
  lat: number;
  lng: number;
  accuracy: number; // metres
  duration?: string;
  sizeMB: number;
  hash: string;
  verified: boolean;
  flagged?: string;
  thumb: string; // gradient seed
  workOrderId?: string;
};

const SEED: Capture[] = [
  { id: "EV-1042", kind: "Photo", context: "Damage", property: "Flat 4B Camden Lock", room: "Bathroom ceiling", capturedAt: "2026-06-12 09:14:22 BST", capturedBy: "A. Hughes (Tenant)", device: "iPhone 15 Pro", lat: 51.5414, lng: -0.1460, accuracy: 4, sizeMB: 3.2, hash: "sha256:9f2a…c41b", verified: true, thumb: "from-blue-500/30 to-indigo-700/40", workOrderId: "WO-2031" },
  { id: "EV-1041", kind: "Video", context: "Damage", property: "Flat 4B Camden Lock", room: "Bathroom — leak active", capturedAt: "2026-06-12 09:15:01 BST", capturedBy: "A. Hughes (Tenant)", device: "iPhone 15 Pro", lat: 51.5414, lng: -0.1460, accuracy: 4, duration: "00:38", sizeMB: 41.7, hash: "sha256:1c88…e702", verified: true, thumb: "from-cyan-500/30 to-blue-700/40", workOrderId: "WO-2031" },
  { id: "EV-1040", kind: "Photo", context: "Inspection", property: "12 Acacia Avenue", room: "Kitchen", capturedAt: "2026-06-10 14:02:11 BST", capturedBy: "J. Okafor (Clerk)", device: "Samsung S24", lat: 51.5074, lng: -0.1278, accuracy: 6, sizeMB: 2.8, hash: "sha256:77ee…b9a2", verified: true, thumb: "from-emerald-500/30 to-teal-700/40" },
  { id: "EV-1039", kind: "360°", context: "Check-in", property: "12 Acacia Avenue", room: "Living room", capturedAt: "2026-04-01 11:33:08 BST", capturedBy: "J. Okafor (Clerk)", device: "Insta360 X4", lat: 51.5074, lng: -0.1278, accuracy: 3, sizeMB: 88.4, hash: "sha256:aa12…0f5e", verified: true, thumb: "from-violet-500/30 to-purple-700/40" },
  { id: "EV-1038", kind: "Photo", context: "Work order", property: "22 Mill Street", room: "Boiler cupboard — Gas Safe inspection", capturedAt: "2026-06-08 10:21:44 BST", capturedBy: "M. Webb (Gas Safe 512334)", device: "iPhone 13", lat: 53.4808, lng: -2.2426, accuracy: 5, sizeMB: 2.1, hash: "sha256:bb77…ee31", verified: true, thumb: "from-amber-500/30 to-orange-700/40", workOrderId: "WO-2028" },
  { id: "EV-1037", kind: "Photo", context: "Check-out", property: "9 Elm Court", room: "Carpet — bedroom 2", capturedAt: "2026-05-28 16:44:55 BST", capturedBy: "S. Patel (Agent)", device: "iPad Pro", lat: 52.4862, lng: -1.8904, accuracy: 8, sizeMB: 1.9, hash: "sha256:cd44…aa01", verified: true, flagged: "Possible deposit dispute", thumb: "from-rose-500/30 to-red-700/40" },
  { id: "EV-1036", kind: "Video", context: "Inspection", property: "Flat 4B Camden Lock", room: "Walk-through", capturedAt: "2026-05-15 09:00:12 BST", capturedBy: "J. Okafor (Clerk)", device: "Insta360 X4", lat: 51.5410, lng: -0.1452, accuracy: 5, duration: "04:22", sizeMB: 312.0, hash: "sha256:ef99…1b73", verified: true, thumb: "from-fuchsia-500/30 to-pink-700/40" },
  { id: "EV-1035", kind: "Photo", context: "Compliance", property: "12 Acacia Avenue", room: "Smoke alarm — landing", capturedAt: "2026-04-01 11:40:20 BST", capturedBy: "J. Okafor (Clerk)", device: "Samsung S24", lat: 51.5074, lng: -0.1278, accuracy: 7, sizeMB: 1.6, hash: "sha256:12aa…99cc", verified: true, thumb: "from-lime-500/30 to-green-700/40" },
];

function Stamp({ c }: { c: Capture }) {
  return (
    <div className="absolute inset-x-0 bottom-0 bg-black/70 text-white p-2 text-[10px] leading-tight font-mono">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{c.capturedAt}</span>
        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{c.lat.toFixed(4)}, {c.lng.toFixed(4)} ±{c.accuracy}m</span>
      </div>
      <div className="flex items-center justify-between gap-2 mt-0.5 text-white/70">
        <span className="truncate">{c.property}{c.room ? ` · ${c.room}` : ""}</span>
        <span className="flex items-center gap-1"><Fingerprint className="h-3 w-3" />{c.hash.slice(0, 18)}…</span>
      </div>
    </div>
  );
}

function EvidencePage() {
  const [tab, setTab] = useState<"All" | Capture["context"]>("All");
  const [q, setQ] = useState("");

  const rows = useMemo(() => SEED.filter(c =>
    (tab === "All" || c.context === tab) &&
    (q === "" || (c.property + c.room + c.capturedBy + c.id).toLowerCase().includes(q.toLowerCase()))
  ), [tab, q]);

  const stats = {
    total: SEED.length,
    storage: SEED.reduce((s, c) => s + c.sizeMB, 0).toFixed(1) + " MB",
    verified: SEED.filter(c => c.verified).length,
    flagged: SEED.filter(c => c.flagged).length,
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Evidence capture</h1>
          <p className="text-sm text-muted-foreground">Tamper-evident photos &amp; videos with on-frame time, date and GPS — court-admissible for deposit disputes, insurance claims and maintenance proof.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Smartphone className="h-4 w-4 mr-2" />Open mobile app</Button>
          <Button><Camera className="h-4 w-4 mr-2" />New capture</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total media", value: stats.total, icon: Camera },
          { label: "Storage used", value: stats.storage, icon: Video, sub: "of 100 GB" },
          { label: "Hash-verified", value: stats.verified, icon: ShieldCheck, tone: "success" as const },
          { label: "Flagged for review", value: stats.flagged, icon: AlertTriangle, tone: "warning" as const },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4">
            <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">{s.label}</span><s.icon className="h-4 w-4 text-muted-foreground" /></div>
            <div className={`text-2xl font-bold mt-1 ${s.tone === "success" ? "text-success" : s.tone === "warning" ? "text-warning" : ""}`}>{s.value}</div>
            {s.sub && <div className="text-xs text-muted-foreground">{s.sub}</div>}
          </CardContent></Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by ID, property, room, captured by…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Button variant="outline" size="sm"><Filter className="h-4 w-4 mr-2" />Filters</Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="flex flex-wrap h-auto">
          {(["All", "Inspection", "Work order", "Check-in", "Check-out", "Damage", "Compliance"] as const).map(t => (
            <TabsTrigger key={t} value={t}>{t}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {rows.map(c => (
              <Card key={c.id} className="overflow-hidden">
                <div className={`relative aspect-video bg-gradient-to-br ${c.thumb}`}>
                  <div className="absolute top-2 left-2 flex gap-1">
                    <Badge variant="secondary" className="text-[10px]">{c.kind === "Video" ? <Video className="h-3 w-3 mr-1" /> : <Camera className="h-3 w-3 mr-1" />}{c.kind}</Badge>
                    <Badge variant="outline" className="text-[10px] bg-background/70">{c.context}</Badge>
                  </div>
                  <div className="absolute top-2 right-2 flex gap-1">
                    {c.verified && <Badge className="text-[10px] bg-success text-success-foreground"><CheckCircle2 className="h-3 w-3 mr-1" />Verified</Badge>}
                    {c.flagged && <Badge className="text-[10px] bg-warning text-warning-foreground"><AlertTriangle className="h-3 w-3 mr-1" />Flagged</Badge>}
                  </div>
                  {c.duration && <Badge variant="secondary" className="absolute bottom-16 right-2 text-[10px] bg-black/70 text-white">{c.duration}</Badge>}
                  <Stamp c={c} />
                </div>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate flex items-center gap-1"><Building2 className="h-3 w-3 text-muted-foreground" />{c.property}</div>
                      {c.room && <div className="text-xs text-muted-foreground truncate">{c.room}</div>}
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground shrink-0">{c.id}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="truncate">{c.capturedBy}</span>
                    <span>{c.sizeMB} MB</span>
                  </div>
                  {c.workOrderId && (
                    <Badge variant="outline" className="text-[10px]"><Wrench className="h-3 w-3 mr-1" />{c.workOrderId}</Badge>
                  )}
                  <div className="flex gap-1 pt-1">
                    <Button size="sm" variant="outline" className="flex-1"><Eye className="h-3 w-3 mr-1" />View</Button>
                    <Button size="icon" variant="ghost"><Download className="h-3 w-3" /></Button>
                    <Button size="icon" variant="ghost"><Share2 className="h-3 w-3" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <div className="grid md:grid-cols-2 gap-4">
        <Card><CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2 font-medium"><Hash className="h-4 w-4 text-primary" />Chain of custody</div>
          <p className="text-sm text-muted-foreground">Each upload is SHA-256 hashed on-device, timestamped against an RFC 3161 authority and pinned to the property GPS fence. Any re-encoding, crop or metadata strip breaks the hash and the file is flagged on the dashboard.</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2 font-medium"><ClipboardList className="h-4 w-4 text-primary" />Auto-link</div>
          <p className="text-sm text-muted-foreground">Media captured inside the property's geofence auto-attaches to the open inspection, work order or check-in/out report. Tenants &amp; contractors capture from the mobile app — office staff review here.</p>
        </CardContent></Card>
      </div>
    </div>
  );
}
