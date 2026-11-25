import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Wrench, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { collectPages } from "@/lib/portfolio-summary";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/work-orders")({
  head: () => ({ meta: [{ title: "Work orders — Gabley" }] }),
  component: WorkOrdersPage,
});

type Property = { id: string; address: string | null; city: string | null };
type WorkOrder = {
  id: string; title: string; description: string | null; status: string; priority: string;
  category: string | null; property_id: string | null; scheduled_for: string | null;
  estimated_cost: number | null; actual_cost: number | null; completed_at: string | null;
};

const empty = { title: "", description: "", status: "open", priority: "medium", category: "", property_id: "", scheduled_for: "", estimated_cost: 0 };

function WorkOrdersPage() {
  const [rows, setRows] = useState<WorkOrder[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [updating, setUpdating] = useState(false);
  const writeLock = useRef(false);
  const loadVersion = useRef(0);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const load = async () => {
    const version = ++loadVersion.current;
    setLoading(true);
    setLoadError(false);
    try {
      const [w, p] = await Promise.all([
        collectPages((from, to) => supabase.from("work_orders").select("*").order("created_at", { ascending: false }).order("id").range(from, to)),
        collectPages((from, to) => supabase.from("properties").select("id, address, city").order("id").range(from, to)),
      ]);
      if (version !== loadVersion.current) return;
      setRows(w as WorkOrder[]);
      setProperties(p as Property[]);
    } catch {
      if (version !== loadVersion.current) return;
      setRows([]);
      setProperties([]);
      setLoadError(true);
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  };
  useEffect(() => { void load(); return () => { loadVersion.current++; }; }, []);

  const propById = useMemo(() => new Map(properties.map((p) => [p.id, p])), [properties]);
  const filtered = useMemo(() => statusFilter === "all" ? rows : rows.filter((r) => r.status === statusFilter), [rows, statusFilter]);

  const save = async () => {
    if (writeLock.current || loading || loadError) return;
    if (!form.title.trim() || form.title.trim().length > 200) return toast.error("Enter a title of 1–200 characters.");
    if (!Number.isFinite(form.estimated_cost) || form.estimated_cost < 0 || form.estimated_cost > 100_000_000) return toast.error("Enter a valid non-negative estimated cost.");
    const schedule = form.scheduled_for ? new Date(form.scheduled_for) : null;
    if (schedule && !Number.isFinite(schedule.getTime())) return toast.error("Enter a valid scheduled date.");
    writeLock.current = true;
    setSaving(true);
    try {
      const { data: u, error: authError } = await supabase.auth.getUser();
      if (authError || !u.user) throw new Error("Session unavailable");
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        status: form.status, priority: form.priority,
        category: form.category.trim() || null,
        property_id: form.property_id || null,
        scheduled_for: schedule?.toISOString() ?? null,
        estimated_cost: form.estimated_cost || null,
        reported_by: u.user.id,
      };
      const { error } = await supabase.from("work_orders").insert(payload as any);
      if (error) throw error;
      toast.success("Work order created");
      setOpen(false); setForm(empty);
      await load();
    } catch {
      toast.error("Work order could not be created. Check your access and try again.");
    } finally {
      writeLock.current = false;
      setSaving(false);
    }
  };

  const setStatus = async (id: string, status: string) => {
    if (writeLock.current || loading || loadError) return;
    const current = rows.find(row => row.id === id);
    if (!current || current.status === status || !["open", "in_progress", "completed", "cancelled"].includes(status)) return;
    writeLock.current = true;
    setUpdating(true);
    try {
      const updates: any = { status, completed_at: status === "completed" ? new Date().toISOString() : null };
      const { data, error } = await supabase.from("work_orders").update(updates).eq("id", id).eq("status", current.status).select("id").maybeSingle();
      if (error || !data) throw error ?? new Error("Work order changed or unavailable");
      toast.success("Work order updated");
      await load();
    } catch {
      toast.error("Work order changed or could not be updated. Refreshing the list.");
      await load();
    } finally {
      writeLock.current = false;
      setUpdating(false);
    }
  };

  const statusColor = (s: string) =>
    s === "completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
    s === "in_progress" ? "bg-blue-50 text-blue-700 border-blue-200" :
    s === "cancelled" ? "bg-gray-50 text-gray-600 border-gray-200" :
    "bg-amber-50 text-amber-700 border-amber-200";

  const priColor = (p: string) =>
    p === "emergency" ? "bg-red-50 text-red-700 border-red-200" :
    p === "high" ? "bg-orange-50 text-orange-700 border-orange-200" :
    "bg-gray-50 text-gray-600 border-gray-200";

  return (
    <div className="space-y-6">
      <PageHeader title="Work orders" description="Repair and maintenance jobs across your portfolio." actions={
        <Button disabled={loading || loadError || saving || updating} className="min-h-11" onClick={() => { setForm(empty); setOpen(true); }}><Plus className="mr-2 h-4 w-4" /> New work order</Button>
      } />

      <div className="flex flex-wrap gap-2">
        {["all","open","in_progress","completed","cancelled"].map((s) => (
          <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm" className="min-h-11" disabled={loading || loadError} aria-pressed={statusFilter === s} onClick={() => setStatusFilter(s)}>
            {s.replace("_"," ")} {s !== "all" && !loading && !loadError && <span className="ml-1 opacity-60">({rows.filter(r => r.status === s).length})</span>}
          </Button>
        ))}
      </div>

      {loading ? (
        <div role="status" aria-label="Loading work orders" className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <Card key={i} className="motion-safe:animate-pulse"><CardContent className="p-5 h-32" /></Card>)}</div>
      ) : loadError ? (
        <Card role="alert"><CardContent className="p-6 space-y-3"><h2 className="font-semibold">Unable to verify work orders</h2><p className="text-sm text-muted-foreground">The list is unavailable rather than empty. Please retry.</p><Button onClick={() => void load()}>Try again</Button></CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent"><CardContent className="p-12 text-center text-muted-foreground"><Wrench className="mx-auto h-10 w-10 mb-3 opacity-40" /><div>{rows.length === 0 ? "No work orders yet." : "No matching work orders."}</div></CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((w) => {
            const prop = w.property_id ? propById.get(w.property_id) : null;
            return (
              <Card key={w.id} className="border-0 shadow-card">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link to="/work-orders/$id" params={{ id: w.id }} className="font-semibold hover:underline truncate flex items-center gap-1">{w.title} <ExternalLink className="h-3 w-3 opacity-60" /></Link>
                      {prop && <div className="text-xs text-muted-foreground truncate">{[prop.address, prop.city].filter(Boolean).join(", ")}</div>}
                    </div>
                    <Badge className={`${priColor(w.priority)} border`} variant="outline">{w.priority}</Badge>
                  </div>
                  {w.description && <p className="text-xs text-muted-foreground line-clamp-2">{w.description}</p>}
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    {w.category && <Badge variant="secondary" className="font-normal">{w.category}</Badge>}
                    {w.estimated_cost ? <Badge variant="secondary" className="font-normal">~£{Number(w.estimated_cost).toLocaleString()}</Badge> : null}
                    {w.scheduled_for && <Badge variant="secondary" className="font-normal">{new Date(w.scheduled_for).toLocaleDateString()}</Badge>}
                  </div>
                  <div className="pt-1 border-t">
                    <Select disabled={updating || saving} value={w.status} onValueChange={(val) => setStatus(w.id, val)}>
                      <SelectTrigger aria-label={`Status of ${w.title}`} className={`min-h-11 text-xs ${statusColor(w.status)}`}><SelectValue /></SelectTrigger>
                      <SelectContent>{["open","in_progress","completed","cancelled"].map((s) => <SelectItem key={s} value={s}>{s.replace("_"," ")}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>New work order</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2"><Label>Title *</Label><Input maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Category</Label><Input placeholder="plumbing, electrical…" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
            <div><Label>Priority</Label>
              <Select value={form.priority} onValueChange={(val) => setForm({ ...form, priority: val })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["low","medium","high","emergency"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2"><Label>Property</Label>
              <Select value={form.property_id} onValueChange={(val) => setForm({ ...form, property_id: val })}>
                <SelectTrigger><SelectValue placeholder="(none)" /></SelectTrigger>
                <SelectContent>{properties.map((p) => <SelectItem key={p.id} value={p.id}>{[p.address, p.city].filter(Boolean).join(", ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Scheduled for</Label><Input type="datetime-local" value={form.scheduled_for} onChange={(e) => setForm({ ...form, scheduled_for: e.target.value })} /></div>
            <div><Label>Est. cost (£)</Label><Input type="number" min={0} step="0.01" value={form.estimated_cost} onChange={(e) => setForm({ ...form, estimated_cost: Number(e.target.value) })} /></div>
            <div className="sm:col-span-2"><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={save} disabled={saving || updating || loading || loadError} className="min-h-11">{saving ? "Saving…" : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
