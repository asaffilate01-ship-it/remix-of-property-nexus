import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";

const stages = ["lead","contacted","viewing","offer","negotiation","agreed","completed","lost"] as const;
type Deal = { id: string; title: string; contact_name: string | null; stage: typeof stages[number]; value: number | null };

export const Route = createFileRoute("/_authenticated/pipeline")({
  head: () => ({ meta: [{ title: "Pipeline — Estately" }] }),
  component: PipelinePage,
});

function PipelinePage() {
  const [rows, setRows] = useState<Deal[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", contact_name: "", stage: "lead" as typeof stages[number], value: "" });

  const load = async () => {
    const { data } = await supabase.from("deals").select("*").order("created_at", { ascending: false });
    setRows((data as Deal[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("deals").insert({
      owner_id: u.user.id, title: form.title, contact_name: form.contact_name || null, stage: form.stage,
      value: form.value ? Number(form.value) : null,
    });
    if (error) toast.error(error.message); else { toast.success("Deal added"); setOpen(false); setForm({ title: "", contact_name: "", stage: "lead", value: "" }); load(); }
  };

  const move = async (id: string, stage: typeof stages[number]) => {
    const { error } = await supabase.from("deals").update({ stage }).eq("id", id);
    if (!error) load();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">Pipeline</h1><p className="text-muted-foreground text-sm">Sales & lettings deals.</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> New deal</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New deal</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Contact name</Label><Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Stage</Label>
                  <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v as typeof stages[number] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{stages.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Value (£)</Label><Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></div>
              </div>
            </div>
            <DialogFooter><Button onClick={save} disabled={!form.title}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 overflow-x-auto">
        {stages.map((s) => {
          const cards = rows.filter((d) => d.stage === s);
          const total = cards.reduce((a, d) => a + Number(d.value ?? 0), 0);
          return (
            <div key={s} className="space-y-2 min-w-[180px]">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>{s}</span><span>{cards.length}</span>
              </div>
              {total > 0 && <div className="text-xs text-accent">£{total.toLocaleString()}</div>}
              <div className="space-y-2">
                {cards.map((d) => (
                  <Card key={d.id} className="border-0 shadow-card cursor-grab">
                    <CardContent className="p-3">
                      <div className="font-medium text-sm">{d.title}</div>
                      {d.contact_name && <div className="text-xs text-muted-foreground">{d.contact_name}</div>}
                      {d.value && <div className="text-xs text-accent font-medium mt-1">£{Number(d.value).toLocaleString()}</div>}
                      <Select value={d.stage} onValueChange={(v) => move(d.id, v as typeof stages[number])}>
                        <SelectTrigger className="h-7 text-xs mt-2"><SelectValue /></SelectTrigger>
                        <SelectContent>{stages.map((st) => <SelectItem key={st} value={st}>{st}</SelectItem>)}</SelectContent>
                      </Select>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
