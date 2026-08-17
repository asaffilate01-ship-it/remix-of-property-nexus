import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Handshake } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/sales")({
  head: () => ({ meta: [{ title: "Sales pipeline — Gabley" }] }),
  component: SalesPage,
});

const STAGES = ["memo_of_sale","searches","enquiries","mortgage_offer","exchange","completion","fallen_through"];

type Property = { id: string; address: string | null };
type Deal = { id: string; status: string; offer_amount: number | null; agreed_price: number | null; chain_position: string | null; notes: string | null; property_id: string | null; memo_of_sale_at: string | null; exchange_at: string | null; completion_at: string | null };

const empty = { status: "memo_of_sale", offer_amount: 0, agreed_price: 0, chain_position: "", notes: "", property_id: "" };

function SalesPage() {
  const [rows, setRows] = useState<Deal[]>([]);
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
      supabase.from("sales_deals").select("*").order("created_at", { ascending: false }),
      supabase.from("properties").select("id, address"),
    ]);
    if (s.error) toast.error(s.error.message);
    setRows((s.data as any) ?? []); setProperties((p.data as any) ?? []); setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const propById = useMemo(() => new Map(properties.map((p) => [p.id, p])), [properties]);
  const byStage = useMemo(() => {
    const m = new Map<string, Deal[]>();
    for (const s of STAGES) m.set(s, []);
    for (const r of rows) (m.get(r.status) ?? m.set(r.status, []).get(r.status)!).push(r);
    return m;
  }, [rows]);

  const save = async () => {
    setSaving(true);
    const payload: any = {
      agency_id: agencyId, status: form.status,
      offer_amount: form.offer_amount || null, agreed_price: form.agreed_price || null,
      chain_position: form.chain_position || null, notes: form.notes || null,
      property_id: form.property_id || null,
    };
    const { error } = await supabase.from("sales_deals").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Sale created");
    setOpen(false); setForm(empty); void load();
  };

  const advance = async (id: string, status: string) => {
    const updates: any = { status };
    if (status === "exchange") updates.exchange_at = new Date().toISOString().slice(0, 10);
    if (status === "completion") updates.completion_at = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("sales_deals").update(updates).eq("id", id);
    if (error) return toast.error(error.message);
    void load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this sale?")) return;
    const { error } = await supabase.from("sales_deals").delete().eq("id", id);
    if (error) return toast.error(error.message);
    void load();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Sales pipeline" description="From memo of sale to completion." actions={
        <Button onClick={() => { setForm(empty); setOpen(true); }}><Plus className="mr-2 h-4 w-4" /> New sale</Button>
      } />

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <Card key={i} className="animate-pulse"><CardContent className="p-5 h-48" /></Card>)}</div>
      ) : rows.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent"><CardContent className="p-12 text-center text-muted-foreground"><Handshake className="mx-auto h-10 w-10 mb-3 opacity-40" /><div>No sales in progress.</div></CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {STAGES.map((stage) => (
            <Card key={stage} className="border-0 shadow-card">
              <CardContent className="p-3 space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>{stage.replace(/_/g, " ")}</span>
                  <span className="text-foreground/70">{byStage.get(stage)?.length ?? 0}</span>
                </div>
                <div className="space-y-2">
                  {(byStage.get(stage) ?? []).map((d) => {
                    const prop = d.property_id ? propById.get(d.property_id) : null;
                    return (
                      <div key={d.id} className="rounded-md border bg-card p-2.5 text-xs space-y-1">
                        <div className="font-medium truncate">{prop?.address ?? "Unassigned property"}</div>
                        {d.agreed_price ? <div className="text-sm font-bold">£{Number(d.agreed_price).toLocaleString()}</div> : d.offer_amount ? <div className="text-muted-foreground">£{Number(d.offer_amount).toLocaleString()} offered</div> : null}
                        {d.chain_position && <Badge variant="secondary" className="font-normal">{d.chain_position}</Badge>}
                        <div className="flex items-center gap-1 pt-1">
                          <Select value={d.status} onValueChange={(v) => advance(d.id, v)}>
                            <SelectTrigger className="h-7 text-[11px] flex-1"><SelectValue /></SelectTrigger>
                            <SelectContent>{STAGES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                          </Select>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(d.id)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New sale</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Property</Label>
              <Select value={form.property_id} onValueChange={(val) => setForm({ ...form, property_id: val })}>
                <SelectTrigger><SelectValue placeholder="(none)" /></SelectTrigger>
                <SelectContent>{properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.address}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={(val) => setForm({ ...form, status: val })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STAGES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Chain</Label><Input value={form.chain_position} onChange={(e) => setForm({ ...form, chain_position: e.target.value })} /></div>
            <div><Label>Offer (£)</Label><Input type="number" value={form.offer_amount} onChange={(e) => setForm({ ...form, offer_amount: Number(e.target.value) })} /></div>
            <div><Label>Agreed (£)</Label><Input type="number" value={form.agreed_price} onChange={(e) => setForm({ ...form, agreed_price: Number(e.target.value) })} /></div>
            <div className="col-span-2"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
