import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Star, Phone, Mail, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { fetchOpsData, saveContact, deleteContact } from "@/lib/ops.functions";

export const Route = createFileRoute("/_authenticated/contacts")({ component: ContactsPage });

const CONTACT_TYPES = [
  "conveyancer", "solicitor", "plumber", "electrician", "gas_engineer", "builder",
  "cleaner", "handyman", "locksmith", "roofer", "painter", "gardener",
  "inventory_clerk", "epc_assessor", "utilities", "council", "referencing", "insurance", "other",
];

const TYPE_LABEL: Record<string, string> = {
  conveyancer: "Conveyancer", solicitor: "Solicitor", plumber: "Plumber", electrician: "Electrician",
  gas_engineer: "Gas Engineer", builder: "Builder", cleaner: "Cleaner", handyman: "Handyman",
  locksmith: "Locksmith", roofer: "Roofer", painter: "Painter", gardener: "Gardener",
  inventory_clerk: "Inventory Clerk", epc_assessor: "EPC Assessor", utilities: "Utilities",
  council: "Council", referencing: "Referencing", insurance: "Insurance", other: "Other",
};

const empty = {
  id: undefined as string | undefined,
  contact_type: "plumber",
  company_name: "",
  full_name: "",
  email: "",
  phone: "",
  address: "",
  postcode: "",
  notes: "",
  rating: "" as string,
  hourly_rate: "" as string,
  insurance_expires_at: "",
  is_preferred: false,
  is_active: true,
};

function ContactsPage() {
  const qc = useQueryClient();
  const load = useServerFn(fetchOpsData);
  const save = useServerFn(saveContact);
  const del = useServerFn(deleteContact);
  const { data, isLoading } = useQuery({ queryKey: ["ops"], queryFn: () => load() });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const contacts = (data?.contacts ?? []) as any[];
  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      if (typeFilter !== "all" && c.contact_type !== typeFilter) return false;
      if (!q.trim()) return true;
      const s = q.toLowerCase();
      return [c.full_name, c.company_name, c.email, c.phone, c.postcode].some((v) => v?.toLowerCase().includes(s));
    });
  }, [contacts, q, typeFilter]);

  const submit = async () => {
    if (!form.full_name.trim()) return toast.error("Name required");
    try {
      await save({ data: {
        id: form.id,
        contact_type: form.contact_type,
        company_name: form.company_name || null,
        full_name: form.full_name,
        email: form.email || null,
        phone: form.phone || null,
        address: form.address || null,
        postcode: form.postcode || null,
        notes: form.notes || null,
        rating: form.rating ? Number(form.rating) : null,
        hourly_rate: form.hourly_rate ? Number(form.hourly_rate) : null,
        insurance_expires_at: form.insurance_expires_at || null,
        is_preferred: form.is_preferred,
        is_active: form.is_active,
      }});
      toast.success("Contact saved");
      setOpen(false); setForm(empty);
      qc.invalidateQueries({ queryKey: ["ops"] });
    } catch (e: any) { toast.error(e.message); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete contact?")) return;
    try { await del({ data: { id } }); qc.invalidateQueries({ queryKey: ["ops"] }); toast.success("Deleted"); }
    catch (e: any) { toast.error(e.message); }
  };

  const edit = (c: any) => {
    setForm({
      id: c.id, contact_type: c.contact_type, company_name: c.company_name ?? "", full_name: c.full_name,
      email: c.email ?? "", phone: c.phone ?? "", address: c.address ?? "", postcode: c.postcode ?? "",
      notes: c.notes ?? "", rating: c.rating?.toString() ?? "", hourly_rate: c.hourly_rate?.toString() ?? "",
      insurance_expires_at: c.insurance_expires_at ?? "", is_preferred: c.is_preferred, is_active: c.is_active,
    });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contacts directory</h1>
          <p className="text-muted-foreground text-sm">Conveyancers, trades and third parties</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setForm(empty); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Add contact</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{form.id ? "Edit" : "New"} contact</DialogTitle></DialogHeader>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label>Type</Label>
                <Select value={form.contact_type} onValueChange={(v) => setForm({ ...form, contact_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CONTACT_TYPES.map((t) => <SelectItem key={t} value={t}>{TYPE_LABEL[t]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Full name *</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
              <div><Label>Company</Label><Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>Postcode</Label><Input value={form.postcode} onChange={(e) => setForm({ ...form, postcode: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              <div><Label>Hourly rate (£)</Label><Input type="number" value={form.hourly_rate} onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })} /></div>
              <div><Label>Rating (1-5)</Label><Input type="number" min={1} max={5} value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} /></div>
              <div><Label>Insurance expires</Label><Input type="date" value={form.insurance_expires_at} onChange={(e) => setForm({ ...form, insurance_expires_at: e.target.value })} /></div>
              <div className="flex items-center gap-3 pt-6">
                <Switch checked={form.is_preferred} onCheckedChange={(v) => setForm({ ...form, is_preferred: v })} />
                <Label>Preferred supplier</Label>
              </div>
              <div className="sm:col-span-2"><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={submit}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Input placeholder="Search name, company, email..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {CONTACT_TYPES.map((t) => <SelectItem key={t} value={t}>{TYPE_LABEL[t]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 space-y-2">
                <div className="h-5 w-32 bg-muted rounded" />
                <div className="h-4 w-3/4 bg-muted rounded" />
                <div className="h-3 w-1/2 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No contacts yet. Add your first supplier above.</CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <Card key={c.id} className="group hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2"><span className="font-semibold">{c.full_name}</span>
                      {c.is_preferred && <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />}
                    </div>
                    {c.company_name && <div className="text-sm text-muted-foreground">{c.company_name}</div>}
                  </div>
                  <Badge variant="secondary">{TYPE_LABEL[c.contact_type] ?? c.contact_type}</Badge>
                </div>
                <div className="space-y-1 text-sm">
                  {c.phone && <a href={`tel:${c.phone}`} className="flex items-center gap-2 hover:text-primary"><Phone className="h-3 w-3" /> {c.phone}</a>}
                  {c.email && <a href={`mailto:${c.email}`} className="flex items-center gap-2 hover:text-primary truncate"><Mail className="h-3 w-3 shrink-0" /> <span className="truncate">{c.email}</span></a>}
                </div>
                {c.hourly_rate && <div className="text-xs text-muted-foreground">£{c.hourly_rate}/hr</div>}
                <div className="flex gap-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="outline" onClick={() => edit(c)}><Pencil className="h-3 w-3" /></Button>
                  <Button size="sm" variant="outline" onClick={() => remove(c.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
