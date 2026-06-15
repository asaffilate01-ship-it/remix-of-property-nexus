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
import { Plus, Trash2, Sun, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/holiday-lets")({
  head: () => ({ meta: [{ title: "Holiday lets — Estately" }] }),
  component: HolidayLetsPage,
});

type Property = { id: string; address: string | null; city: string | null };
type Booking = {
  id: string; guest_name: string; guest_email: string | null; guests_count: number | null;
  check_in: string; check_out: string; nightly_rate: number | null; total: number | null;
  cleaning_fee: number | null; status: string; source: string | null; notes: string | null; property_id: string | null;
};

const empty = { guest_name: "", guest_email: "", guest_phone: "", guests_count: 2, check_in: "", check_out: "", nightly_rate: 0, total: 0, cleaning_fee: 0, status: "confirmed", source: "direct", notes: "", property_id: "" };

function HolidayLetsPage() {
  const [rows, setRows] = useState<Booking[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [agencyId, setAgencyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (u.user) { const { data: ag } = await supabase.from("agencies").select("id").eq("owner_id", u.user.id).maybeSingle(); setAgencyId(ag?.id ?? null); }
    const [b, p] = await Promise.all([
      supabase.from("holiday_bookings").select("*").order("check_in", { ascending: false }),
      supabase.from("properties").select("id, address, city"),
    ]);
    if (b.error) toast.error(b.error.message);
    setRows((b.data as any) ?? []); setProperties((p.data as any) ?? []); setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const propById = useMemo(() => new Map(properties.map((p) => [p.id, p])), [properties]);

  const save = async () => {
    if (!form.guest_name.trim() || !form.check_in || !form.check_out || !form.property_id) return toast.error("Property, guest and dates required");
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const payload: any = {
      agency_id: agencyId, property_id: form.property_id,
      guest_name: form.guest_name.trim(), guest_email: form.guest_email || null, guest_phone: form.guest_phone || null,
      guests_count: form.guests_count, check_in: form.check_in, check_out: form.check_out,
      nightly_rate: form.nightly_rate || null, total: form.total || null, cleaning_fee: form.cleaning_fee || null,
      status: form.status, source: form.source || null, notes: form.notes || null,
      created_by: u.user?.id ?? null,
    };
    const { error } = await supabase.from("holiday_bookings").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Booking created");
    setOpen(false); setForm(empty); void load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this booking?")) return;
    const { error } = await supabase.from("holiday_bookings").delete().eq("id", id);
    if (error) return toast.error(error.message);
    void load();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Holiday lets" description="Short-stay bookings, turnover and revenue." actions={
        <Button onClick={() => { setForm(empty); setOpen(true); }}><Plus className="mr-2 h-4 w-4" /> New booking</Button>
      } />

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <Card key={i} className="animate-pulse"><CardContent className="p-5 h-32" /></Card>)}</div>
      ) : rows.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent"><CardContent className="p-12 text-center text-muted-foreground"><Sun className="mx-auto h-10 w-10 mb-3 opacity-40" /><div>No bookings yet.</div></CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((b) => {
            const prop = b.property_id ? propById.get(b.property_id) : null;
            const nights = Math.max(1, Math.round((new Date(b.check_out).getTime() - new Date(b.check_in).getTime()) / 86400000));
            return (
              <Card key={b.id} className="border-0 shadow-card">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{b.guest_name}</div>
                      {prop && <div className="text-xs text-muted-foreground truncate">{[prop.address, prop.city].filter(Boolean).join(", ")}</div>}
                    </div>
                    <Badge variant="outline" className="capitalize">{b.status}</Badge>
                  </div>
                  <div className="text-xs flex items-center gap-1.5 text-muted-foreground">
                    <CalendarDays className="h-3 w-3" />{new Date(b.check_in).toLocaleDateString()} → {new Date(b.check_out).toLocaleDateString()} · {nights}n
                  </div>
                  {b.total ? <div className="text-lg font-bold">£{Number(b.total).toLocaleString()}</div> : null}
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    {b.source && <Badge variant="secondary" className="font-normal">{b.source}</Badge>}
                    {b.guests_count ? <Badge variant="secondary" className="font-normal">{b.guests_count} guests</Badge> : null}
                  </div>
                  {b.notes && <p className="text-xs text-muted-foreground line-clamp-2">{b.notes}</p>}
                  <div className="flex justify-end pt-1 border-t">
                    <Button size="icon" variant="ghost" className="text-destructive h-7 w-7" onClick={() => remove(b.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New booking</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Property *</Label>
              <Select value={form.property_id} onValueChange={(val) => setForm({ ...form, property_id: val })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{properties.map((p) => <SelectItem key={p.id} value={p.id}>{[p.address, p.city].filter(Boolean).join(", ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Guest name *</Label><Input value={form.guest_name} onChange={(e) => setForm({ ...form, guest_name: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={form.guest_email} onChange={(e) => setForm({ ...form, guest_email: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.guest_phone} onChange={(e) => setForm({ ...form, guest_phone: e.target.value })} /></div>
            <div><Label>Check in *</Label><Input type="date" value={form.check_in} onChange={(e) => setForm({ ...form, check_in: e.target.value })} /></div>
            <div><Label>Check out *</Label><Input type="date" value={form.check_out} onChange={(e) => setForm({ ...form, check_out: e.target.value })} /></div>
            <div><Label>Guests</Label><Input type="number" value={form.guests_count} onChange={(e) => setForm({ ...form, guests_count: Number(e.target.value) })} /></div>
            <div><Label>Nightly (£)</Label><Input type="number" value={form.nightly_rate} onChange={(e) => setForm({ ...form, nightly_rate: Number(e.target.value) })} /></div>
            <div><Label>Total (£)</Label><Input type="number" value={form.total} onChange={(e) => setForm({ ...form, total: Number(e.target.value) })} /></div>
            <div><Label>Cleaning fee</Label><Input type="number" value={form.cleaning_fee} onChange={(e) => setForm({ ...form, cleaning_fee: Number(e.target.value) })} /></div>
            <div><Label>Source</Label><Input placeholder="direct / airbnb / booking" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={(val) => setForm({ ...form, status: val })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["pending","confirmed","checked_in","checked_out","cancelled"].map((s) => <SelectItem key={s} value={s}>{s.replace("_"," ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
