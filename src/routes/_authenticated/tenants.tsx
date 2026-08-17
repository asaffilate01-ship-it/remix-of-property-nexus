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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Users, Mail, Phone, Home, UserCircle, ShieldCheck, FileText, Link2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { TenantBioEditor, type TenantBio } from "@/components/tenancy/TenantBioEditor";
import { TenantComplianceEditor, type TenantComplianceMap } from "@/components/tenancy/TenantComplianceEditor";

export const Route = createFileRoute("/_authenticated/tenants")({
  head: () => ({ meta: [{ title: "Tenants — Gabley" }] }),
  component: TenantsPage,
});

type Tenant = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  dob: string | null;
  notes: string | null;
  bio: TenantBio | null;
  tenant_compliance: TenantComplianceMap | null;
  created_at: string;
};

type Property = { id: string; title: string; address: string | null; postcode: string | null; listing_purpose: string };

type TenancyLink = {
  id: string;
  property_id: string;
  status: string;
  rent_amount: number;
  rent_frequency: string;
  start_date: string;
  end_date: string | null;
  tenant_id: string | null;
  properties: { address: string | null; city: string | null; postcode: string | null; title: string | null } | null;
};

const empty = {
  id: "", full_name: "", email: "", phone: "", dob: "", notes: "",
  bio: {} as TenantBio,
  tenant_compliance: {} as TenantComplianceMap,
};

function TenantsPage() {
  const [rows, setRows] = useState<Tenant[]>([]);
  const [tenancies, setTenancies] = useState<TenancyLink[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  const load = async () => {
    setLoading(true);
    const [t, tn, p] = await Promise.all([
      supabase.from("tenants").select("*").order("full_name"),
      supabase.from("tenancies").select("id, tenant_id, property_id, status, rent_amount, rent_frequency, start_date, end_date, properties(title, address, city, postcode)"),
      supabase.from("properties").select("id,title,address,postcode,listing_purpose").order("title"),
    ]);
    if (t.error) toast.error(t.error.message);
    setRows((t.data as Tenant[]) ?? []);
    setTenancies((tn.data as any) ?? []);
    setProperties((p.data as Property[]) ?? []);
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

  const startNew = () => { setForm(empty); setActiveTab("details"); setOpen(true); };
  const startEdit = (t: Tenant) => {
    setForm({
      id: t.id,
      full_name: t.full_name,
      email: t.email ?? "",
      phone: t.phone ?? "",
      dob: t.dob ?? "",
      notes: t.notes ?? "",
      bio: (t.bio ?? {}) as TenantBio,
      tenant_compliance: (t.tenant_compliance ?? {}) as TenantComplianceMap,
    });
    setActiveTab("details");
    setOpen(true);
  };

  const save = async () => {
    if (!form.full_name.trim()) return toast.error("Name required");
    setSaving(true);
    const payload: any = {
      full_name: form.full_name.trim(),
      email: form.email || null,
      phone: form.phone || null,
      dob: form.dob || null,
      notes: form.notes || null,
      bio: form.bio ?? {},
      tenant_compliance: form.tenant_compliance ?? {},
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

  const assignToProperty = async (tenantId: string, propertyId: string) => {
    const tenant = rows.find((r) => r.id === tenantId);
    if (!tenant) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return toast.error("Sign in required");
    const today = new Date().toISOString().slice(0, 10);
    const { data: tenancy, error } = await supabase.from("tenancies").insert({
      property_id: propertyId,
      tenant_id: tenantId,
      tenant_name: tenant.full_name,
      tenant_email: tenant.email,
      tenant_phone: tenant.phone,
      start_date: today,
      rent_amount: 0,
      rent_frequency: "monthly",
      status: "draft",
      bio: tenant.bio ?? {},
      tenant_compliance: tenant.tenant_compliance ?? {},
    }).select("id").single();
    if (error) return toast.error(error.message);
    // Add to tenancy_tenants join table for multi-tenant support
    if (tenancy?.id) {
      await supabase.from("tenancy_tenants").insert({ tenancy_id: tenancy.id, tenant_id: tenantId, is_lead: true }).then(() => {});
    }
    toast.success("Tenant assigned to property (draft tenancy created)");
    void load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tenants"
        description="Tenant directory with bio, compliance and tenancy assignments."
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
            const hasBio = t.bio && Object.values(t.bio).some((v) => v);
            const hasCompliance = t.tenant_compliance && Object.values(t.tenant_compliance).some((v) => v);
            return (
              <Card key={t.id} className="border-0 shadow-card hover:shadow-md transition-shadow cursor-pointer" onClick={() => startEdit(t)}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{t.full_name}</div>
                      <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                        {t.email && <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> <span className="truncate">{t.email}</span></div>}
                        {t.phone && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {t.phone}</div>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" onClick={() => startEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {active.length > 0 ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 border" variant="outline">
                        <Home className="h-3 w-3 mr-1" /> {active.length} active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">No active tenancy</Badge>
                    )}
                    {hasBio && <Badge variant="outline"><UserCircle className="h-3 w-3 mr-1" /> Bio</Badge>}
                    {hasCompliance && <Badge variant="outline"><ShieldCheck className="h-3 w-3 mr-1" /> Compliance</Badge>}
                  </div>
                  {links.length > 0 && (
                    <div className="text-xs text-muted-foreground space-y-0.5 border-t pt-2">
                      {links.slice(0, 2).map((l) => (
                        <div key={l.id} className="truncate">
                          {l.properties?.title || [l.properties?.address, l.properties?.postcode].filter(Boolean).join(", ") || "Property"}
                          <span className="ml-1">· £{Number(l.rent_amount).toLocaleString()} {l.rent_frequency}</span>
                        </div>
                      ))}
                      {links.length > 2 && <div>+{links.length - 2} more</div>}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? form.full_name || "Edit tenant" : "Add tenant"}</DialogTitle></DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="details"><UserCircle className="h-3 w-3 mr-1" /> Details</TabsTrigger>
              <TabsTrigger value="bio"><FileText className="h-3 w-3 mr-1" /> Bio</TabsTrigger>
              <TabsTrigger value="compliance"><ShieldCheck className="h-3 w-3 mr-1" /> Compliance</TabsTrigger>
              {form.id && <TabsTrigger value="properties"><Home className="h-3 w-3 mr-1" /> Properties</TabsTrigger>}
            </TabsList>

            <TabsContent value="details" className="mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Label>Full name *</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div className="col-span-2"><Label>Date of birth</Label><Input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} /></div>
                <div className="col-span-2"><Label>Internal notes</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              </div>
            </TabsContent>

            <TabsContent value="bio" className="mt-4">
              <TenantBioEditor value={form.bio} onChange={(b) => setForm({ ...form, bio: b })} />
            </TabsContent>

            <TabsContent value="compliance" className="mt-4">
              <TenantComplianceEditor value={form.tenant_compliance} onChange={(c) => setForm({ ...form, tenant_compliance: c })} />
            </TabsContent>

            {form.id && (
              <TabsContent value="properties" className="mt-4">
                <TenantPropertiesPanel
                  tenantId={form.id}
                  tenancies={tenancyByTenant.get(form.id) ?? []}
                  properties={properties}
                  onAssign={(propId) => assignToProperty(form.id, propId)}
                />
              </TabsContent>
            )}
          </Tabs>

          <DialogFooter><Button onClick={save} disabled={saving || !form.full_name.trim()}>{saving ? "Saving…" : "Save"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TenantPropertiesPanel({
  tenantId, tenancies, properties, onAssign,
}: {
  tenantId: string;
  tenancies: TenancyLink[];
  properties: Property[];
  onAssign: (propertyId: string) => void;
}) {
  const [pick, setPick] = useState("");
  const linkedIds = new Set(tenancies.map((t) => t.property_id));
  const available = properties.filter((p) => p.listing_purpose !== "sale" && !linkedIds.has(p.id));

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">Multiple tenants can be assigned to the same property — assigning here creates a draft tenancy on that property with this tenant as the lead.</div>

      {tenancies.length > 0 ? (
        <div className="space-y-2">
          {tenancies.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium truncate">{t.properties?.title || [t.properties?.address, t.properties?.postcode].filter(Boolean).join(", ") || "Property"}</div>
                  <div className="text-xs text-muted-foreground">£{Number(t.rent_amount).toLocaleString()} {t.rent_frequency} · {t.start_date}{t.end_date ? ` → ${t.end_date}` : ""}</div>
                </div>
                <Badge variant="outline" className="capitalize">{t.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-md">Not yet assigned to a property.</div>
      )}

      <div className="border-t pt-3 space-y-2">
        <Label>Assign to a property</Label>
        <div className="flex gap-2">
          <Select value={pick} onValueChange={setPick}>
            <SelectTrigger className="flex-1"><SelectValue placeholder="Choose a property…" /></SelectTrigger>
            <SelectContent>
              {available.length === 0 && <div className="text-xs text-muted-foreground p-2">No more available rental properties.</div>}
              {available.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.title} {p.postcode ? `· ${p.postcode}` : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button disabled={!pick} onClick={() => { onAssign(pick); setPick(""); }}>
            <Link2 className="h-3.5 w-3.5 mr-1" /> Assign
          </Button>
        </div>
      </div>
    </div>
  );
}
