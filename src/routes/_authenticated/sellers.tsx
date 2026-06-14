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
import { Plus, Pencil, Trash2, Home, PoundSterling } from "lucide-react";
import { toast } from "sonner";
import { fetchSellers, saveSeller, deleteSeller } from "@/lib/persistence.functions";

export const Route = createFileRoute("/_authenticated/sellers")({ component: SellersPage });

const empty = {
  id: undefined as string | undefined,
  full_name: "", email: "", phone: "",
  property_id: "" as string,
  asking_price: "" as string, reason: "", target_completion: "",
  chain_status: "unknown" as "no-chain"|"in-chain"|"onward-purchase"|"unknown",
  notes: "", active: true,
};

function SellersPage() {
  const qc = useQueryClient();
  const load = useServerFn(fetchSellers);
  const save = useServerFn(saveSeller);
  const del = useServerFn(deleteSeller);
  const { data, isLoading } = useQuery({ queryKey: ["sellers"], queryFn: () => load() });
  const props = data?.properties ?? [];
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(empty);

  const filtered = useMemo(() => {
    const list = data?.sellers ?? [];
    if (!q.trim()) return list;
    const t = q.toLowerCase();
    return list.filter((s: any) => [s.full_name, s.email, s.phone, s.notes, s.reason].filter(Boolean).join(" ").toLowerCase().includes(t));
  }, [data, q]);

  const submit = async () => {
    if (!f.full_name.trim()) return toast.error("Name required");
    try {
      await save({ data: {
        id: f.id,
        full_name: f.full_name.trim(), email: f.email, phone: f.phone,
        property_id: f.property_id || null,
        asking_price: f.asking_price ? Number(f.asking_price) : null,
        reason: f.reason, target_completion: f.target_completion,
        chain_status: f.chain_status, notes: f.notes, active: f.active,
      }});
      toast.success("Saved");
      setOpen(false); setF(empty);
      qc.invalidateQueries({ queryKey: ["sellers"] });
    } catch (e: any) { toast.error(e.message); }
  };

  const edit = (s: any) => {
    setF({
      id: s.id, full_name: s.full_name, email: s.email ?? "", phone: s.phone ?? "",
      property_id: s.property_id ?? "", asking_price: s.asking_price?.toString() ?? "",
      reason: s.reason ?? "", target_completion: s.target_completion ?? "",
      chain_status: s.chain_status ?? "unknown", notes: s.notes ?? "", active: s.active,
    });
    setOpen(true);
  };

  const propLabel = (id: string) => {
    const p = props.find((x: any) => x.id === id);
    return p ? [p.address, p.city, p.postcode].filter(Boolean).join(", ") : "";
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Sellers / Vendors" description="Active vendor instructions"
        actions={<Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setF(empty); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Add seller</Button></DialogTrigger>
          <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{f.id ? "Edit seller" : "New seller"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Name *</Label><Input value={f.full_name} onChange={e => setF({ ...f, full_name: e.target.value })} /></div>
                <div><Label>Email</Label><Input value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} /></div>
                <div><Label>Asking price (£)</Label><Input type="number" value={f.asking_price} onChange={e => setF({ ...f, asking_price: e.target.value })} /></div>
                <div className="col-span-2">
                  <Label>Property</Label>
                  <Select value={f.property_id} onValueChange={(v) => setF({ ...f, property_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Link a property (optional)" /></SelectTrigger>
                    <SelectContent>{props.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{[p.address, p.city, p.postcode].filter(Boolean).join(", ")}</SelectItem>
                    ))}</SelectContent>
                  </Select>
                </div>
                <div><Label>Target completion</Label><Input type="date" value={f.target_completion} onChange={e => setF({ ...f, target_completion: e.target.value })} /></div>
                <div>
                  <Label>Chain</Label>
                  <Select value={f.chain_status} onValueChange={(v: any) => setF({ ...f, chain_status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no-chain">No chain</SelectItem>
                      <SelectItem value="in-chain">In chain</SelectItem>
                      <SelectItem value="onward-purchase">Onward purchase</SelectItem>
                      <SelectItem value="unknown">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2"><Label>Reason for sale</Label><Input value={f.reason} onChange={e => setF({ ...f, reason: e.target.value })} /></div>
              </div>
              <div><Label>Notes</Label><Textarea rows={3} value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={submit}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>}
      />
      <Input placeholder="Search sellers…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
      {isLoading ? <div className="text-sm text-muted-foreground">Loading…</div> : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((s: any) => (
            <Card key={s.id} className="border-0 shadow-card">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold">{s.full_name}</div>
                    <div className="text-xs text-muted-foreground">{s.email} {s.phone && `· ${s.phone}`}</div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => edit(s)}><Pencil className="h-3 w-3" /></Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={async () => {
                      if (!confirm("Delete seller?")) return;
                      await del({ data: { id: s.id } });
                      qc.invalidateQueries({ queryKey: ["sellers"] });
                    }}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
                {s.property_id && <div className="text-sm flex items-center gap-1"><Home className="h-3 w-3 text-muted-foreground" /> {propLabel(s.property_id)}</div>}
                {s.asking_price && <div className="text-sm flex items-center gap-1"><PoundSterling className="h-3 w-3 text-muted-foreground" /> {Number(s.asking_price).toLocaleString()}</div>}
                <div className="flex flex-wrap gap-1">
                  {s.chain_status && s.chain_status !== "unknown" && <Badge variant="outline" className="text-[10px]">{s.chain_status}</Badge>}
                  {s.target_completion && <Badge variant="secondary" className="text-[10px]">Target {new Date(s.target_completion).toLocaleDateString("en-GB")}</Badge>}
                </div>
                {s.notes && <div className="text-xs text-muted-foreground">{s.notes}</div>}
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && <div className="col-span-2 text-sm text-muted-foreground text-center py-12 border border-dashed rounded-lg">No sellers yet</div>}
        </div>
      )}
    </div>
  );
}
