import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Users, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/buyers")({
  head: () => ({ meta: [{ title: "Buyers — Estately" }] }),
  component: BuyersPage,
});

type Buyer = {
  id: string; full_name: string | null; email: string | null; phone: string | null;
  budget_min: number | null; budget_max: number | null; bedrooms_min: number | null;
  finance_status: string | null; chain_status: string | null; notes: string | null;
  areas: string[] | null; active: boolean;
};

const empty = { full_name: "", email: "", phone: "", budget_min: 0, budget_max: 0, bedrooms_min: 0, finance_status: "", chain_status: "", areas: "", notes: "" };

function BuyersPage() {
  const [rows, setRows] = useState<Buyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [agencyId, setAgencyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (u.user) {
      const { data: ag } = await supabase.from("agencies").select("id").eq("owner_id", u.user.id).maybeSingle();
      setAgencyId(ag?.id ?? null);
    }
    const { data, error } = await supabase.from("buyer_profiles").select("*").eq("active", true).order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as any) ?? []); setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const save = async () => {
    if (!form.full_name.trim()) return toast.error("Name required");
    setSaving(true);
    const payload: any = {
      agency_id: agencyId,
      full_name: form.full_name.trim(),
      email: form.email || null, phone: form.phone || null,
      budget_min: form.budget_min || null, budget_max: form.budget_max || null,
      bedrooms_min: form.bedrooms_min || null,
      finance_status: form.finance_status || null, chain_status: form.chain_status || null,
      areas: form.areas ? form.areas.split(",").map((s) => s.trim()).filter(Boolean) : null,
      notes: form.notes || null,
    };
    const { error } = await supabase.from("buyer_profiles").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Buyer added");
    setOpen(false); setForm(empty); void load();
  };

  const remove = async (id: string) => {
    if (!confirm("Archive this buyer?")) return;
    const { error } = await supabase.from("buyer_profiles").update({ active: false }).eq("id", id);
    if (error) return toast.error(error.message);
    void load();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Buyers" description="Registered buyers, budgets and search criteria." actions={
        <Button onClick={() => { setForm(empty); setOpen(true); }}><Plus className="mr-2 h-4 w-4" /> Add buyer</Button>
      } />

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <Card key={i} className="animate-pulse"><CardContent className="p-5 h-32" /></Card>)}</div>
      ) : rows.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent"><CardContent className="p-12 text-center text-muted-foreground"><Users className="mx-auto h-10 w-10 mb-3 opacity-40" /><div>No buyers yet.</div></CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((b) => (
            <Card key={b.id} className="border-0 shadow-card">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold truncate">{b.full_name}</div>
                  <Button size="icon" variant="ghost" className="text-destructive h-7 w-7" onClick={() => remove(b.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  {b.email && <div className="flex items-center gap-1.5 truncate"><Mail className="h-3 w-3 shrink-0" />{b.email}</div>}
                  {b.phone && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{b.phone}</div>}
                </div>
                {(b.budget_min || b.budget_max) ? <div className="text-sm font-medium">£{Number(b.budget_min ?? 0).toLocaleString()} – £{Number(b.budget_max ?? 0).toLocaleString()}</div> : null}
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {b.bedrooms_min ? <Badge variant="secondary" className="font-normal">{b.bedrooms_min}+ bed</Badge> : null}
                  {b.finance_status && <Badge variant="secondary" className="font-normal">{b.finance_status}</Badge>}
                  {b.chain_status && <Badge variant="secondary" className="font-normal">{b.chain_status}</Badge>}
                  {b.areas?.slice(0, 3).map((a) => <Badge key={a} variant="outline" className="font-normal">{a}</Badge>)}
                </div>
                {b.notes && <p className="text-xs text-muted-foreground line-clamp-2">{b.notes}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add buyer</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Full name *</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Budget min (£)</Label><Input type="number" value={form.budget_min} onChange={(e) => setForm({ ...form, budget_min: Number(e.target.value) })} /></div>
            <div><Label>Budget max (£)</Label><Input type="number" value={form.budget_max} onChange={(e) => setForm({ ...form, budget_max: Number(e.target.value) })} /></div>
            <div><Label>Min bedrooms</Label><Input type="number" value={form.bedrooms_min} onChange={(e) => setForm({ ...form, bedrooms_min: Number(e.target.value) })} /></div>
            <div><Label>Finance status</Label><Input placeholder="cash / AIP / mortgage" value={form.finance_status} onChange={(e) => setForm({ ...form, finance_status: e.target.value })} /></div>
            <div><Label>Chain status</Label><Input placeholder="no chain / under offer" value={form.chain_status} onChange={(e) => setForm({ ...form, chain_status: e.target.value })} /></div>
            <div><Label>Areas (comma sep)</Label><Input value={form.areas} onChange={(e) => setForm({ ...form, areas: e.target.value })} /></div>
            <div className="col-span-2"><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={save} disabled={saving || !form.full_name.trim()}>{saving ? "Saving…" : "Save"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
