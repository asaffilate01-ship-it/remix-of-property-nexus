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
import { Plus, PoundSterling, Handshake } from "lucide-react";
import { toast } from "sonner";
import { fetchOpsData, saveSalesDeal } from "@/lib/ops.functions";

export const Route = createFileRoute("/_authenticated/sales")({ component: SalesPage });

const STAGES = ["offer", "agreed", "memo_sent", "searches", "enquiries", "mortgage_offer", "exchanged", "completed", "fallen_through"] as const;
const STAGE_LABEL: Record<string, string> = {
  offer: "Offer", agreed: "Agreed", memo_sent: "Memo of sale", searches: "Searches", enquiries: "Enquiries",
  mortgage_offer: "Mortgage offer", exchanged: "Exchanged", completed: "Completed", fallen_through: "Fallen through",
};

const empty = {
  id: undefined as string | undefined,
  property_id: "", listing_id: "", buyer_lead_id: "",
  seller_conveyancer_id: "", buyer_conveyancer_id: "",
  offer_amount: "", agreed_price: "",
  status: "offer" as string, chain_position: "",
  memo_of_sale_at: "", exchange_at: "", completion_at: "",
  notes: "",
};

function SalesPage() {
  const qc = useQueryClient();
  const load = useServerFn(fetchOpsData);
  const save = useServerFn(saveSalesDeal);
  const { data, isLoading } = useQuery({ queryKey: ["ops"], queryFn: () => load() });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);

  const deals = (data?.sales ?? []) as any[];
  const properties = (data?.properties ?? []) as any[];
  const listings = ((data?.listings ?? []) as any[]).filter((l) => l.listing_type === "sale" || !l.listing_type);
  const leads = (data?.leads ?? []) as any[];
  const conveyancers = ((data?.contacts ?? []) as any[]).filter((c) => c.contact_type === "conveyancer" || c.contact_type === "solicitor");
  const propMap = useMemo(() => Object.fromEntries(properties.map((p) => [p.id, p])), [properties]);
  const contactMap = useMemo(() => Object.fromEntries(((data?.contacts ?? []) as any[]).map((c) => [c.id, c])), [data]);

  const byStage = (s: string) => deals.filter((d) => d.status === s);

  const submit = async () => {
    try {
      await save({ data: {
        id: form.id,
        property_id: form.property_id || null,
        listing_id: form.listing_id || null,
        buyer_lead_id: form.buyer_lead_id || null,
        seller_conveyancer_id: form.seller_conveyancer_id || null,
        buyer_conveyancer_id: form.buyer_conveyancer_id || null,
        offer_amount: form.offer_amount ? Number(form.offer_amount) : null,
        agreed_price: form.agreed_price ? Number(form.agreed_price) : null,
        status: form.status,
        chain_position: form.chain_position || null,
        memo_of_sale_at: form.memo_of_sale_at || null,
        exchange_at: form.exchange_at || null,
        completion_at: form.completion_at || null,
        notes: form.notes || null,
      }});
      toast.success("Saved");
      setOpen(false); setForm(empty);
      qc.invalidateQueries({ queryKey: ["ops"] });
    } catch (e: any) { toast.error(e.message); }
  };

  const edit = (d: any) => {
    setForm({
      id: d.id, property_id: d.property_id ?? "", listing_id: d.listing_id ?? "", buyer_lead_id: d.buyer_lead_id ?? "",
      seller_conveyancer_id: d.seller_conveyancer_id ?? "", buyer_conveyancer_id: d.buyer_conveyancer_id ?? "",
      offer_amount: d.offer_amount?.toString() ?? "", agreed_price: d.agreed_price?.toString() ?? "",
      status: d.status, chain_position: d.chain_position ?? "",
      memo_of_sale_at: d.memo_of_sale_at ?? "", exchange_at: d.exchange_at ?? "", completion_at: d.completion_at ?? "",
      notes: d.notes ?? "",
    });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sales pipeline</h1>
          <p className="text-muted-foreground text-sm">Offers, conveyancing, exchange & completion</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setForm(empty); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> New deal</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{form.id ? "Edit" : "New"} sales deal</DialogTitle></DialogHeader>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label>Property</Label>
                <Select value={form.property_id} onValueChange={(v) => setForm({ ...form, property_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Pick property" /></SelectTrigger>
                  <SelectContent>{properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Stage</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STAGES.map((s) => <SelectItem key={s} value={s}>{STAGE_LABEL[s]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Buyer (lead)</Label>
                <Select value={form.buyer_lead_id} onValueChange={(v) => setForm({ ...form, buyer_lead_id: v })}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>{leads.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Chain position</Label><Input value={form.chain_position} placeholder="No chain, 2-up..." onChange={(e) => setForm({ ...form, chain_position: e.target.value })} /></div>
              <div><Label>Offer £</Label><Input type="number" value={form.offer_amount} onChange={(e) => setForm({ ...form, offer_amount: e.target.value })} /></div>
              <div><Label>Agreed £</Label><Input type="number" value={form.agreed_price} onChange={(e) => setForm({ ...form, agreed_price: e.target.value })} /></div>
              <div><Label>Seller conveyancer</Label>
                <Select value={form.seller_conveyancer_id} onValueChange={(v) => setForm({ ...form, seller_conveyancer_id: v })}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>{conveyancers.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Buyer conveyancer</Label>
                <Select value={form.buyer_conveyancer_id} onValueChange={(v) => setForm({ ...form, buyer_conveyancer_id: v })}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>{conveyancers.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Memo sent</Label><Input type="date" value={form.memo_of_sale_at} onChange={(e) => setForm({ ...form, memo_of_sale_at: e.target.value })} /></div>
              <div><Label>Exchange</Label><Input type="date" value={form.exchange_at} onChange={(e) => setForm({ ...form, exchange_at: e.target.value })} /></div>
              <div><Label>Completion</Label><Input type="date" value={form.completion_at} onChange={(e) => setForm({ ...form, completion_at: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={submit}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-0 shadow-card overflow-hidden animate-pulse">
              <div className="p-4 space-y-3">
                <div className="h-5 w-32 bg-muted rounded" />
                <div className="h-4 w-full bg-muted rounded" />
                <div className="h-3 w-2/3 bg-muted rounded" />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {STAGES.map((stage) => (
            <Card key={stage}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">{STAGE_LABEL[stage]}</h3>
                  <Badge variant="secondary">{byStage(stage).length}</Badge>
                </div>
                <div className="space-y-2">
                  {byStage(stage).length === 0 ? (
                    <div className="text-xs text-muted-foreground py-4 text-center">Empty</div>
                  ) : byStage(stage).map((d) => (
                    <div key={d.id} className="p-3 rounded-md border bg-background hover:bg-accent cursor-pointer transition-colors" onClick={() => edit(d)}>
                      <div className="font-medium text-sm truncate">{propMap[d.property_id]?.title || "Unlinked property"}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <PoundSterling className="h-3 w-3" /> {d.agreed_price ? `£${Number(d.agreed_price).toLocaleString()}` : d.offer_amount ? `£${Number(d.offer_amount).toLocaleString()} offer` : "—"}
                      </div>
                      {(d.buyer_conveyancer_id || d.seller_conveyancer_id) && (
                        <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                          <Handshake className="h-2.5 w-2.5" />
                          {d.seller_conveyancer_id && contactMap[d.seller_conveyancer_id]?.full_name?.split(" ")[0]}
                          {d.seller_conveyancer_id && d.buyer_conveyancer_id && " ↔ "}
                          {d.buyer_conveyancer_id && contactMap[d.buyer_conveyancer_id]?.full_name?.split(" ")[0]}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
