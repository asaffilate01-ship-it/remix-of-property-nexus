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
import { Plus, Pencil, Trash2, Contact as ContactIcon, Mail, Phone, Star, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { useServerFn } from "@tanstack/react-start";
import { linkContactToUser } from "@/lib/contacts.functions";


export const Route = createFileRoute("/_authenticated/contacts")({
  head: () => ({ meta: [{ title: "Contacts — Estately" }] }),
  component: ContactsPage,
});

type Contact = {
  id: string; contact_type: string; full_name: string; company_name: string | null;
  email: string | null; phone: string | null; address: string | null; postcode: string | null;
  notes: string | null; rating: number | null; hourly_rate: number | null; is_preferred: boolean; is_active: boolean;
};

const TYPES = ["plumber","electrician","gas_engineer","builder","roofer","painter","handyman","cleaner","gardener","locksmith","epc_assessor","inventory_clerk","solicitor","conveyancer","referencing","insurance","utilities","council","other"] as const;
type CType = typeof TYPES[number];
const empty = { id: "", contact_type: "plumber" as CType, full_name: "", company_name: "", email: "", phone: "", address: "", postcode: "", notes: "", rating: 0, hourly_rate: 0, is_preferred: false };

function ContactsPage() {
  const [rows, setRows] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [linkEmail, setLinkEmail] = useState("");
  const [linkedUserId, setLinkedUserId] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const linkFn = useServerFn(linkContactToUser);

  const linkAccess = async (email: string | null) => {
    if (!form.id) return;
    if (email !== null && !email.trim()) return toast.error("Enter the account email");
    setLinking(true);
    try {
      const res = await linkFn({ data: { contactId: form.id, email } });
      setLinkedUserId(res.linked ? res.userId : null);
      if (!res.linked) setLinkEmail("");
      toast.success(res.linked ? "Portal access granted" : "Portal access revoked");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update access");
    } finally {
      setLinking(false);
    }
  };



  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("contacts").select("*").eq("is_active", true).order("full_name");
    if (error) toast.error(error.message);
    setRows((data as any) ?? []); setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    let r = rows;
    if (type !== "all") r = r.filter((c) => c.contact_type === type);
    if (q) { const s = q.toLowerCase(); r = r.filter((c) => c.full_name.toLowerCase().includes(s) || (c.company_name ?? "").toLowerCase().includes(s) || (c.email ?? "").toLowerCase().includes(s)); }
    return r;
  }, [rows, q, type]);

  const save = async () => {
    if (!form.full_name.trim()) return toast.error("Name required");
    setSaving(true);
    const payload: any = {
      contact_type: form.contact_type, full_name: form.full_name.trim(),
      company_name: form.company_name || null, email: form.email || null, phone: form.phone || null,
      address: form.address || null, postcode: form.postcode || null, notes: form.notes || null,
      rating: form.rating || null, hourly_rate: form.hourly_rate || null, is_preferred: form.is_preferred,
    };
    const { error } = form.id
      ? await supabase.from("contacts").update(payload).eq("id", form.id)
      : await supabase.from("contacts").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(form.id ? "Updated" : "Contact added");
    setOpen(false); setForm(empty); void load();
  };

  const startEdit = (c: Contact) => {
    setForm({
      id: c.id, contact_type: c.contact_type as CType, full_name: c.full_name,
      company_name: c.company_name ?? "", email: c.email ?? "", phone: c.phone ?? "",
      address: c.address ?? "", postcode: c.postcode ?? "", notes: c.notes ?? "",
      rating: c.rating ?? 0, hourly_rate: Number(c.hourly_rate ?? 0), is_preferred: c.is_preferred,
    });
    setOpen(true);
  };

  const remove = async (id: string) => {
    if (!confirm("Archive this contact?")) return;
    const { error } = await supabase.from("contacts").update({ is_active: false }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Archived"); void load();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Contacts" description="Landlords, tenants, contractors, suppliers — your CRM directory." actions={
        <Button onClick={() => { setForm(empty); setOpen(true); }}><Plus className="mr-2 h-4 w-4" /> Add contact</Button>
      } />

      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="text-xs text-muted-foreground ml-auto">{filtered.length} of {rows.length}</div>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <Card key={i} className="animate-pulse"><CardContent className="p-5 h-32" /></Card>)}</div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent"><CardContent className="p-12 text-center text-muted-foreground"><ContactIcon className="mx-auto h-10 w-10 mb-3 opacity-40" /><div>{rows.length === 0 ? "No contacts yet." : "No matches."}</div></CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <Card key={c.id} className="border-0 shadow-card">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold truncate flex items-center gap-1.5">{c.full_name} {c.is_preferred && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}</div>
                    {c.company_name && <div className="text-xs text-muted-foreground truncate">{c.company_name}</div>}
                  </div>
                  <Badge variant="outline" className="capitalize">{c.contact_type}</Badge>
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  {c.email && <div className="flex items-center gap-1.5 truncate"><Mail className="h-3 w-3 shrink-0" />{c.email}</div>}
                  {c.phone && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{c.phone}</div>}
                </div>
                {c.hourly_rate ? <div className="text-xs text-muted-foreground">£{c.hourly_rate}/hr</div> : null}
                {c.notes && <p className="text-xs text-muted-foreground line-clamp-2">{c.notes}</p>}
                <div className="flex gap-1 pt-1 border-t">
                  <Button size="sm" variant="ghost" onClick={() => startEdit(c)} className="flex-1"><Pencil className="mr-1 h-3.5 w-3.5" /> Edit</Button>
                  <Button size="icon" variant="ghost" className="text-destructive h-8 w-8" onClick={() => remove(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{form.id ? "Edit contact" : "Add contact"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Type</Label>
              <Select value={form.contact_type} onValueChange={(val) => setForm({ ...form, contact_type: val as CType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Hourly rate (£)</Label><Input type="number" value={form.hourly_rate} onChange={(e) => setForm({ ...form, hourly_rate: Number(e.target.value) })} /></div>
            <div className="col-span-2"><Label>Full name *</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div className="col-span-2"><Label>Company</Label><Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="col-span-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div><Label>Postcode</Label><Input value={form.postcode} onChange={(e) => setForm({ ...form, postcode: e.target.value })} /></div>
            <div className="flex items-end gap-2"><label className="text-sm flex items-center gap-2"><input type="checkbox" checked={form.is_preferred} onChange={(e) => setForm({ ...form, is_preferred: e.target.checked })} /> Preferred</label></div>
            <div className="col-span-2"><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            {form.id && (
              <div className="col-span-2 rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <ShieldCheck className="h-4 w-4" /> Portal access
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {linkedUserId
                    ? "This contact is linked to an Estately account and can see their assigned jobs, visits and documents."
                    : "Link an existing Estately account so this contact can sign in and see only their own jobs. Access is never granted by email alone."}
                </p>
                <div className="mt-2 flex gap-2">
                  <Input
                    type="email"
                    placeholder="account email"
                    value={linkEmail}
                    onChange={(e) => setLinkEmail(e.target.value)}
                    className="h-9"
                  />
                  <Button size="sm" variant="outline" className="h-9 shrink-0" disabled={linking} onClick={() => void linkAccess(linkEmail)}>
                    {linking ? "Linking…" : "Grant access"}
                  </Button>
                  {linkedUserId && (
                    <Button size="sm" variant="ghost" className="h-9 shrink-0 text-destructive" disabled={linking} onClick={() => void linkAccess(null)}>
                      Revoke
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter><Button onClick={save} disabled={saving || !form.full_name.trim()}>{saving ? "Saving…" : "Save"}</Button></DialogFooter>

        </DialogContent>
      </Dialog>
    </div>
  );
}
