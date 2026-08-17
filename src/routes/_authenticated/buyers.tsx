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
import { Plus, Pencil, Trash2, Users, Mail, Phone, FileSignature, Home, Link2 } from "lucide-react";
import { toast } from "sonner";
import { safeExternalUrl } from "@/lib/url-safety";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/buyers")({
  head: () => ({ meta: [{ title: "Buyers — Gabley" }] }),
  component: BuyersPage,
});

type Buyer = {
  id: string; agency_id: string | null;
  full_name: string | null; email: string | null; phone: string | null;
  budget_min: number | null; budget_max: number | null; bedrooms_min: number | null;
  finance_status: string | null; chain_status: string | null; notes: string | null;
  areas: string[] | null; active: boolean;
};

type SaleProperty = { id: string; title: string; address: string | null; postcode: string | null; price: number | null; listing_purpose: string };

type Interest = {
  id: string; buyer_id: string; property_id: string;
  status: string; mou_signed_on: string | null; mou_amount: number | null;
  mou_doc_url: string | null; notes: string | null;
  properties?: { title: string | null; address: string | null; postcode: string | null } | null;
};

const STATUSES = ["interested", "viewing_booked", "offer_made", "mou_signed", "exchanged", "completed", "withdrawn"] as const;

const empty = {
  id: "",
  full_name: "", email: "", phone: "",
  budget_min: "", budget_max: "", bedrooms_min: "",
  finance_status: "unknown", chain_status: "unknown",
  areas: "", notes: "",
};

function BuyersPage() {
  const [rows, setRows] = useState<Buyer[]>([]);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [properties, setProperties] = useState<SaleProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [tab, setTab] = useState("details");

  const load = async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (u.user) {
      const { data: ag } = await supabase.from("agencies").select("id").eq("owner_id", u.user.id).maybeSingle();
      setAgencyId(ag?.id ?? null);
    }
    const [b, i, p] = await Promise.all([
      supabase.from("buyer_profiles").select("*").eq("active", true).order("created_at", { ascending: false }),
      supabase.from("buyer_property_interests").select("*, properties(title, address, postcode)").order("created_at", { ascending: false }),
      supabase.from("properties").select("id,title,address,postcode,price,listing_purpose").in("listing_purpose", ["sale", "both"]).order("title"),
    ]);
    if (b.error) toast.error(b.error.message);
    setRows((b.data as Buyer[]) ?? []);
    setInterests((i.data as Interest[]) ?? []);
    setProperties((p.data as SaleProperty[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const interestsByBuyer = useMemo(() => {
    const m = new Map<string, Interest[]>();
    for (const i of interests) {
      const arr = m.get(i.buyer_id) ?? [];
      arr.push(i);
      m.set(i.buyer_id, arr);
    }
    return m;
  }, [interests]);

  const startNew = () => { setForm(empty); setTab("details"); setOpen(true); };
  const startEdit = (b: Buyer) => {
    setForm({
      id: b.id,
      full_name: b.full_name ?? "",
      email: b.email ?? "", phone: b.phone ?? "",
      budget_min: b.budget_min?.toString() ?? "",
      budget_max: b.budget_max?.toString() ?? "",
      bedrooms_min: b.bedrooms_min?.toString() ?? "",
      finance_status: b.finance_status ?? "unknown",
      chain_status: b.chain_status ?? "unknown",
      areas: (b.areas ?? []).join(", "),
      notes: b.notes ?? "",
    });
    setTab("details");
    setOpen(true);
  };

  const save = async () => {
    if (!form.full_name.trim()) return toast.error("Name required");
    setSaving(true);
    const payload: any = {
      agency_id: agencyId,
      full_name: form.full_name.trim(),
      email: form.email || null, phone: form.phone || null,
      budget_min: form.budget_min ? Number(form.budget_min) : null,
      budget_max: form.budget_max ? Number(form.budget_max) : null,
      bedrooms_min: form.bedrooms_min ? Number(form.bedrooms_min) : null,
      finance_status: form.finance_status || null,
      chain_status: form.chain_status || null,
      areas: form.areas ? form.areas.split(",").map((s) => s.trim()).filter(Boolean) : [],
      notes: form.notes || null,
    };
    let savedId = form.id;
    if (form.id) {
      const { error } = await supabase.from("buyer_profiles").update(payload).eq("id", form.id);
      if (error) { setSaving(false); return toast.error(error.message); }
    } else {
      const { data, error } = await supabase.from("buyer_profiles").insert(payload).select("id").single();
      if (error) { setSaving(false); return toast.error(error.message); }
      savedId = data!.id;
      setForm((f) => ({ ...f, id: savedId }));
    }
    setSaving(false);
    toast.success(form.id ? "Updated" : "Buyer added");
    await load();
    if (!form.id) setTab("properties");
  };

  const remove = async (id: string) => {
    if (!confirm("Archive this buyer?")) return;
    const { error } = await supabase.from("buyer_profiles").update({ active: false }).eq("id", id);
    if (error) return toast.error(error.message);
    void load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Buyers"
        description="Registered buyers — budgets, search criteria, and Memorandum of Understanding on for-sale properties."
        actions={<Button onClick={startNew}><Plus className="mr-2 h-4 w-4" /> Add buyer</Button>}
      />

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <Card key={i} className="animate-pulse"><CardContent className="p-5 h-32" /></Card>)}</div>
      ) : rows.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent"><CardContent className="p-12 text-center text-muted-foreground"><Users className="mx-auto h-10 w-10 mb-3 opacity-40" /><div>No buyers yet.</div></CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((b) => {
            const myInterests = interestsByBuyer.get(b.id) ?? [];
            const withMou = myInterests.filter((i) => i.status === "mou_signed" || i.status === "exchanged" || i.status === "completed");
            return (
              <Card key={b.id} className="border-0 shadow-card hover:shadow-md transition-shadow cursor-pointer" onClick={() => startEdit(b)}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold truncate">{b.full_name}</div>
                    <Button size="icon" variant="ghost" className="text-destructive h-7 w-7" onClick={(e) => { e.stopPropagation(); remove(b.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {b.email && <div className="flex items-center gap-1.5 truncate"><Mail className="h-3 w-3 shrink-0" />{b.email}</div>}
                    {b.phone && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{b.phone}</div>}
                  </div>
                  {(b.budget_min || b.budget_max) ? <div className="text-sm font-medium">£{Number(b.budget_min ?? 0).toLocaleString()} – £{Number(b.budget_max ?? 0).toLocaleString()}</div> : null}
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    {b.bedrooms_min ? <Badge variant="secondary" className="font-normal">{b.bedrooms_min}+ bed</Badge> : null}
                    {b.finance_status && b.finance_status !== "unknown" && <Badge variant="secondary" className="font-normal">{b.finance_status}</Badge>}
                    {b.chain_status && b.chain_status !== "unknown" && <Badge variant="secondary" className="font-normal">{b.chain_status}</Badge>}
                    {b.areas?.slice(0, 2).map((a) => <Badge key={a} variant="outline" className="font-normal">{a}</Badge>)}
                  </div>
                  {myInterests.length > 0 && (
                    <div className="border-t pt-2 text-xs space-y-0.5">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Home className="h-3 w-3" /> {myInterests.length} linked propert{myInterests.length === 1 ? "y" : "ies"}
                        {withMou.length > 0 && <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 border ml-1" variant="outline"><FileSignature className="h-3 w-3 mr-1" />{withMou.length} MOU</Badge>}
                      </div>
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
          <DialogHeader><DialogTitle>{form.id ? form.full_name || "Edit buyer" : "Add buyer"}</DialogTitle></DialogHeader>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              {form.id && <TabsTrigger value="properties"><Home className="h-3 w-3 mr-1" /> Properties & MOU</TabsTrigger>}
            </TabsList>

            <TabsContent value="details" className="mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Label>Full name *</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div><Label>Budget min (£)</Label><Input type="number" value={form.budget_min} onChange={(e) => setForm({ ...form, budget_min: e.target.value })} /></div>
                <div><Label>Budget max (£)</Label><Input type="number" value={form.budget_max} onChange={(e) => setForm({ ...form, budget_max: e.target.value })} /></div>
                <div><Label>Min bedrooms</Label><Input type="number" value={form.bedrooms_min} onChange={(e) => setForm({ ...form, bedrooms_min: e.target.value })} /></div>
                <div><Label>Finance status</Label>
                  <Select value={form.finance_status} onValueChange={(v) => setForm({ ...form, finance_status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unknown">Unknown</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="mortgage">Mortgage</SelectItem>
                      <SelectItem value="aip">AIP in place</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Chain status</Label>
                  <Select value={form.chain_status} onValueChange={(v) => setForm({ ...form, chain_status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unknown">Unknown</SelectItem>
                      <SelectItem value="no-chain">No chain</SelectItem>
                      <SelectItem value="in-chain">In chain</SelectItem>
                      <SelectItem value="first-time-buyer">First-time buyer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2"><Label>Areas (comma separated)</Label><Input value={form.areas} onChange={(e) => setForm({ ...form, areas: e.target.value })} placeholder="London, Manchester" /></div>
                <div className="col-span-2"><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              </div>
            </TabsContent>

            {form.id && (
              <TabsContent value="properties" className="mt-4">
                <BuyerInterestsPanel
                  buyerId={form.id}
                  agencyId={agencyId}
                  interests={interestsByBuyer.get(form.id) ?? []}
                  properties={properties}
                  reload={load}
                />
              </TabsContent>
            )}
          </Tabs>

          <DialogFooter><Button onClick={save} disabled={saving || !form.full_name.trim()}>{saving ? "Saving…" : form.id ? "Save" : "Save & link properties"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BuyerInterestsPanel({
  buyerId, agencyId, interests, properties, reload,
}: {
  buyerId: string;
  agencyId: string | null;
  interests: Interest[];
  properties: SaleProperty[];
  reload: () => Promise<void>;
}) {
  const [pick, setPick] = useState("");
  const [editing, setEditing] = useState<Interest | null>(null);

  const link = async () => {
    if (!pick) return;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("buyer_property_interests").insert({
      buyer_id: buyerId,
      property_id: pick,
      agency_id: agencyId,
      status: "interested",
      created_by: u.user?.id ?? null,
    });
    if (error) return toast.error(error.message);
    toast.success("Linked");
    setPick("");
    await reload();
  };

  const update = async (id: string, patch: { status?: string; mou_signed_on?: string | null; mou_amount?: number | null; mou_doc_url?: string | null; notes?: string | null }) => {
    const { error } = await supabase.from("buyer_property_interests").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    await reload();
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this property link?")) return;
    const { error } = await supabase.from("buyer_property_interests").delete().eq("id", id);
    if (error) return toast.error(error.message);
    await reload();
  };

  const linkedIds = new Set(interests.map((i) => i.property_id));
  const available = properties.filter((p) => !linkedIds.has(p.id));

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">Link this buyer to one or more for-sale properties. Track MOU (Memorandum of Understanding) date, amount, and document.</div>

      <div className="space-y-2">
        {interests.map((i) => (
          <Card key={i.id}>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium truncate">{i.properties?.title || [i.properties?.address, i.properties?.postcode].filter(Boolean).join(", ") || "Property"}</div>
                </div>
                <div className="flex items-center gap-1">
                  <Select value={i.status} onValueChange={(v) => update(i.id, { status: v })}>
                    <SelectTrigger className="h-7 text-xs w-[150px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(i)}><Pencil className="h-3 w-3" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(i.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
              {(i.mou_signed_on || i.mou_amount || i.mou_doc_url) && (
                <div className="text-xs text-muted-foreground flex flex-wrap gap-2 items-center">
                  <FileSignature className="h-3 w-3" />
                  {i.mou_signed_on && <span>Signed {i.mou_signed_on}</span>}
                  {i.mou_amount && <span>· £{Number(i.mou_amount).toLocaleString()}</span>}
                  {safeExternalUrl(i.mou_doc_url) && <a href={safeExternalUrl(i.mou_doc_url)!} target="_blank" rel="noreferrer" className="text-primary underline">View MOU</a>}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {interests.length === 0 && <div className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-md">No properties linked yet.</div>}
      </div>

      <div className="border-t pt-3 space-y-2">
        <Label>Link a for-sale property</Label>
        <div className="flex gap-2">
          <Select value={pick} onValueChange={setPick}>
            <SelectTrigger className="flex-1"><SelectValue placeholder="Choose a property…" /></SelectTrigger>
            <SelectContent>
              {available.length === 0 && <div className="text-xs text-muted-foreground p-2">No more for-sale properties available. Add one with purpose "For sale" on the Properties page.</div>}
              {available.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.title} {p.postcode ? `· ${p.postcode}` : ""}{p.price ? ` · £${Number(p.price).toLocaleString()}` : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button disabled={!pick} onClick={link}><Link2 className="h-3.5 w-3.5 mr-1" /> Link</Button>
        </div>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>MOU & notes</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-3">
              <div><Label>MOU signed on</Label><Input type="date" value={editing.mou_signed_on ?? ""} onChange={(e) => setEditing({ ...editing, mou_signed_on: e.target.value })} /></div>
              <div><Label>MOU amount (£)</Label><Input type="number" value={editing.mou_amount ?? ""} onChange={(e) => setEditing({ ...editing, mou_amount: e.target.value ? Number(e.target.value) : null })} /></div>
              <div className="col-span-2"><Label>MOU document URL</Label><Input value={editing.mou_doc_url ?? ""} onChange={(e) => setEditing({ ...editing, mou_doc_url: e.target.value })} placeholder="https://…" /></div>
              <div className="col-span-2"><Label>Notes</Label><Textarea rows={3} value={editing.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={async () => {
              if (!editing) return;
              if (editing.mou_doc_url && !safeExternalUrl(editing.mou_doc_url)) {
                toast.error("Use a valid HTTP(S) document URL");
                return;
              }
              await update(editing.id, {
                mou_signed_on: editing.mou_signed_on || null,
                mou_amount: editing.mou_amount ?? null,
                mou_doc_url: editing.mou_doc_url || null,
                notes: editing.notes || null,
              });
              setEditing(null);
            }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
