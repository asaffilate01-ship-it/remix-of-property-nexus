import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, CalendarDays, MapPin, User } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/viewings")({
  head: () => ({ meta: [{ title: "Viewings — Estately" }] }),
  component: ViewingsPage,
});

type Listing = { id: string; title: string | null; address: string | null };
type Viewing = {
  id: string;
  applicant_name: string | null;
  applicant_email: string | null;
  applicant_phone: string | null;
  agent_name: string | null;
  scheduled_at: string;
  duration_minutes: number | null;
  status: string;
  notes: string | null;
  listing_id: string | null;
  feedback: string | null;
};

const STATUSES = ["pending","confirmed","completed","cancelled","no_show"] as const;
type VStatus = typeof STATUSES[number];
const empty = { applicant_name: "", applicant_email: "", applicant_phone: "", agent_name: "", scheduled_at: "", duration_minutes: 30, status: "pending" as VStatus, notes: "", listing_id: "" };

function ViewingsPage() {
  const [rows, setRows] = useState<Viewing[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [v, l] = await Promise.all([
      supabase.from("viewings").select("*").order("scheduled_at", { ascending: false }),
      supabase.from("listings").select("id, title, address"),
    ]);
    if (v.error) toast.error(v.error.message);
    setRows((v.data as any) ?? []);
    setListings((l.data as any) ?? []);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const listingById = useMemo(() => new Map(listings.map((l) => [l.id, l])), [listings]);

  const save = async () => {
    if (!form.scheduled_at) return toast.error("Date & time required");
    if (!form.applicant_name.trim()) return toast.error("Applicant name required");
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const payload: any = {
      applicant_name: form.applicant_name.trim(),
      applicant_email: form.applicant_email || null,
      applicant_phone: form.applicant_phone || null,
      agent_name: form.agent_name || null,
      scheduled_at: new Date(form.scheduled_at).toISOString(),
      duration_minutes: form.duration_minutes,
      status: form.status,
      notes: form.notes || null,
      listing_id: form.listing_id || null,
      owner_id: u.user?.id ?? null,
    };
    const { error } = await supabase.from("viewings").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Viewing booked");
    setOpen(false);
    setForm(empty);
    void load();
  };

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("viewings").update({ status: status as VStatus }).eq("id", id);
    if (error) return toast.error(error.message);
    void load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this viewing?")) return;
    const { error } = await supabase.from("viewings").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    void load();
  };

  const statusColor = (s: string) =>
    s === "confirmed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
    s === "cancelled" || s === "no_show" ? "bg-red-50 text-red-700 border-red-200" :
    s === "completed" ? "bg-blue-50 text-blue-700 border-blue-200" :
    "bg-amber-50 text-amber-700 border-amber-200";

  return (
    <div className="space-y-6">
      <PageHeader title="Viewings" description="Schedule, confirm, and track property viewings." actions={
        <Button onClick={() => { setForm(empty); setOpen(true); }}><Plus className="mr-2 h-4 w-4" /> Book viewing</Button>
      } />

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <Card key={i} className="animate-pulse"><CardContent className="p-5 h-32" /></Card>)}</div>
      ) : rows.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent"><CardContent className="p-12 text-center text-muted-foreground"><CalendarDays className="mx-auto h-10 w-10 mb-3 opacity-40" /><div>No viewings yet. Book your first one.</div></CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((v) => {
            const listing = v.listing_id ? listingById.get(v.listing_id) : null;
            const when = new Date(v.scheduled_at);
            return (
              <Card key={v.id} className="border-0 shadow-card">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{v.applicant_name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{when.toLocaleString()}</div>
                    </div>
                    <Badge className={`${statusColor(v.status)} border`} variant="outline">{v.status}</Badge>
                  </div>
                  {listing && <div className="text-xs flex items-center gap-1.5 text-muted-foreground"><MapPin className="h-3 w-3" /><span className="truncate">{listing.title || listing.address}</span></div>}
                  {v.agent_name && <div className="text-xs flex items-center gap-1.5 text-muted-foreground"><User className="h-3 w-3" />{v.agent_name}</div>}
                  {v.notes && <p className="text-xs text-muted-foreground line-clamp-2">{v.notes}</p>}
                  <div className="flex gap-1 pt-1 border-t">
                    <Select value={v.status} onValueChange={(val) => setStatus(v.id, val)}>
                      <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["pending","confirmed","completed","cancelled","no_show"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button size="icon" variant="ghost" className="text-destructive h-8 w-8" onClick={() => remove(v.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Book a viewing</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Applicant name *</Label><Input value={form.applicant_name} onChange={(e) => setForm({ ...form, applicant_name: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={form.applicant_email} onChange={(e) => setForm({ ...form, applicant_email: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.applicant_phone} onChange={(e) => setForm({ ...form, applicant_phone: e.target.value })} /></div>
            <div className="col-span-2"><Label>Listing</Label>
              <Select value={form.listing_id} onValueChange={(val) => setForm({ ...form, listing_id: val })}>
                <SelectTrigger><SelectValue placeholder="(none)" /></SelectTrigger>
                <SelectContent>{listings.map((l) => <SelectItem key={l.id} value={l.id}>{l.title || l.address}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Date & time *</Label><Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} /></div>
            <div><Label>Duration (min)</Label><Input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} /></div>
            <div><Label>Agent</Label><Input value={form.agent_name} onChange={(e) => setForm({ ...form, agent_name: e.target.value })} /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={(val) => setForm({ ...form, status: val as VStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["pending","confirmed","completed","cancelled","no_show"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Book"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
