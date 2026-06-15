import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Building2, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/branches")({
  head: () => ({ meta: [{ title: "Branches — Estately" }] }),
  component: BranchesPage,
});

type Branch = { id: string; name: string; address: string | null; city: string | null; postcode: string | null; phone: string | null; email: string | null; is_primary: boolean; agency_id: string };

const empty = { id: "", name: "", address: "", city: "", postcode: "", phone: "", email: "", is_primary: false };

function BranchesPage() {
  const [rows, setRows] = useState<Branch[]>([]);
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setLoading(false); return; }
    const { data: ag } = await supabase.from("agencies").select("id").eq("owner_id", u.user.id).maybeSingle();
    const aid = ag?.id ?? null;
    setAgencyId(aid);
    if (!aid) { setRows([]); setLoading(false); return; }
    const { data, error } = await supabase.from("branches").select("*").eq("agency_id", aid).order("is_primary", { ascending: false }).order("name");
    if (error) toast.error(error.message);
    setRows((data as any) ?? []); setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const save = async () => {
    if (!form.name.trim()) return toast.error("Name required");
    if (!agencyId) return toast.error("No agency — only agency owners can manage branches.");
    setSaving(true);
    const payload: any = {
      agency_id: agencyId, name: form.name.trim(),
      address: form.address || null, city: form.city || null, postcode: form.postcode || null,
      phone: form.phone || null, email: form.email || null, is_primary: form.is_primary,
    };
    const { error } = form.id
      ? await supabase.from("branches").update(payload).eq("id", form.id)
      : await supabase.from("branches").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(form.id ? "Updated" : "Branch added");
    setOpen(false); setForm(empty); void load();
  };

  const startEdit = (b: Branch) => {
    setForm({ id: b.id, name: b.name, address: b.address ?? "", city: b.city ?? "", postcode: b.postcode ?? "", phone: b.phone ?? "", email: b.email ?? "", is_primary: b.is_primary });
    setOpen(true);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this branch?")) return;
    const { error } = await supabase.from("branches").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); void load();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Branches" description="Office locations under your agency." actions={
        <Button onClick={() => { setForm(empty); setOpen(true); }} disabled={!agencyId}><Plus className="mr-2 h-4 w-4" /> Add branch</Button>
      } />

      {!agencyId && !loading && (
        <Card className="border-dashed border-2 bg-transparent"><CardContent className="p-12 text-center text-muted-foreground">Only agency owners can manage branches. Set up your agency under Settings first.</CardContent></Card>
      )}

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <Card key={i} className="animate-pulse"><CardContent className="p-5 h-32" /></Card>)}</div>
      ) : agencyId && rows.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent"><CardContent className="p-12 text-center text-muted-foreground"><Building2 className="mx-auto h-10 w-10 mb-3 opacity-40" /><div>No branches yet. Add your first office.</div></CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((b) => (
            <Card key={b.id} className="border-0 shadow-card">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold flex items-center gap-2 truncate">{b.name} {b.is_primary && <Badge variant="secondary">Primary</Badge>}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">{[b.address, b.city, b.postcode].filter(Boolean).join(", ")}</div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  {b.email && <div className="flex items-center gap-1.5 truncate"><Mail className="h-3 w-3 shrink-0" />{b.email}</div>}
                  {b.phone && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{b.phone}</div>}
                </div>
                <div className="flex gap-1 pt-1 border-t">
                  <Button size="sm" variant="ghost" onClick={() => startEdit(b)} className="flex-1"><Pencil className="mr-1 h-3.5 w-3.5" /> Edit</Button>
                  <Button size="icon" variant="ghost" className="text-destructive h-8 w-8" onClick={() => remove(b.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{form.id ? "Edit branch" : "Add branch"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="col-span-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            <div><Label>Postcode</Label><Input value={form.postcode} onChange={(e) => setForm({ ...form, postcode: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <label className="col-span-2 text-sm flex items-center gap-2"><input type="checkbox" checked={form.is_primary} onChange={(e) => setForm({ ...form, is_primary: e.target.checked })} /> Primary branch</label>
          </div>
          <DialogFooter><Button onClick={save} disabled={saving || !form.name.trim()}>{saving ? "Saving…" : "Save"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
