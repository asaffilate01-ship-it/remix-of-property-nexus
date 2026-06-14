import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Banknote } from "lucide-react";
import { toast } from "sonner";
import { fetchBuyers, saveBuyer, deleteBuyer, fetchPropertyTypes } from "@/lib/persistence.functions";

export const Route = createFileRoute("/_authenticated/buyers")({ component: BuyersPage });

const empty = {
  id: undefined as string | undefined,
  full_name: "", email: "", phone: "",
  budget_min: "" as string, budget_max: "" as string,
  areas: "" as string, property_type_codes: [] as string[],
  bedrooms_min: "" as string,
  finance_status: "unknown" as "cash"|"mortgage"|"aip"|"unknown",
  chain_status: "unknown" as "no-chain"|"in-chain"|"first-time-buyer"|"unknown",
  notes: "", active: true,
};

function BuyersPage() {
  const qc = useQueryClient();
  const load = useServerFn(fetchBuyers);
  const save = useServerFn(saveBuyer);
  const del = useServerFn(deleteBuyer);
  const loadTypes = useServerFn(fetchPropertyTypes);
  const { data, isLoading } = useQuery({ queryKey: ["buyers"], queryFn: () => load() });
  const { data: typesData } = useQuery({ queryKey: ["property-types"], queryFn: () => loadTypes() });
  const types = typesData?.types ?? [];
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(empty);

  const filtered = useMemo(() => {
    const list = data?.buyers ?? [];
    if (!q.trim()) return list;
    const t = q.toLowerCase();
    return list.filter((b: any) => [b.full_name, b.email, b.phone, b.notes, ...(b.areas ?? [])].filter(Boolean).join(" ").toLowerCase().includes(t));
  }, [data, q]);

  const submit = async () => {
    if (!f.full_name.trim()) return toast.error("Name required");
    try {
      await save({ data: {
        id: f.id,
        full_name: f.full_name.trim(),
        email: f.email,
        phone: f.phone,
        budget_min: f.budget_min ? Number(f.budget_min) : null,
        budget_max: f.budget_max ? Number(f.budget_max) : null,
        areas: f.areas.split(",").map(s => s.trim()).filter(Boolean),
        property_type_codes: f.property_type_codes,
        bedrooms_min: f.bedrooms_min ? Number(f.bedrooms_min) : null,
        finance_status: f.finance_status,
        chain_status: f.chain_status,
        notes: f.notes,
        active: f.active,
      }});
      toast.success("Saved");
      setOpen(false); setF(empty);
      qc.invalidateQueries({ queryKey: ["buyers"] });
    } catch (e: any) { toast.error(e.message); }
  };

  const edit = (b: any) => {
    setF({
      id: b.id, full_name: b.full_name, email: b.email ?? "", phone: b.phone ?? "",
      budget_min: b.budget_min?.toString() ?? "", budget_max: b.budget_max?.toString() ?? "",
      areas: (b.areas ?? []).join(", "), property_type_codes: b.property_type_codes ?? [],
      bedrooms_min: b.bedrooms_min?.toString() ?? "",
      finance_status: b.finance_status ?? "unknown", chain_status: b.chain_status ?? "unknown",
      notes: b.notes ?? "", active: b.active,
    });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Buyers" description="Active buyer requirements and matching criteria"
        actions={<Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setF(empty); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Add buyer</Button></DialogTrigger>
          <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{f.id ? "Edit buyer" : "New buyer"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Name *</Label><Input value={f.full_name} onChange={e => setF({ ...f, full_name: e.target.value })} /></div>
                <div><Label>Email</Label><Input value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} /></div>
                <div><Label>Min bedrooms</Label><Input type="number" value={f.bedrooms_min} onChange={e => setF({ ...f, bedrooms_min: e.target.value })} /></div>
                <div><Label>Budget min (£)</Label><Input type="number" value={f.budget_min} onChange={e => setF({ ...f, budget_min: e.target.value })} /></div>
                <div><Label>Budget max (£)</Label><Input type="number" value={f.budget_max} onChange={e => setF({ ...f, budget_max: e.target.value })} /></div>
                <div>
                  <Label>Finance</Label>
                  <Select value={f.finance_status} onValueChange={(v: any) => setF({ ...f, finance_status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="mortgage">Mortgage</SelectItem>
                      <SelectItem value="aip">AIP in place</SelectItem>
                      <SelectItem value="unknown">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Chain</Label>
                  <Select value={f.chain_status} onValueChange={(v: any) => setF({ ...f, chain_status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no-chain">No chain</SelectItem>
                      <SelectItem value="in-chain">In chain</SelectItem>
                      <SelectItem value="first-time-buyer">First-time buyer</SelectItem>
                      <SelectItem value="unknown">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Areas (comma-separated)</Label><Input value={f.areas} onChange={e => setF({ ...f, areas: e.target.value })} placeholder="Camden, Islington" /></div>
              <div>
                <Label>Property types</Label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {types.map((t: any) => {
                    const on = f.property_type_codes.includes(t.code);
                    return (
                      <Badge key={t.code} variant={on ? "default" : "outline"} className="cursor-pointer"
                        onClick={() => setF({ ...f, property_type_codes: on ? f.property_type_codes.filter(c => c !== t.code) : [...f.property_type_codes, t.code] })}>
                        {t.label}
                      </Badge>
                    );
                  })}
                </div>
              </div>
              <div><Label>Notes</Label><Textarea rows={3} value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={submit}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>}
      />
      <Input placeholder="Search buyers…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
      {isLoading ? <div className="text-sm text-muted-foreground">Loading…</div> : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((b: any) => (
            <Card key={b.id} className="border-0 shadow-card">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold">{b.full_name}</div>
                    <div className="text-xs text-muted-foreground">{b.email} {b.phone && `· ${b.phone}`}</div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => edit(b)}><Pencil className="h-3 w-3" /></Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={async () => {
                      if (!confirm("Delete buyer?")) return;
                      await del({ data: { id: b.id } });
                      qc.invalidateQueries({ queryKey: ["buyers"] });
                    }}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
                {(b.budget_min || b.budget_max) && (
                  <div className="text-sm flex items-center gap-1"><Banknote className="h-3 w-3 text-muted-foreground" />
                    £{(b.budget_min ?? 0).toLocaleString()} – £{(b.budget_max ?? 0).toLocaleString()}
                    {b.bedrooms_min && <span className="text-muted-foreground ml-2">{b.bedrooms_min}+ beds</span>}
                  </div>
                )}
                <div className="flex flex-wrap gap-1">
                  {(b.areas ?? []).map((a: string) => <Badge key={a} variant="secondary" className="text-[10px]">{a}</Badge>)}
                  {b.finance_status && b.finance_status !== "unknown" && <Badge variant="outline" className="text-[10px]">{b.finance_status}</Badge>}
                  {b.chain_status && b.chain_status !== "unknown" && <Badge variant="outline" className="text-[10px]">{b.chain_status}</Badge>}
                </div>
                {b.notes && <div className="text-xs text-muted-foreground">{b.notes}</div>}
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && <div className="col-span-2 text-sm text-muted-foreground text-center py-12 border border-dashed rounded-lg">No buyers yet</div>}
        </div>
      )}
    </div>
  );
}
