import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Inbox, Mail, Phone, Search, GripVertical, Clock } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";

const stages = ["new","contacted","qualified","viewing_booked","offer","closed_won","closed_lost"] as const;
type Stage = typeof stages[number];
type Lead = { id: string; name: string; email: string | null; phone: string | null; message: string | null; status: Stage; created_at: string; listing_id: string | null };

const TONE: Record<Stage, string> = {
  new: "bg-blue-50 text-blue-700 border-blue-200",
  contacted: "bg-indigo-50 text-indigo-700 border-indigo-200",
  qualified: "bg-amber-50 text-amber-700 border-amber-200",
  viewing_booked: "bg-purple-50 text-purple-700 border-purple-200",
  offer: "bg-orange-50 text-orange-700 border-orange-200",
  closed_won: "bg-emerald-50 text-emerald-700 border-emerald-200",
  closed_lost: "bg-rose-50 text-rose-700 border-rose-200",
};
const LABEL: Record<Stage, string> = {
  new: "New", contacted: "Contacted", qualified: "Qualified",
  viewing_booked: "Viewing", offer: "Offer", closed_won: "Won", closed_lost: "Lost",
};

function slaHours(createdAt: string, status: Stage) {
  if (status !== "new") return null;
  const hrs = (Date.now() - new Date(createdAt).getTime()) / 36e5;
  if (hrs > 24) return { tone: "text-rose-600", label: `${Math.round(hrs)}h — SLA breached` };
  if (hrs > 4) return { tone: "text-amber-600", label: `${Math.round(hrs)}h waiting` };
  return { tone: "text-emerald-600", label: `${Math.round(hrs)}h fresh` };
}

export const Route = createFileRoute("/_authenticated/leads")({
  head: () => ({ meta: [{ title: "Leads — Estately" }] }),
  component: LeadsPage,
});

function LeadsPage() {
  const [rows, setRows] = useState<Lead[]>([]);
  const [q, setQ] = useState("");
  const [drag, setDrag] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
    setRows((data as Lead[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const move = async (id: string, status: Stage) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    const { error } = await supabase.from("leads").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); load(); }
  };

  const filtered = useMemo(() => {
    if (!q) return rows;
    const t = q.toLowerCase();
    return rows.filter((r) => r.name?.toLowerCase().includes(t) || r.email?.toLowerCase().includes(t) || r.phone?.includes(t));
  }, [rows, q]);

  const breached = rows.filter((r) => r.status === "new" && (Date.now() - new Date(r.created_at).getTime()) / 36e5 > 24).length;

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <PageHeader
        title="Leads"
        description="Pipeline of enquiries from listings, portals and the public site."
      />
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, phone…" className="pl-9" />
        </div>
        <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> {rows.length} total</Badge>
        {breached > 0 && <Badge variant="destructive">{breached} SLA breached</Badge>}
      </div>

      {rows.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent">
          <CardContent className="p-12 text-center text-muted-foreground">
            <Inbox className="mx-auto h-10 w-10 mb-3 opacity-40" />
            <p className="font-medium text-foreground mb-1">No leads yet</p>
            <p className="text-sm">Enquiries from your published listings land here automatically.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {stages.map((s) => {
            const items = filtered.filter((r) => r.status === s);
            return (
              <div
                key={s}
                className="space-y-2 min-h-[200px] rounded-lg p-2 bg-muted/30 transition-colors"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => { if (drag) { move(drag, s); setDrag(null); } }}
              >
                <div className="flex items-center justify-between px-1">
                  <Badge variant="outline" className={`${TONE[s]} text-[10px]`}>{LABEL[s]}</Badge>
                  <span className="text-xs text-muted-foreground tabular-nums">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map((l) => {
                    const sla = slaHours(l.created_at, l.status);
                    return (
                      <Card
                        key={l.id}
                        draggable
                        onDragStart={() => setDrag(l.id)}
                        onDragEnd={() => setDrag(null)}
                        className="border-0 shadow-card cursor-grab active:cursor-grabbing"
                      >
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-start gap-1.5">
                            <GripVertical className="h-3 w-3 text-muted-foreground/40 mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{l.name}</div>
                              <div className="text-[11px] text-muted-foreground truncate">
                                {new Date(l.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          {l.message && <p className="text-xs text-muted-foreground line-clamp-2">{l.message}</p>}
                          <div className="flex items-center gap-2 pt-1">
                            {l.email && <a href={`mailto:${l.email}`} className="text-muted-foreground hover:text-foreground"><Mail className="h-3.5 w-3.5" /></a>}
                            {l.phone && <a href={`tel:${l.phone}`} className="text-muted-foreground hover:text-foreground"><Phone className="h-3.5 w-3.5" /></a>}
                            {sla && <span className={`text-[10px] ml-auto ${sla.tone}`}>{sla.label}</span>}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {items.length === 0 && (
                    <div className="text-[11px] text-muted-foreground/60 text-center py-6 border border-dashed border-border/40 rounded">
                      Drop here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
