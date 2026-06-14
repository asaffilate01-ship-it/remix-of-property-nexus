import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Plus, Building2, Pencil, Trash2, BedDouble, Users, PoundSterling, Calendar, FileText, ShieldCheck, Sun } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { FeatureMultiSelect } from "@/components/properties/FeatureMultiSelect";
import { PostcodeAutocomplete } from "@/components/properties/PostcodeAutocomplete";
import { PostcodeLookup } from "@/components/properties/PostcodeLookup";
import { AddressLookup } from "@/components/address/AddressLookup";
import { PropertyScheduleGantt } from "@/components/properties/PropertyScheduleGantt";
import { PropertyDocsPanel } from "@/components/properties/PropertyDocsPanel";
import { PropertyCompliancePanel } from "@/components/properties/PropertyCompliancePanel";
import { StreetViewThumb } from "@/components/properties/StreetViewThumb";
import { TenantBioEditor, type TenantBio } from "@/components/tenancy/TenantBioEditor";
import { TenantComplianceEditor, type TenantComplianceMap } from "@/components/tenancy/TenantComplianceEditor";
import { TenantDocsMini } from "@/components/tenancy/TenantDocsMini";

export const Route = createFileRoute("/_authenticated/properties")({ component: PropertiesPage });

type Property = {
  id: string; title: string; address: string | null; city: string | null; postcode: string | null;
  property_type: string | null; bedrooms: number | null; bathrooms: number | null;
  is_hmo: boolean; hmo_licence_number: string | null; hmo_licence_expires: string | null;
  listing_purpose: "rent" | "sale" | "both" | "short_let"; notes: string | null;
  features: string[] | null;
  nightly_rate: number | null; min_stay_nights: number | null; cleaning_fee: number | null;
};
type Room = { id: string; property_id: string; name: string; room_number: string | null; rent_pcm: number | null; status: string; en_suite: boolean | null; bills_included: boolean | null; available_from: string | null };
type Tenancy = { id: string; property_id: string; room_id: string | null; tenant_name: string; tenant_email: string | null; tenant_phone: string | null; start_date: string; end_date: string | null; rent_amount: number; rent_frequency: "weekly" | "monthly"; deposit: number | null; status: string; bio?: TenantBio | null; tenant_compliance?: TenantComplianceMap | null };

const PURPOSES = [
  { v: "rent", l: "Long-let (Rent)" },
  { v: "sale", l: "For sale" },
  { v: "both", l: "Sale & rent" },
  { v: "short_let", l: "Short-let (Airbnb-style)" },
] as const;
// Loaded from DB via fetchPropertyTypes (see persistence.functions.ts) — kept as fallback list.
const PROPERTY_TYPES = ["house", "flat", "studio", "hmo", "bungalow", "commercial", "land"] as const;

const emptyProp = {
  id: "", title: "", address: "", city: "", postcode: "", property_type: "",
  bedrooms: "", bathrooms: "", is_hmo: false, hmo_licence_number: "", hmo_licence_expires: "",
  listing_purpose: "rent" as Property["listing_purpose"], notes: "",
  features: [] as string[],
  nightly_rate: "", min_stay_nights: "", cleaning_fee: "",
};
const emptyRoom = { id: "", name: "", room_number: "", rent_pcm: "", status: "vacant", en_suite: false, bills_included: true, available_from: "" };
const emptyTenancy = { id: "", room_id: "", tenant_name: "", tenant_email: "", tenant_phone: "", start_date: "", end_date: "", rent_amount: "", rent_frequency: "monthly" as "weekly" | "monthly", deposit: "", status: "draft", bio: {} as TenantBio, tenant_compliance: {} as TenantComplianceMap };

function PropertiesPage() {
  const [rows, setRows] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filterPurpose, setFilterPurpose] = useState<string>("all");
  const [filterHmo, setFilterHmo] = useState<string>("all");
  const [filterHoliday, setFilterHoliday] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyProp);
  const [active, setActive] = useState<Property | null>(null);
  const [ptypes, setPtypes] = useState<{ code: string; label: string; category: string }[]>([]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("properties").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as Property[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    void supabase.from("property_types").select("code,label,category").eq("active", true).order("sort_order").then(({ data }) => {
      if (data) setPtypes(data as any);
    });
  }, []);

  const filtered = useMemo(() => rows.filter((p) => {
    if (filterPurpose !== "all" && p.listing_purpose !== filterPurpose) return false;
    if (filterHmo === "hmo" && !p.is_hmo) return false;
    if (filterHmo === "std" && p.is_hmo) return false;
    if (filterHoliday === true && p.listing_purpose !== "short_let") return false;
    if (filterHoliday === false && p.listing_purpose === "short_let") return false;
    if (q) {
      const t = `${p.title} ${p.address ?? ""} ${p.city ?? ""} ${p.postcode ?? ""}`.toLowerCase();
      if (!t.includes(q.toLowerCase())) return false;
    }
    return true;
  }), [rows, q, filterPurpose, filterHmo, filterHoliday]);

  const startNew = () => { setForm(emptyProp); setOpen(true); };
  const startEdit = (p: Property) => {
    setForm({
      id: p.id, title: p.title, address: p.address ?? "", city: p.city ?? "", postcode: p.postcode ?? "",
      property_type: p.property_type ?? "", bedrooms: p.bedrooms?.toString() ?? "", bathrooms: p.bathrooms?.toString() ?? "",
      is_hmo: p.is_hmo, hmo_licence_number: p.hmo_licence_number ?? "", hmo_licence_expires: p.hmo_licence_expires ?? "",
      listing_purpose: p.listing_purpose, notes: p.notes ?? "",
      features: p.features ?? [],
      nightly_rate: p.nightly_rate?.toString() ?? "",
      min_stay_nights: p.min_stay_nights?.toString() ?? "",
      cleaning_fee: p.cleaning_fee?.toString() ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) return toast.error("Title required");
    const payload: any = {
      title: form.title.trim(),
      address: form.address || null,
      city: form.city || null,
      postcode: form.postcode || null,
      property_type: form.property_type || null,
      property_type_code: form.property_type || null,
      bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
      bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
      is_hmo: form.is_hmo,
      hmo_licence_number: form.hmo_licence_number || null,
      hmo_licence_expires: form.hmo_licence_expires || null,
      listing_purpose: form.listing_purpose,
      notes: form.notes || null,
      features: form.features ?? [],
      nightly_rate: form.listing_purpose === "short_let" && form.nightly_rate ? Number(form.nightly_rate) : null,
      min_stay_nights: form.listing_purpose === "short_let" && form.min_stay_nights ? Number(form.min_stay_nights) : null,
      cleaning_fee: form.listing_purpose === "short_let" && form.cleaning_fee ? Number(form.cleaning_fee) : null,
    };
    try {
      if (form.id) {
        const { error } = await supabase.from("properties").update(payload).eq("id", form.id);
        if (error) throw error;
        toast.success("Updated");
      } else {
        const { data: u, error: authErr } = await supabase.auth.getUser();
        if (authErr) throw authErr;
        if (!u.user) return toast.error("Sign in required");
        payload.owner_id = u.user.id;
        const { error } = await supabase.from("properties").insert(payload);
        if (error) throw error;
        toast.success("Property added");
      }
      setOpen(false); setForm(emptyProp); load();
    } catch (e: any) {
      console.error("[properties.save]", e);
      toast.error(e.message ?? "Failed to save property");
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("properties").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    setActive(null);
    load();
  };

  const allPostcodes = useMemo(() => rows.map((r) => r.postcode ?? "").filter(Boolean), [rows]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Properties"
        description="Your portfolio — units, rooms, tenancies, short-lets, schedule, docs & compliance"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setForm({ ...emptyProp }); setOpen(true); }} title="Add with just a title + postcode, fill rest later">
              <Plus className="mr-2 h-4 w-4" /> Quick add
            </Button>
            <Button onClick={startNew}><Plus className="mr-2 h-4 w-4" /> Add property</Button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex-1 min-w-[220px]">
          <PostcodeAutocomplete value={q} onChange={setQ} postcodes={allPostcodes} />
        </div>
        <Select value={filterPurpose} onValueChange={(v) => { setFilterPurpose(v); if (v !== "all" && v !== "short_let") setFilterHoliday(null); if (v === "short_let") setFilterHoliday(true); }}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All purposes</SelectItem>
            {PURPOSES.map((p) => <SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterHmo} onValueChange={setFilterHmo}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="hmo">HMO only</SelectItem>
            <SelectItem value="std">Standard only</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-1.5">
          <Button size="sm" variant={filterHoliday === true ? "default" : "outline"} onClick={() => setFilterHoliday(filterHoliday === true ? null : true)} className="gap-1">
            <Sun className="h-3.5 w-3.5" /> Holiday lets
          </Button>
          <Button size="sm" variant={filterHoliday === false ? "default" : "outline"} onClick={() => setFilterHoliday(filterHoliday === false ? null : false)}>
            Long-let / Sale
          </Button>
        </div>
        <div className="text-xs text-muted-foreground ml-auto">{filtered.length} of {rows.length}</div>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="aspect-[16/10] bg-muted" />
              <CardContent className="p-5 space-y-2">
                <div className="h-5 w-32 bg-muted rounded" />
                <div className="h-4 w-3/4 bg-muted rounded" />
                <div className="h-3 w-1/2 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent">
          <CardContent className="p-12 text-center text-muted-foreground">
            <Building2 className="mx-auto h-10 w-10 mb-3 opacity-40" />
            <div>{rows.length === 0 ? "No properties yet. Add your first one above." : "No matches for current filters."}</div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <Card key={p.id} className="border-0 shadow-card hover:shadow-md transition-shadow cursor-pointer overflow-hidden" onClick={() => setActive(p)}>
              <div className="aspect-[16/10] relative bg-muted">
                <StreetViewThumb address={p.address} city={p.city} postcode={p.postcode} className="absolute inset-0 h-full w-full" />
                <div className="absolute top-2 right-2 flex gap-1 flex-wrap justify-end">
                  {p.is_hmo && <Badge className="bg-accent text-accent-foreground border-0">HMO</Badge>}
                  {p.listing_purpose === "short_let" && <Badge className="bg-amber-500 text-white border-0"><Sun className="h-3 w-3 mr-1 inline" />Holiday let</Badge>}
                  <Badge variant="secondary" className="capitalize border-0 backdrop-blur bg-card/85">{p.listing_purpose.replace("_", " ")}</Badge>
                </div>
              </div>
              <CardContent className="p-5">
                <div className="font-semibold truncate">{p.title}</div>
                <div className="text-sm text-muted-foreground truncate">{[p.address, p.city, p.postcode].filter(Boolean).join(", ") || "No address"}</div>
                <div className="text-xs text-muted-foreground mt-2 flex gap-3 flex-wrap">
                  {p.bedrooms != null && <span>{p.bedrooms} bed</span>}
                  {p.bathrooms != null && <span>{p.bathrooms} bath</span>}
                  {p.property_type && <span className="capitalize">{p.property_type}</span>}
                  {p.listing_purpose === "short_let" && p.nightly_rate && <span>£{p.nightly_rate}/night</span>}
                </div>
                {p.features && p.features.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {p.features.slice(0, 4).map((f) => (
                      <Badge key={f} variant="secondary" className="text-[10px]">{f}</Badge>
                    ))}
                    {p.features.length > 4 && <Badge variant="secondary" className="text-[10px]">+{p.features.length - 4}</Badge>}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / edit dialog */}
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setForm(emptyProp); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? "Edit property" : "Add property"}</DialogTitle></DialogHeader>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2"><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. 12 Oak Avenue" /></div>
            <div className="sm:col-span-2">
              <AddressLookup
                onResolve={(a) => setForm({
                  ...form,
                  address: a.line1 || form.address,
                  city: a.city || form.city,
                  postcode: a.postcode || form.postcode,
                  title: form.title || a.line1 || a.formatted,
                })}
              />
            </div>
            <div className="sm:col-span-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            <PostcodeLookup
              postcode={form.postcode}
              onPostcode={(v) => setForm({ ...form, postcode: v })}
              onResolve={(info) => setForm({ ...form, postcode: form.postcode.toUpperCase(), city: form.city || info.city })}
            />
            <div><Label>Type</Label>
              <Select value={form.property_type} onValueChange={(v) => setForm({ ...form, property_type: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {(ptypes.length ? ptypes.map(t => ({ v: t.code, l: t.label })) : PROPERTY_TYPES.map(t => ({ v: t, l: t })))
                    .map((t) => <SelectItem key={t.v} value={t.v} className="capitalize">{t.l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Purpose</Label>
              <Select value={form.listing_purpose} onValueChange={(v: any) => setForm({ ...form, listing_purpose: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PURPOSES.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Bedrooms</Label><Input type="number" value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: e.target.value })} /></div>
            <div><Label>Bathrooms</Label><Input type="number" value={form.bathrooms} onChange={(e) => setForm({ ...form, bathrooms: e.target.value })} /></div>

            <div className="sm:col-span-2"><Label>Features</Label>
              <FeatureMultiSelect value={form.features} onChange={(v) => setForm({ ...form, features: v })} />
            </div>

            {form.listing_purpose === "short_let" && (
              <>
                <div className="sm:col-span-2 pt-2 border-t text-xs font-medium text-muted-foreground uppercase tracking-wide">Short-let / Airbnb settings</div>
                <div><Label>Nightly rate (£)</Label><Input type="number" value={form.nightly_rate} onChange={(e) => setForm({ ...form, nightly_rate: e.target.value })} /></div>
                <div><Label>Min stay (nights)</Label><Input type="number" value={form.min_stay_nights} onChange={(e) => setForm({ ...form, min_stay_nights: e.target.value })} /></div>
                <div><Label>Cleaning fee (£)</Label><Input type="number" value={form.cleaning_fee} onChange={(e) => setForm({ ...form, cleaning_fee: e.target.value })} /></div>
              </>
            )}

            <div className="sm:col-span-2 flex items-center gap-3 pt-2 border-t">
              <Switch checked={form.is_hmo} onCheckedChange={(v) => setForm({ ...form, is_hmo: v })} />
              <Label>HMO property</Label>
            </div>
            {form.is_hmo && (<>
              <div><Label>HMO licence #</Label><Input value={form.hmo_licence_number} onChange={(e) => setForm({ ...form, hmo_licence_number: e.target.value })} /></div>
              <div><Label>HMO licence expires</Label><Input type="date" value={form.hmo_licence_expires} onChange={(e) => setForm({ ...form, hmo_licence_expires: e.target.value })} /></div>
            </>)}
            <div className="sm:col-span-2"><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={save} disabled={!form.title.trim()}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail drawer */}
      <Sheet open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
          {active && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2 flex-wrap">
                  {active.title}
                  {active.is_hmo && <Badge className="bg-accent text-accent-foreground">HMO</Badge>}
                  <Badge variant="outline" className="capitalize">{active.listing_purpose.replace("_", " ")}</Badge>
                </SheetTitle>
                <div className="text-sm text-muted-foreground">{[active.address, active.city, active.postcode].filter(Boolean).join(", ")}</div>
              </SheetHeader>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" onClick={() => { setActive(null); startEdit(active); }}><Pencil className="h-3 w-3 mr-1" /> Edit</Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button variant="outline" size="sm" className="text-destructive"><Trash2 className="h-3 w-3 mr-1" /> Delete</Button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this property?</AlertDialogTitle>
                      <AlertDialogDescription>This removes rooms, tenancies and rent schedule. This cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => remove(active.id)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              {active.features && active.features.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {active.features.map((f) => <Badge key={f} variant="secondary" className="text-[10px]">{f}</Badge>)}
                </div>
              )}
              <Tabs defaultValue="rooms" className="mt-6">
                <TabsList className="flex-wrap h-auto">
                  <TabsTrigger value="rooms"><BedDouble className="h-3 w-3 mr-1" /> Rooms</TabsTrigger>
                  <TabsTrigger value="tenancies"><Users className="h-3 w-3 mr-1" /> Tenants</TabsTrigger>
                  <TabsTrigger value="rent"><PoundSterling className="h-3 w-3 mr-1" /> Rent</TabsTrigger>
                  <TabsTrigger value="schedule"><Calendar className="h-3 w-3 mr-1" /> Schedule</TabsTrigger>
                  <TabsTrigger value="docs"><FileText className="h-3 w-3 mr-1" /> Docs</TabsTrigger>
                  <TabsTrigger value="compliance"><ShieldCheck className="h-3 w-3 mr-1" /> Compliance</TabsTrigger>
                </TabsList>
                <TabsContent value="rooms" className="mt-4"><RoomsPanel propertyId={active.id} isHmo={active.is_hmo} /></TabsContent>
                <TabsContent value="tenancies" className="mt-4"><TenanciesPanel propertyId={active.id} isHmo={active.is_hmo} /></TabsContent>
                <TabsContent value="rent" className="mt-4"><RentPanel propertyId={active.id} /></TabsContent>
                <TabsContent value="schedule" className="mt-4"><PropertyScheduleGantt propertyId={active.id} /></TabsContent>
                <TabsContent value="docs" className="mt-4"><PropertyDocsPanel propertyId={active.id} /></TabsContent>
                <TabsContent value="compliance" className="mt-4"><PropertyCompliancePanel propertyId={active.id} /></TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ---------- Rooms ----------
function RoomsPanel({ propertyId, isHmo }: { propertyId: string; isHmo: boolean }) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [editing, setEditing] = useState<typeof emptyRoom | null>(null);

  const load = async () => {
    const { data } = await supabase.from("rooms").select("*").eq("property_id", propertyId).order("room_number", { nullsFirst: false }).order("name");
    setRooms((data as Room[]) ?? []);
  };
  useEffect(() => { load(); }, [propertyId]);

  const save = async () => {
    if (!editing || !editing.name.trim()) return toast.error("Name required");
    const payload: any = {
      property_id: propertyId,
      name: editing.name,
      room_number: editing.room_number || null,
      status: editing.status,
      rent_pcm: editing.rent_pcm ? Number(editing.rent_pcm) : null,
      en_suite: editing.en_suite,
      bills_included: editing.bills_included,
      available_from: editing.available_from || null,
    };
    const { error } = editing.id
      ? await supabase.from("rooms").update(payload).eq("id", editing.id)
      : await supabase.from("rooms").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved"); setEditing(null); load();
  };
  const del = async (id: string) => {
    if (!confirm("Delete this room?")) return;
    const { error } = await supabase.from("rooms").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); load();
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">{rooms.length} rooms {isHmo && "• HMO"}</div>
        <Button size="sm" onClick={() => setEditing(emptyRoom)}><Plus className="h-3 w-3 mr-1" /> Add room</Button>
      </div>
      {rooms.map((r) => (
        <Card key={r.id}><CardContent className="p-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="font-medium flex items-center gap-2">
              {r.room_number && <Badge variant="outline" className="text-[10px]">#{r.room_number}</Badge>}
              <span className="truncate">{r.name}</span>
              <Badge variant="outline" className="capitalize text-[10px]">{r.status}</Badge>
            </div>
            <div className="text-xs text-muted-foreground">{r.rent_pcm ? `£${Number(r.rent_pcm).toLocaleString()} pcm` : "no rent set"} {r.en_suite && "• en-suite"} {r.bills_included && "• bills inc."}</div>
          </div>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" onClick={() => setEditing({ id: r.id, name: r.name, room_number: r.room_number ?? "", rent_pcm: r.rent_pcm?.toString() ?? "", status: r.status, en_suite: !!r.en_suite, bills_included: !!r.bills_included, available_from: r.available_from ?? "" })}><Pencil className="h-3 w-3" /></Button>
            <Button size="icon" variant="ghost" className="text-destructive" onClick={() => del(r.id)}><Trash2 className="h-3 w-3" /></Button>
          </div>
        </CardContent></Card>
      ))}
      {rooms.length === 0 && <div className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-md">No rooms yet{isHmo && " — HMOs typically need one room per let"}</div>}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Edit room" : "Add room"}</DialogTitle></DialogHeader>
          {editing && (<div className="grid grid-cols-2 gap-3">
            {isHmo && (
              <div><Label>Room number</Label><Input value={editing.room_number} onChange={(e) => setEditing({ ...editing, room_number: e.target.value })} placeholder="e.g. 1, 2A" /></div>
            )}
            <div className={isHmo ? "" : "col-span-2"}><Label>Name *</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder={isHmo ? "Master bedroom" : "Whole property"} /></div>
            <div><Label>Rent £ pcm</Label><Input type="number" value={editing.rent_pcm} onChange={(e) => setEditing({ ...editing, rent_pcm: e.target.value })} /></div>
            <div><Label>Status</Label>
              <Select value={editing.status} onValueChange={(v) => setEditing({ ...editing, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["vacant", "reserved", "let", "off_market"].map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Available from</Label><Input type="date" value={editing.available_from} onChange={(e) => setEditing({ ...editing, available_from: e.target.value })} /></div>
            <div className="flex items-center gap-2 pt-6"><Switch checked={editing.en_suite} onCheckedChange={(v) => setEditing({ ...editing, en_suite: v })} /><Label>En-suite</Label></div>
            <div className="flex items-center gap-2 pt-6"><Switch checked={editing.bills_included} onCheckedChange={(v) => setEditing({ ...editing, bills_included: v })} /><Label>Bills inc.</Label></div>
          </div>)}
          <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------- Tenancies ----------
function TenanciesPanel({ propertyId, isHmo }: { propertyId: string; isHmo: boolean }) {
  const [tenancies, setTenancies] = useState<Tenancy[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [editing, setEditing] = useState<(typeof emptyTenancy & { tenant_id?: string }) | null>(null);
  const [tenantsList, setTenantsList] = useState<{ id: string; full_name: string; email: string | null; phone: string | null }[]>([]);

  const load = async () => {
    const [t, r, tl] = await Promise.all([
      supabase.from("tenancies").select("*").eq("property_id", propertyId).order("start_date", { ascending: false }),
      supabase.from("rooms").select("*").eq("property_id", propertyId),
      supabase.from("tenants").select("id,full_name,email,phone").order("full_name"),
    ]);
    setTenancies((t.data as Tenancy[]) ?? []);
    setRooms((r.data as Room[]) ?? []);
    setTenantsList((tl.data as any) ?? []);
  };
  useEffect(() => { load(); }, [propertyId]);

  const pickExisting = (id: string) => {
    if (!editing) return;
    if (id === "__new__") { setEditing({ ...editing, tenant_id: "", tenant_name: "", tenant_email: "", tenant_phone: "" }); return; }
    const t = tenantsList.find((x) => x.id === id);
    if (!t) return;
    setEditing({ ...editing, tenant_id: id, tenant_name: t.full_name, tenant_email: t.email ?? "", tenant_phone: t.phone ?? "" });
  };

  const save = async () => {
    if (!editing || !editing.tenant_name.trim() || !editing.start_date || !editing.rent_amount) return toast.error("Name, start date and rent required");
    if (isHmo && rooms.length > 0 && !editing.room_id) return toast.error("Pick a room for this HMO tenant");

    let tenantId = editing.tenant_id || null;
    if (!editing.id && !tenantId) {
      // Create/find tenant record so the tenant appears in the Tenants directory
      const { data: existing } = await supabase
        .from("tenants").select("id")
        .ilike("full_name", editing.tenant_name.trim())
        .limit(1).maybeSingle();
      if (existing?.id) {
        tenantId = existing.id;
      } else {
        const { data: newT } = await supabase.from("tenants").insert({
          full_name: editing.tenant_name.trim(),
          email: editing.tenant_email || null,
          phone: editing.tenant_phone || null,
        }).select("id").single();
        tenantId = newT?.id ?? null;
      }
    }

    const payload: any = {
      property_id: propertyId,
      room_id: editing.room_id || null,
      tenant_id: tenantId,
      tenant_name: editing.tenant_name,
      tenant_email: editing.tenant_email || null,
      tenant_phone: editing.tenant_phone || null,
      start_date: editing.start_date,
      end_date: editing.end_date || null,
      rent_amount: Number(editing.rent_amount),
      rent_frequency: editing.rent_frequency,
      deposit: editing.deposit ? Number(editing.deposit) : 0,
      status: editing.status,
      bio: editing.bio ?? {},
      tenant_compliance: editing.tenant_compliance ?? {},
    };
    const { error } = editing.id
      ? await supabase.from("tenancies").update(payload).eq("id", editing.id)
      : await supabase.from("tenancies").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Tenant assigned"); setEditing(null); load();
  };
  const del = async (id: string) => {
    if (!confirm("Delete this tenancy?")) return;
    const { error } = await supabase.from("tenancies").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); load();
  };

  const generate = async (t: Tenancy) => {
    const start = new Date(t.start_date);
    const stepDays = t.rent_frequency === "weekly" ? 7 : 0;
    const rows: any[] = [];
    const count = t.rent_frequency === "weekly" ? 52 : 12;
    for (let i = 0; i < count; i++) {
      const s = new Date(start);
      if (stepDays) s.setDate(s.getDate() + i * stepDays);
      else s.setMonth(s.getMonth() + i);
      const e = new Date(s);
      if (stepDays) e.setDate(e.getDate() + 6);
      else { e.setMonth(e.getMonth() + 1); e.setDate(e.getDate() - 1); }
      rows.push({
        tenancy_id: t.id,
        period_start: s.toISOString().slice(0, 10),
        period_end: e.toISOString().slice(0, 10),
        due_date: s.toISOString().slice(0, 10),
        amount: t.rent_amount,
        status: "due",
      });
    }
    const { error } = await supabase.from("rent_schedule").insert(rows);
    if (error) return toast.error(error.message);
    toast.success(`Generated ${rows.length} rent periods`);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">{tenancies.length} tenants</div>
        <Button size="sm" onClick={() => setEditing(emptyTenancy)}><Plus className="h-3 w-3 mr-1" /> Add tenant</Button>
      </div>
      {tenancies.map((t) => (
        <Card key={t.id}><CardContent className="p-3 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <div className="font-medium flex items-center gap-2"><span className="truncate">{t.tenant_name}</span><Badge variant="outline" className="capitalize text-[10px]">{t.status}</Badge></div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={() => generate(t)} title="Generate rent schedule"><PoundSterling className="h-3 w-3" /></Button>
              <Button size="icon" variant="ghost" onClick={() => setEditing({ id: t.id, room_id: t.room_id ?? "", tenant_name: t.tenant_name, tenant_email: t.tenant_email ?? "", tenant_phone: t.tenant_phone ?? "", start_date: t.start_date, end_date: t.end_date ?? "", rent_amount: t.rent_amount.toString(), rent_frequency: t.rent_frequency, deposit: t.deposit?.toString() ?? "", status: t.status, bio: (t.bio ?? {}) as TenantBio, tenant_compliance: (t.tenant_compliance ?? {}) as TenantComplianceMap })}><Pencil className="h-3 w-3" /></Button>
              <Button size="icon" variant="ghost" className="text-destructive" onClick={() => del(t.id)}><Trash2 className="h-3 w-3" /></Button>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">£{Number(t.rent_amount).toLocaleString()} {t.rent_frequency} • {t.start_date}{t.end_date ? ` → ${t.end_date}` : ""} {t.room_id && `• ${rooms.find((r) => r.id === t.room_id)?.name ?? ""}`}</div>
        </CardContent></Card>
      ))}
      {tenancies.length === 0 && <div className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-md">No tenants yet — click "Add tenant" above</div>}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit tenant" : "Add tenant"}</DialogTitle></DialogHeader>
          {editing && (<div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Tenant name *</Label><Input value={editing.tenant_name} onChange={(e) => setEditing({ ...editing, tenant_name: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" value={editing.tenant_email} onChange={(e) => setEditing({ ...editing, tenant_email: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={editing.tenant_phone} onChange={(e) => setEditing({ ...editing, tenant_phone: e.target.value })} /></div>
              {rooms.length > 0 && (
                <div className="col-span-2"><Label>Room {isHmo && "*"}</Label>
                  <Select value={editing.room_id} onValueChange={(v) => setEditing({ ...editing, room_id: v })}>
                    <SelectTrigger><SelectValue placeholder={isHmo ? "Pick a room" : "Whole property"} /></SelectTrigger>
                    <SelectContent>{rooms.map((r) => <SelectItem key={r.id} value={r.id}>{r.room_number ? `#${r.room_number} — ${r.name}` : r.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <div><Label>Start date *</Label><Input type="date" value={editing.start_date} onChange={(e) => setEditing({ ...editing, start_date: e.target.value })} /></div>
              <div><Label>End date</Label><Input type="date" value={editing.end_date} onChange={(e) => setEditing({ ...editing, end_date: e.target.value })} /></div>
              <div><Label>Rent £ *</Label><Input type="number" value={editing.rent_amount} onChange={(e) => setEditing({ ...editing, rent_amount: e.target.value })} /></div>
              <div><Label>Frequency</Label>
                <Select value={editing.rent_frequency} onValueChange={(v: any) => setEditing({ ...editing, rent_frequency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="weekly">Weekly</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Deposit £</Label><Input type="number" value={editing.deposit} onChange={(e) => setEditing({ ...editing, deposit: e.target.value })} /></div>
              <div><Label>Status</Label>
                <Select value={editing.status} onValueChange={(v) => setEditing({ ...editing, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["draft", "active", "notice", "ended"].map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <TenantBioEditor value={editing.bio} onChange={(bio) => setEditing({ ...editing, bio })} />
            <TenantComplianceEditor value={editing.tenant_compliance} onChange={(tc) => setEditing({ ...editing, tenant_compliance: tc })} />
            {editing.id && <TenantDocsMini tenancyId={editing.id} tenantName={editing.tenant_name || "tenant"} />}
            {!editing.id && <p className="text-xs text-muted-foreground border border-dashed rounded p-3">Save the tenant first, then re-open to upload documents (Right-to-Rent, passport, references, signed AST).</p>}
          </div>)}
          <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------- Rent schedule ----------
function RentPanel({ propertyId }: { propertyId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: ts } = await supabase.from("tenancies").select("id, tenant_name").eq("property_id", propertyId);
    const ids = (ts ?? []).map((t) => t.id);
    if (!ids.length) { setRows([]); setLoading(false); return; }
    const { data } = await supabase.from("rent_schedule").select("*").in("tenancy_id", ids).order("due_date", { ascending: true });
    const nameMap = Object.fromEntries((ts ?? []).map((t) => [t.id, t.tenant_name]));
    setRows((data ?? []).map((r) => ({ ...r, tenant_name: nameMap[r.tenancy_id] })));
    setLoading(false);
  };
  useEffect(() => { load(); }, [propertyId]);

  const markPaid = async (r: any) => {
    const { error } = await supabase.from("rent_schedule").update({ status: "paid", paid_amount: r.amount, paid_at: new Date().toISOString() }).eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Marked paid"); load();
  };
  const del = async (id: string) => {
    const { error } = await supabase.from("rent_schedule").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  if (loading) return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-12 bg-muted rounded animate-pulse" />
      ))}
    </div>
  );
  if (!rows.length) return <div className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-md">No rent schedule. Use the £ button on a tenancy to generate one.</div>;

  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="space-y-2">
      {rows.map((r) => {
        const overdue = r.status !== "paid" && r.due_date < today;
        return (
          <div key={r.id} className="flex items-center justify-between gap-2 p-2 rounded-md border bg-card text-sm">
            <div className="min-w-0">
              <div className="font-medium truncate">{r.tenant_name} • £{Number(r.amount).toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Due {r.due_date} {overdue && <span className="text-red-600 font-medium">overdue</span>}</div>
            </div>
            <div className="flex gap-1 items-center">
              <Badge variant={r.status === "paid" ? "default" : "outline"} className="capitalize text-[10px]">{r.status}</Badge>
              {r.status !== "paid" && <Button size="sm" variant="outline" onClick={() => markPaid(r)}>Mark paid</Button>}
              <Button size="icon" variant="ghost" className="text-destructive" onClick={() => del(r.id)}><Trash2 className="h-3 w-3" /></Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
