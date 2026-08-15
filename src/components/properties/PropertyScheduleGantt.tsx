import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Sparkles, Users, Wrench, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Lane = "tenancies" | "cleanings" | "compliance" | "work_orders";

type Bar = {
  id: string;
  lane: Lane;
  label: string;
  start: Date;
  end: Date;
  tone: string;
};

const LANE_LABEL: Record<Lane, string> = {
  tenancies: "Tenancies",
  cleanings: "Cleanings",
  compliance: "Compliance",
  work_orders: "Work orders",
};
const LANE_ICON: Record<Lane, React.ComponentType<{ className?: string }>> = {
  tenancies: Users,
  cleanings: Sparkles,
  compliance: ShieldCheck,
  work_orders: Wrench,
};

export function PropertyScheduleGantt({ propertyId }: { propertyId: string }) {
  const [bars, setBars] = useState<Bar[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthOffset, setMonthOffset] = useState(0); // 0 = starting from current month
  const months = 6;
  const [adding, setAdding] = useState<{
    scheduled_at: string;
    duration_minutes: string;
    assignee_name: string;
    notes: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [t, c, comp, wo] = await Promise.all([
      supabase
        .from("tenancies")
        .select("id, tenant_name, start_date, end_date")
        .eq("property_id", propertyId),
      supabase
        .from("cleaning_jobs")
        .select("id, scheduled_at, duration_minutes, assignee_name, status")
        .eq("property_id", propertyId),
      supabase
        .from("compliance_records")
        .select("id, type, issued_on, expires_on, status")
        .eq("property_id", propertyId),
      supabase
        .from("work_orders")
        .select("id, title, status, scheduled_for, completed_at, created_at")
        .eq("property_id", propertyId),
    ]);
    const all: Bar[] = [];
    (t.data ?? []).forEach((x: any) => {
      if (!x.start_date) return;
      all.push({
        id: `t-${x.id}`,
        lane: "tenancies",
        label: x.tenant_name ?? "Tenant",
        start: new Date(x.start_date),
        end: x.end_date ? new Date(x.end_date) : addMonths(new Date(x.start_date), 12),
        tone: "bg-blue-500/80 text-white",
      });
    });
    (c.data ?? []).forEach((x: any) => {
      const s = new Date(x.scheduled_at);
      const e = new Date(s.getTime() + (x.duration_minutes ?? 90) * 60_000);
      all.push({
        id: `c-${x.id}`,
        lane: "cleanings",
        label: x.assignee_name ?? "Cleaning",
        start: s,
        end: e,
        tone: x.status === "done" ? "bg-emerald-500/80 text-white" : "bg-amber-500/80 text-white",
      });
    });
    (comp.data ?? []).forEach((x: any) => {
      if (!x.expires_on) return;
      const e = new Date(x.expires_on);
      const s = x.issued_on ? new Date(x.issued_on) : addMonths(e, -12);
      all.push({
        id: `cm-${x.id}`,
        lane: "compliance",
        label: x.type.replace(/_/g, " "),
        start: s,
        end: e,
        tone:
          x.status === "expired"
            ? "bg-rose-500/80 text-white"
            : x.status === "due_soon"
              ? "bg-amber-500/80 text-white"
              : "bg-emerald-500/80 text-white",
      });
    });
    (wo.data ?? []).forEach((x: any) => {
      const s = x.scheduled_for ? new Date(x.scheduled_for) : new Date(x.created_at);
      const e = x.completed_at ? new Date(x.completed_at) : new Date(s.getTime() + 7 * 86_400_000);
      all.push({
        id: `w-${x.id}`,
        lane: "work_orders",
        label: x.title ?? "Job",
        start: s,
        end: e,
        tone:
          x.status === "completed" ? "bg-emerald-500/80 text-white" : "bg-violet-500/80 text-white",
      });
    });
    setBars(all);
    setLoading(false);
  }, [propertyId]);
  useEffect(() => {
    void load();
  }, [load]);

  const { start, end, totalDays } = useMemo(() => {
    const s = startOfMonth(addMonths(new Date(), monthOffset));
    const e = endOfMonth(addMonths(s, months - 1));
    const days = Math.round((e.getTime() - s.getTime()) / 86_400_000) + 1;
    return { start: s, end: e, totalDays: days };
  }, [monthOffset]);

  const lanes: Lane[] = ["tenancies", "cleanings", "compliance", "work_orders"];

  const addCleaning = async () => {
    if (!adding?.scheduled_at) return toast.error("Pick a date/time");
    const { error } = await supabase.from("cleaning_jobs").insert({
      property_id: propertyId,
      scheduled_at: new Date(adding.scheduled_at).toISOString(),
      duration_minutes: Number(adding.duration_minutes) || 90,
      assignee_name: adding.assignee_name || null,
      notes: adding.notes || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Cleaning scheduled");
    setAdding(null);
    load();
  };

  const delBar = async (bar: Bar) => {
    if (bar.lane !== "cleanings") return toast.info("Edit from its source page");
    const id = bar.id.replace(/^c-/, "");
    const { error } = await supabase.from("cleaning_jobs").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setMonthOffset((o) => o - 1)}>
            ‹ Prev
          </Button>
          <div className="text-sm font-medium tabular-nums">
            {fmtMonth(start)} – {fmtMonth(end)}
          </div>
          <Button size="sm" variant="outline" onClick={() => setMonthOffset((o) => o + 1)}>
            Next ›
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setMonthOffset(0)}>
            Today
          </Button>
        </div>
        <Button
          size="sm"
          onClick={() =>
            setAdding({
              scheduled_at: new Date().toISOString().slice(0, 16),
              duration_minutes: "90",
              assignee_name: "",
              notes: "",
            })
          }
        >
          <Plus className="h-3 w-3 mr-1" /> Add cleaning
        </Button>
      </div>

      <div className="overflow-x-auto border rounded-md">
        <div className="min-w-[800px]">
          {/* Month header */}
          <div
            className="grid sticky top-0 bg-card border-b"
            style={{ gridTemplateColumns: `140px repeat(${months}, 1fr)` }}
          >
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Lane</div>
            {Array.from({ length: months }).map((_, i) => (
              <div key={i} className="px-2 py-1.5 text-xs font-medium border-l text-center">
                {fmtMonth(addMonths(start, i))}
              </div>
            ))}
          </div>

          {/* Lanes */}
          {lanes.map((lane) => {
            const Icon = LANE_ICON[lane];
            const items = bars.filter((b) => b.lane === lane && b.end >= start && b.start <= end);
            return (
              <div
                key={lane}
                className="grid border-b"
                style={{ gridTemplateColumns: `140px 1fr` }}
              >
                <div className="px-2 py-3 text-xs font-medium flex items-center gap-1.5 bg-muted/30">
                  <Icon className="h-3 w-3" /> {LANE_LABEL[lane]}
                </div>
                <div className="relative h-16 bg-grid">
                  {/* Month dividers */}
                  {Array.from({ length: months - 1 }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 border-l border-border/60"
                      style={{ left: `${((i + 1) * 100) / months}%` }}
                    />
                  ))}
                  {items.length === 0 && (
                    <div className="absolute inset-0 grid place-items-center text-xs text-muted-foreground/60">
                      Nothing scheduled
                    </div>
                  )}
                  {items.map((b, idx) => {
                    const s = Math.max(0, daysBetween(start, b.start));
                    const e = Math.min(totalDays, daysBetween(start, b.end));
                    const left = (s / totalDays) * 100;
                    const width = Math.max(0.8, ((e - s) / totalDays) * 100);
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => delBar(b)}
                        className={`absolute h-6 rounded-md px-2 text-[10px] font-medium flex items-center gap-1 truncate shadow-sm hover:opacity-80 ${b.tone}`}
                        style={{
                          left: `${left}%`,
                          width: `${width}%`,
                          top: `${8 + (idx % 2) * 28}px`,
                        }}
                        title={`${b.label} (${b.start.toLocaleDateString()} → ${b.end.toLocaleDateString()})`}
                      >
                        <span className="truncate">{b.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {loading && <div className="text-xs text-muted-foreground">Loading schedule…</div>}

      <Dialog open={!!adding} onOpenChange={(o) => !o && setAdding(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule cleaning</DialogTitle>
          </DialogHeader>
          {adding && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Date & time *</Label>
                <Input
                  type="datetime-local"
                  value={adding.scheduled_at}
                  onChange={(e) => setAdding({ ...adding, scheduled_at: e.target.value })}
                />
              </div>
              <div>
                <Label>Duration (min)</Label>
                <Input
                  type="number"
                  value={adding.duration_minutes}
                  onChange={(e) => setAdding({ ...adding, duration_minutes: e.target.value })}
                />
              </div>
              <div>
                <Label>Assignee</Label>
                <Input
                  value={adding.assignee_name}
                  onChange={(e) => setAdding({ ...adding, assignee_name: e.target.value })}
                  placeholder="Cleaner name"
                />
              </div>
              <div className="col-span-2">
                <Label>Notes</Label>
                <Textarea
                  rows={3}
                  value={adding.notes}
                  onChange={(e) => setAdding({ ...adding, notes: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={addCleaning}>Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function addMonths(d: Date, n: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}
function startOfMonth(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  return x;
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function fmtMonth(d: Date) {
  return d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}
function daysBetween(a: Date, b: Date) {
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000);
}
