import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, MapPin, Clock, AlertTriangle, Wrench, Camera, Link2, Copy } from "lucide-react";
import { toast } from "sonner";
import { fetchOpsData, saveWorkOrder, addWorkOrderUpdate } from "@/lib/ops.functions";
import { createShareToken } from "@/lib/visits.functions";
import { GeoMediaUpload } from "@/components/GeoMediaUpload";
import { SignedMedia } from "@/components/SignedMedia";
import { VisitPanel } from "@/components/VisitPanel";

export const Route = createFileRoute("/_authenticated/work-orders")({ component: WorkOrdersPage });

const STATUSES = ["open", "in_progress", "on_hold", "completed", "cancelled"] as const;
const STATUS_LABEL: Record<string, string> = {
  open: "Open", in_progress: "In progress", on_hold: "On hold", completed: "Completed", cancelled: "Cancelled",
};
const PRIORITIES = ["low", "medium", "high", "emergency"] as const;
const PRIORITY_TONE: Record<string, string> = {
  low: "bg-muted text-muted-foreground", medium: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  high: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  emergency: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

const emptyWo = {
  id: undefined as string | undefined,
  property_id: "", contact_id: "", tenancy_id: "",
  title: "", description: "", category: "",
  status: "open" as typeof STATUSES[number],
  priority: "medium" as typeof PRIORITIES[number],
  scheduled_for: "", estimated_cost: "",
};

function WorkOrdersPage() {
  const qc = useQueryClient();
  const load = useServerFn(fetchOpsData);
  const save = useServerFn(saveWorkOrder);
  const update = useServerFn(addWorkOrderUpdate);
  const { data, isLoading } = useQuery({ queryKey: ["ops"], queryFn: () => load() });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyWo);
  const [active, setActive] = useState<any | null>(null);
  const [note, setNote] = useState("");
  const [noteStatus, setNoteStatus] = useState<string>("");
  const [tab, setTab] = useState("active");

  const workOrders = (data?.workOrders ?? []) as any[];
  const contacts = (data?.contacts ?? []) as any[];
  const properties = (data?.properties ?? []) as any[];
  const tenancies = (data?.tenancies ?? []) as any[];
  const updates = (data?.updates ?? []) as any[];
  const media = (data?.media ?? []) as any[];
  const visits = (data?.visits ?? []) as any[];
  const shareTokens = (data?.shareTokens ?? []) as any[];

  const propMap = useMemo(() => Object.fromEntries(properties.map((p) => [p.id, p])), [properties]);
  const contactMap = useMemo(() => Object.fromEntries(contacts.map((c) => [c.id, c])), [contacts]);
  const shareFn = useServerFn(createShareToken);
  const [shareName, setShareName] = useState("");
  const [sharePhone, setSharePhone] = useState("");
  const [shareOpen, setShareOpen] = useState(false);

  const filtered = useMemo(() => {
    if (tab === "active") return workOrders.filter((w) => w.status !== "completed" && w.status !== "cancelled");
    if (tab === "done") return workOrders.filter((w) => w.status === "completed");
    return workOrders;
  }, [workOrders, tab]);

  const submit = async () => {
    if (!form.title.trim()) return toast.error("Title required");
    try {
      await save({ data: {
        id: form.id,
        property_id: form.property_id || null,
        contact_id: form.contact_id || null,
        tenancy_id: form.tenancy_id || null,
        title: form.title,
        description: form.description || null,
        category: form.category || null,
        status: form.status,
        priority: form.priority,
        scheduled_for: form.scheduled_for || null,
        estimated_cost: form.estimated_cost ? Number(form.estimated_cost) : null,
      }});
      toast.success("Saved");
      setOpen(false); setForm(emptyWo);
      qc.invalidateQueries({ queryKey: ["ops"] });
    } catch (e: any) { toast.error(e.message); }
  };

  const postUpdate = async () => {
    if (!active || !note.trim()) return;
    try {
      await update({ data: {
        work_order_id: active.id, note,
        status_change: (noteStatus || null) as any,
      }});
      setNote(""); setNoteStatus("");
      qc.invalidateQueries({ queryKey: ["ops"] });
      toast.success("Update posted");
    } catch (e: any) { toast.error(e.message); }
  };

  const overdue = workOrders.filter((w) => w.status !== "completed" && w.status !== "cancelled" && w.scheduled_for && new Date(w.scheduled_for) < new Date()).length;
  const emergencies = workOrders.filter((w) => w.priority === "emergency" && w.status !== "completed").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Work orders</h1>
          <p className="text-muted-foreground text-sm">Maintenance, repairs, jobs with geo-stamped media</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setForm(emptyWo); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Raise job</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{form.id ? "Edit" : "New"} work order</DialogTitle></DialogHeader>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2"><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Property</Label>
                <Select value={form.property_id} onValueChange={(v) => setForm({ ...form, property_id: v })}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>{properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Tenancy</Label>
                <Select value={form.tenancy_id} onValueChange={(v) => setForm({ ...form, tenancy_id: v })}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>{tenancies.map((t) => <SelectItem key={t.id} value={t.id}>{t.tenant_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Assign to</Label>
                <Select value={form.contact_id} onValueChange={(v) => setForm({ ...form, contact_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>{contacts.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name} — {c.contact_type}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Category</Label><Input value={form.category} placeholder="Plumbing, electrics..." onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
              <div><Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v: any) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Scheduled for</Label><Input type="datetime-local" value={form.scheduled_for} onChange={(e) => setForm({ ...form, scheduled_for: e.target.value })} /></div>
              <div><Label>Estimated cost (£)</Label><Input type="number" value={form.estimated_cost} onChange={(e) => setForm({ ...form, estimated_cost: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={submit}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Active</div><div className="text-2xl font-bold">{workOrders.filter(w => w.status !== "completed" && w.status !== "cancelled").length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Overdue</div><div className="text-2xl font-bold text-amber-600">{overdue}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Emergencies</div><div className="text-2xl font-bold text-red-600">{emergencies}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Completed</div><div className="text-2xl font-bold">{workOrders.filter(w => w.status === "completed").length}</div></CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList><TabsTrigger value="active">Active</TabsTrigger><TabsTrigger value="done">Completed</TabsTrigger><TabsTrigger value="all">All</TabsTrigger></TabsList>
        <TabsContent value={tab} className="space-y-3 mt-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4 space-y-2">
                    <div className="h-5 w-40 bg-muted rounded" />
                    <div className="h-4 w-3/4 bg-muted rounded" />
                    <div className="h-3 w-1/2 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground"><Wrench className="h-8 w-8 mx-auto mb-2 opacity-40" /> No jobs in this view</CardContent></Card>
          ) : filtered.map((w) => {
            const wMedia = media.filter((m) => m.work_order_id === w.id);
            return (
              <Card key={w.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActive(w)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold truncate">{w.title}</h3>
                        <Badge className={PRIORITY_TONE[w.priority]}>{w.priority}</Badge>
                        <Badge variant="outline">{STATUS_LABEL[w.status]}</Badge>
                        {wMedia.length > 0 && <Badge variant="secondary"><Camera className="h-3 w-3 mr-1" /> {wMedia.length}</Badge>}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1 flex flex-wrap gap-3">
                        {w.property_id && <span>{propMap[w.property_id]?.title}</span>}
                        {w.contact_id && <span>→ {contactMap[w.contact_id]?.full_name}</span>}
                        {w.scheduled_for && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(w.scheduled_for).toLocaleString("en-GB")}</span>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>

      {/* Job drawer */}
      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 flex-wrap">
                  {active.title}
                  <Badge className={PRIORITY_TONE[active.priority]}>{active.priority}</Badge>
                  <Badge variant="outline">{STATUS_LABEL[active.status]}</Badge>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground space-y-1">
                  {active.property_id && <div>Property: {propMap[active.property_id]?.title}</div>}
                  {active.contact_id && <div>Assigned: {contactMap[active.contact_id]?.full_name} ({contactMap[active.contact_id]?.phone || "no phone"})</div>}
                  {active.description && <p className="text-foreground mt-2">{active.description}</p>}
                </div>

                <div className="border-t pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold flex items-center gap-2"><MapPin className="h-4 w-4" /> Site visits</h4>
                    <Button size="sm" variant="outline" onClick={() => setShareOpen(true)}><Link2 className="h-3 w-3 mr-1" /> Contractor link</Button>
                  </div>
                  <VisitPanel
                    workOrderId={active.id}
                    propertyId={active.property_id}
                    visits={visits.filter((v) => v.work_order_id === active.id)}
                    media={media.filter((m) => m.work_order_id === active.id)}
                  />
                  {shareTokens.filter((t) => t.work_order_id === active.id && !t.revoked_at).length > 0 && (
                    <div className="space-y-1">
                      <div className="text-xs font-semibold uppercase text-muted-foreground">Active contractor links</div>
                      {shareTokens.filter((t) => t.work_order_id === active.id && !t.revoked_at).map((t) => {
                        const url = `${typeof window !== "undefined" ? window.location.origin : ""}/visit/${t.token}`;
                        return (
                          <div key={t.id} className="flex items-center justify-between gap-2 text-xs border rounded-md p-2">
                            <div className="min-w-0">
                              <div className="font-medium">{t.contractor_name}</div>
                              <div className="text-muted-foreground truncate">{url}</div>
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(url); toast.success("Copied"); }}><Copy className="h-3 w-3" /></Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>


                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold flex items-center gap-2"><Camera className="h-4 w-4" /> Media on site</h4>
                    <GeoMediaUpload workOrderId={active.id} propertyId={active.property_id} onUploaded={() => qc.invalidateQueries({ queryKey: ["ops"] })} />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {media.filter((m) => m.work_order_id === active.id).map((m) => (
                      <div key={m.id} className="relative group">
                        <SignedMedia path={m.storage_path} kind={m.kind} className="w-full aspect-square object-cover rounded-md bg-muted" />
                        <div className="absolute bottom-1 left-1 right-1 text-[10px] bg-black/70 text-white rounded px-1 py-0.5 flex items-center gap-1 truncate">
                          <MapPin className="h-2.5 w-2.5 shrink-0" />
                          {m.latitude != null ? `${Number(m.latitude).toFixed(3)}, ${Number(m.longitude).toFixed(3)}` : "no geo"}
                        </div>
                      </div>
                    ))}
                    {media.filter((m) => m.work_order_id === active.id).length === 0 && (
                      <div className="col-span-full text-center text-sm text-muted-foreground py-6">No media yet — capture above</div>
                    )}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Activity</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {updates.filter((u) => u.work_order_id === active.id).map((u) => (
                      <div key={u.id} className="text-sm border-l-2 border-primary/40 pl-3">
                        <div className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleString("en-GB")} {u.status_change && <Badge variant="outline" className="ml-1 text-[10px]">→ {STATUS_LABEL[u.status_change]}</Badge>}</div>
                        <div>{u.note}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 space-y-2">
                    <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add an update..." rows={2} />
                    <div className="flex gap-2">
                      <Select value={noteStatus} onValueChange={setNoteStatus}>
                        <SelectTrigger className="w-[180px]"><SelectValue placeholder="Change status?" /></SelectTrigger>
                        <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
                      </Select>
                      <Button onClick={postUpdate} disabled={!note.trim()}>Post update</Button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
