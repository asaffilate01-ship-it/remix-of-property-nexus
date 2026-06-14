import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Users, Mail, Phone, Home } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/tenants")({
  head: () => ({ meta: [{ title: "Tenants — Estately" }] }),
  component: TenantsPage,
});

type Tenant = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  dob: string | null;
  notes: string | null;
  created_at: string;
};

type TenancyLink = {
  tenant_id: string | null;
  property_id: string;
  status: string;
  rent_amount: number;
  rent_frequency: string;
  properties: { address: string | null; city: string | null; postcode: string | null } | null;
};

const empty = { id: "", full_name: "", email: "", phone: "", dob: "", notes: "" };

function TenantsPage() {
  const [rows, setRows] = useState<Tenant[]>([]);
  const [tenancies, setTenancies] = useState<TenancyLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [t, tn] = await Promise.all([
      supabase.from("tenants").select("*").order("full_name"),
      supabase
        .from("tenancies")
        .select("tenant_id, property_id, status, rent_amount, rent_frequency, properties(address, city, postcode)"),
    ]);
    if (t.error) toast.error(t.error.message);
    setRows((t.data as Tenant[]) ?? []);
    setTenancies((tn.data as any) ?? []);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const tenancyByTenant = useMemo(() => {
    const m = new Map<string, TenancyLink[]>();
    for (const t of tenancies) {
      if (!t.tenant_id) continue;
      const arr = m.get(t.tenant_id) ?? [];
      arr.push(t);
      m.set(t.tenant_id, arr);
    }
    return m;
  }, [tenancies]);

  const filtered = useMemo(() => {
    if (!q) return rows;
    const s = q.toLowerCase();
    return rows.filter((r) =>
      r.full_name.toLowerCase().includes(s) ||
      (r.email ?? "").toLowerCase().includes(s) ||
      (r.phone ?? "").toLowerCase().includes(s),
    );
  }, [rows, q]);

  const startNew = () => { setForm(empty); setOpen(true); };
  const startEdit = (t: Tenant) => {
    setForm({
      id: t.id,
      full_name: t.full_name,
      email: t.email ?? "",
      phone: t.phone ?? "",
      dob: t.dob ?? "",
      notes: t.notes ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.full_name.trim()) return toast.error("Name required");
    setSaving(true);
    const payload = {
      full_name: form.full_name.trim(),
      email: form.email || null,
      phone: form.phone || null,
      dob: form.dob || null,
      notes: form.notes || null,
    };
    const { error } = form.id
      ? await supabase.from("tenants").update(payload).eq("id", form.id)
      : await supabase.from("tenants").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(form.id ? "Updated" : "Tenant added");
    setOpen(false);
    void load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this tenant? Linked tenancies will be kept but unlinked.")) return;
    const { error } = await supabase.from("tenants").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    void load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tenants"
        description="Tenant contacts directory — independent of active tenancies."
        actions={<Button onClick={startNew}><Plus className="mr-2 h-4 w-4" /> Add tenant</Button>}
      />

      <div className="flex items-center gap-2">
        <Input placeholder="Search by name, email or phone…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-md" />
        <div className="text-xs text-muted-foreground ml-auto">{filtered.length} of {rows.length}</div>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse"><CardContent className="p-5 h-32" /></Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent">
          <CardContent className="p-12 text-center text-muted-foreground">
            <Users className="mx-auto h-10 w-10 mb-3 opacity-40" />
            <div>{rows.length === 0 ? "No tenants yet. Add your first contact." : "No matches."}</div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t) => {
            const links = tenancyByTenant.get(t.id) ?? [];
            const active = links.filter((l) => l.status === "active");
            return (
              <Card key={t.id} className="border-0 shadow-card">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{t.full_name}</div>
                      <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                        {t.email && <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> <span className="truncate">{t.email}</span></div>}
                        {t.phone && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {t.phone}</div>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" onClick={() => startEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {active.length > 0 ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 border" variant="outline">
                        <Home className="h-3 w-3 mr-1" /> {active.length} active tenanc{active.length === 1 ? "y" : "ies"}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">No active tenancy</Badge>
                    )}
                  </div>
                  {links.length > 0 && (
                    <div className="text-xs text-muted-foreground space-y-0.5 border-t pt-2">
                      {links.slice(0, 3).map((l, i) => (
                        <div key={i} className="truncate">
                          {[l.properties?.address, l.properties?.city, l.properties?.postcode].filter(Boolean).join(", ") || "Property"}
                          <span className="ml-1">· £{Number(l.rent_amount).toLocaleString()} {l.rent_frequency}</span>
                        </div>
                      ))}
                      {links.length > 3 && <div>+{links.length - 3} more</div>}
                    </div>
                  )}
                  {t.notes && <p className="text-xs text-muted-foreground line-clamp-2">{t.notes}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{form.id ? "Edit tenant" : "Add tenant"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Full name *</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="col-span-2"><Label>Date of birth</Label><Input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} /></div>
            <div className="col-span-2"><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={save} disabled={saving || !form.full_name.trim()}>{saving ? "Saving…" : "Save"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
