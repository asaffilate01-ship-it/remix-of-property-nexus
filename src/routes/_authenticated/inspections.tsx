import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Camera, CheckCircle2, Clock, AlertTriangle, Calendar } from "lucide-react";
import { IsoIcon } from "@/components/iso/IsoIcon";

export const Route = createFileRoute("/_authenticated/inspections")({ component: InspectionsPage });

type Inspection = {
  id: string;
  property: string;
  type: "check_in" | "mid_term" | "check_out" | "inventory";
  scheduled_for: string;
  inspector: string;
  status: "scheduled" | "in_progress" | "completed" | "overdue";
  rooms_done: number;
  rooms_total: number;
  issues: number;
};

const SEED: Inspection[] = [
  { id: "1", property: "12 Marylebone Mews, W1", type: "mid_term", scheduled_for: "2026-06-18", inspector: "Sarah Wells", status: "scheduled", rooms_done: 0, rooms_total: 6, issues: 0 },
  { id: "2", property: "Flat 4, Beacon Court, BS1", type: "check_in", scheduled_for: "2026-06-14", inspector: "James O'Hara", status: "in_progress", rooms_done: 3, rooms_total: 5, issues: 1 },
  { id: "3", property: "8 Chorlton Road, M16", type: "check_out", scheduled_for: "2026-06-10", inspector: "Priya Shah", status: "completed", rooms_done: 7, rooms_total: 7, issues: 4 },
  { id: "4", property: "22 Northstar Heights, E14", type: "inventory", scheduled_for: "2026-06-05", inspector: "Sarah Wells", status: "overdue", rooms_done: 0, rooms_total: 4, issues: 0 },
];

const STATUS_BADGE: Record<Inspection["status"], string> = {
  scheduled: "bg-muted text-muted-foreground",
  in_progress: "bg-primary/15 text-primary",
  completed: "bg-success text-success-foreground",
  overdue: "bg-destructive text-destructive-foreground",
};

const TYPE_LABEL: Record<Inspection["type"], string> = {
  check_in: "Check-in",
  mid_term: "Mid-term",
  check_out: "Check-out",
  inventory: "Inventory",
};

function InspectionsPage() {
  const [tab, setTab] = useState<"all" | "scheduled" | "in_progress" | "completed">("all");
  const visible = SEED.filter((i) => tab === "all" || i.status === tab);
  const stats = {
    scheduled: SEED.filter((i) => i.status === "scheduled").length,
    in_progress: SEED.filter((i) => i.status === "in_progress").length,
    overdue: SEED.filter((i) => i.status === "overdue").length,
    completed: SEED.filter((i) => i.status === "completed").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <IsoIcon name="shield" size={56} className="shrink-0 hidden sm:block" />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold truncate">Inspections</h1>
            <p className="text-muted-foreground text-sm">Inventories, mid-terms and check-outs with photo evidence.</p>
          </div>
        </div>
        <Button><Plus className="mr-2 h-4 w-4" /> Schedule inspection</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Scheduled" value={stats.scheduled} icon={<Calendar className="h-4 w-4 text-muted-foreground" />} />
        <Stat label="In progress" value={stats.in_progress} icon={<Clock className="h-4 w-4 text-primary" />} />
        <Stat label="Overdue" value={stats.overdue} icon={<AlertTriangle className="h-4 w-4 text-destructive" />} />
        <Stat label="Completed (30d)" value={stats.completed} icon={<CheckCircle2 className="h-4 w-4 text-success" />} />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="in_progress">In progress</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-4">
          <Card className="border-0 shadow-card">
            <CardContent className="p-0 divide-y">
              {visible.map((i) => (
                <div key={i.id} className="p-4 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 sm:gap-4">
                  <IsoIcon name="house" size={40} className="shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium truncate">{i.property}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {TYPE_LABEL[i.type]} · {i.inspector} · {new Date(i.scheduled_for).toLocaleDateString("en-GB")}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-xs">
                      <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${(i.rooms_done / i.rooms_total) * 100}%` }} />
                      </div>
                      <span className="text-muted-foreground">{i.rooms_done}/{i.rooms_total} rooms</span>
                      {i.issues > 0 && <Badge variant="outline" className="text-warning border-warning/40">{i.issues} issues</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={STATUS_BADGE[i.status]}>{i.status.replace("_", " ")}</Badge>
                    <Button size="sm" variant="ghost"><Camera className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="border-0 shadow-card">
        <CardContent className="p-5">
          <div className="font-semibold mb-3">Inspection templates</div>
          <div className="grid sm:grid-cols-4 gap-3">
            {(["Full inventory", "Mid-term visit", "Check-out report", "HMO communal areas"] as const).map((t) => (
              <button key={t} className="text-left rounded-lg border p-3 hover:border-primary/40 hover:bg-primary/5 transition-colors">
                <div className="text-sm font-medium">{t}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Tap to use template</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card className="border-0 shadow-card">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold">{value}</div>
          {icon}
        </div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}
