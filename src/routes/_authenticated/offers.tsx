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
import { Plus, Trash2, Gavel } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/offers")({
  head: () => ({ meta: [{ title: "Offers — Estately" }] }),
  component: OffersPage,
});

type Listing = { id: string; title: string | null; address: string | null; price: number | null };
type Offer = {
  id: string; buyer_name: string | null; buyer_email: string | null; amount: number | null;
  status: string; notes: string | null; listing_id: string | null; submitted_at: string | null;
  financing: string | null; position_in_chain: number | null;
};

const empty = { buyer_name: "", buyer_email: "", buyer_phone: "", amount: 0, status: "submitted", notes: "", listing_id: "", financing: "", position_in_chain: 0 };

function OffersPage() {
  const [rows, setRows] = useState<Offer[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [o, l] = await Promise.all([
      supabase.from("offers").select("*").order("submitted_at", { ascending: false, nullsFirst: false }),
      supabase.from("listings").select("id, title, address, price"),
    ]);
    if (o.error) toast.error(o.error.message);
    setRows((o.data as any) ?? []);
    setListings((l.data as any) ?? []);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const listingById = useMemo(() => new Map(listings.map((l) => [l.id, l])), [listings]);

  const save = async () => {
    if (!form.buyer_name.trim() || !form.amount) return toast.error("Buyer name and amount required");
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const payload: any = {
      buyer_name: form.buyer_name.trim(),
      buyer_email: form.buyer_email || null,
      buyer_phone: form.buyer_phone || null,
      amount: form.amount,
      status: form.status,
      notes: form.notes || null,
      listing_id: form.listing_id || null,
      financing: form.financing || null,
      position_in_chain: form.position_in_chain || null,
      submitted_at: new Date().toISOString(),
      owner_id: u.user?.id ?? null,
    };
    const { error } = await supabase.from("offers").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Offer recorded");
    setOpen(false); setForm(empty);
    void load();
  };

  const setStatus = async (id: string, status: string) => {
    const updates: any = { status };
    if (status === "accepted" || status === "rejected") updates.responded_at = new Date().toISOString();
    const { error } = await supabase.from("offers").update(updates).eq("id", id);
    if (error) return toast.error(error.message);
    void load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this offer?")) return;
    const { error } = await supabase.from("offers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    void load();
  };

  const color = (s: string) =>
    s === "accepted" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
    s === "rejected" || s === "withdrawn" ? "bg-red-50 text-red-700 border-red-200" :
    s === "countered" ? "bg-amber-50 text-amber-700 border-amber-200" :
    "bg-blue-50 text-blue-700 border-blue-200";

  return (
    <div className="space-y-6">
      <PageHeader title="Offers & chains" description="Log buyer/tenant offers and track responses." actions={
        <Button onClick={() => { setForm(empty); setOpen(true); }}><Plus className="mr-2 h-4 w-4" /> Record offer</Button>
      } />

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <Card key={i} className="animate-pulse"><CardContent className="p-5 h-32" /></Card>)}</div>
      ) : rows.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent"><CardContent className="p-12 text-center text-muted-foreground"><Gavel className="mx-auto h-10 w-10 mb-3 opacity-40" /><div>No offers yet.</div></CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((o) => {
            const listing = o.listing_id ? listingById.get(o.listing_id) : null;
            const askingDiff = listing?.price && o.amount ? Math.round(((o.amount - listing.price) / listing.price) * 100) : null;
            return (
              <Card key={o.id} className="border-0 shadow-card">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-2xl font-bold tracking-tight">£{Number(o.amount).toLocaleString()}</div>
                      {askingDiff !== null && <div className={`text-xs font-medium ${askingDiff >= 0 ? "text-emerald-600" : "text-red-600"}`}>{askingDiff >= 0 ? "+" : ""}{askingDiff}% vs asking</div>}
                    </div>
                    <Badge className={`${color(o.status)} border`} variant="outline">{o.status}</Badge>
                  </div>
                  <div className="text-sm font-medium truncate">{o.buyer_name}</div>
                  {listing && <div className="text-xs text-muted-foreground truncate">{listing.title || listing.address}</div>}
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    {o.financing && <Badge variant="secondary" className="font-normal">{o.financing}</Badge>}
                    {o.position_in_chain ? <Badge variant="secondary" className="font-normal">Chain #{o.position_in_chain}</Badge> : null}
                  </div>
                  {o.notes && <p className="text-xs text-muted-foreground line-clamp-2">{o.notes}</p>}
                  <div className="flex gap-1 pt-1 border-t">
                    <Select value={o.status} onValueChange={(val) => setStatus(o.id, val)}>
                      <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{["submitted","countered","accepted","rejected","withdrawn"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button size="icon" variant="ghost" className="text-destructive h-8 w-8" onClick={() => remove(o.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Record an offer</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Buyer name *</Label><Input value={form.buyer_name} onChange={(e) => setForm({ ...form, buyer_name: e.target.value })} /></div>
            <div><Label>Amount (£) *</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></div>
            <div><Label>Email</Label><Input type="email" value={form.buyer_email} onChange={(e) => setForm({ ...form, buyer_email: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.buyer_phone} onChange={(e) => setForm({ ...form, buyer_phone: e.target.value })} /></div>
            <div className="col-span-2"><Label>Listing</Label>
              <Select value={form.listing_id} onValueChange={(val) => setForm({ ...form, listing_id: val })}>
                <SelectTrigger><SelectValue placeholder="(none)" /></SelectTrigger>
                <SelectContent>{listings.map((l) => <SelectItem key={l.id} value={l.id}>{l.title || l.address}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Financing</Label><Input placeholder="cash / mortgage" value={form.financing} onChange={(e) => setForm({ ...form, financing: e.target.value })} /></div>
            <div><Label>Chain position</Label><Input type="number" value={form.position_in_chain} onChange={(e) => setForm({ ...form, position_in_chain: Number(e.target.value) })} /></div>
            <div className="col-span-2"><Label>Status</Label>
              <Select value={form.status} onValueChange={(val) => setForm({ ...form, status: val })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["submitted","countered","accepted","rejected","withdrawn"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save offer"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
