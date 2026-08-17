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
import { Plus, Trash2, Handshake, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/sellers")({
  head: () => ({ meta: [{ title: "Sellers — Gabley" }] }),
  component: SellersPage,
});

type Property = { id: string; address: string | null };
type Seller = { id: string; full_name: string; email: string | null; phone: string | null; asking_price: number | null; reason: string | null; chain_status: string | null; target_completion: string | null; notes: string | null; property_id: string | null; active: boolean };

const empty = { full_name: "", email: "", phone: "", asking_price: 0, reason: "", chain_status: "", target_completion: "", notes: "", property_id: "" };

function SellersPage() {
  const [rows, setRows] = useState<Seller[]>([]);
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
    const [s, p] = await Promise.all([
      supabase.from("seller_profiles").select("*").eq("active", true).order("created_at", { ascending: false }),
      supabase.from("properties").select("id, address"),
    ]);
    if (s.error) toast.error(s.error.message);
    setRows((s.data as any) ?? []); setProperties((p.data as any) ?? []); setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const propById = useMemo(() => new Map(properties.map((p) => [p.id, p])), [properties]);

  const save = async () => {
    if (!form.full_name.trim()) return toast.error("Name required");
    setSaving(true);
    const payload: any = {
      agency_id: agencyId, full_name: form.full_name.trim(),
      email: form.email || null, phone: form.phone || null,
      asking_price: form.asking_price || null, reason: form.reason || null,
      chain_status: form.chain_status || null,
      target_completion: form.target_completion || null,
      notes: form.notes || null, property_id: form.property_id || null,
    };
    const { error } = await supabase.from("seller_profiles").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Seller added");
    setOpen(false); setForm(empty); void load();
  };

  const remove = async (id: string) => {
    if (!confirm("Archive this seller?")) return;
    const { error } = await supabase.from("seller_profiles").update({ active: false }).eq("id", id);
    if (error) return toast.error(error.message);
    void load();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Sellers" description="Vendors and instructed sales." actions={
        <Button onClick={() => { setForm(empty); setOpen(true); }}><Plus className="mr-2 h-4 w-4" /> Add seller</Button>
      } />

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <Card key={i} className="animate-pulse"><CardContent className="p-5 h-32" /></Card>)}</div>
      ) : rows.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent"><CardContent className="p-12 text-center text-muted-foreground"><Handshake className="mx-auto h-10 w-10 mb-3 opacity-40" /><div>No sellers yet.</div></CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((s) => {
            const prop = s.property_id ? propById.get(s.property_id) : null;
            return (
              <Card key={s.id} className="border-0 shadow-card">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{s.full_name}</div>
                      {prop && <div className="text-xs text-muted-foreground truncate">{prop.address}</div>}
                    </div>
                    <Button size="icon" variant="ghost" className="text-destructive h-7 w-7" onClick={() => remove(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                  {s.asking_price ? <div className="text-lg font-bold">£{Number(s.asking_price).toLocaleString()}</div> : null}
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {s.email && <div className="flex items-center gap-1.5 truncate"><Mail className="h-3 w-3 shrink-0" />{s.email}</div>}
                    {s.phone && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{s.phone}</div>}
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    {s.chain_status && <Badge variant="secondary" className="font-normal">{s.chain_status}</Badge>}
                    {s.target_completion && <Badge variant="outline" className="font-normal">Target {new Date(s.target_completion).toLocaleDateString()}</Badge>}
                  </div>
                  {s.notes && <p className="text-xs text-muted-foreground line-clamp-2">{s.notes}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add seller</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Full name *</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="col-span-2"><Label>Property</Label>
              <Select value={form.property_id} onValueChange={(val) => setForm({ ...form, property_id: val })}>
                <SelectTrigger><SelectValue placeholder="(none)" /></SelectTrigger>
                <SelectContent>{properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.address}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Asking price (£)</Label><Input type="number" value={form.asking_price} onChange={(e) => setForm({ ...form, asking_price: Number(e.target.value) })} /></div>
            <div><Label>Target completion</Label><Input type="date" value={form.target_completion} onChange={(e) => setForm({ ...form, target_completion: e.target.value })} /></div>
            <div><Label>Chain status</Label><Input value={form.chain_status} onChange={(e) => setForm({ ...form, chain_status: e.target.value })} /></div>
            <div><Label>Reason for sale</Label><Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
            <div className="col-span-2"><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={save} disabled={saving || !form.full_name.trim()}>{saving ? "Saving…" : "Save"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
