import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Inbox, Mail, Phone } from "lucide-react";
import { toast } from "sonner";

const stages = ["new","contacted","qualified","viewing_booked","offer","closed_won","closed_lost"] as const;
type Lead = { id: string; name: string; email: string | null; phone: string | null; message: string | null; status: typeof stages[number]; created_at: string; listing_id: string | null };

export const Route = createFileRoute("/_authenticated/leads")({ component: LeadsPage });

function LeadsPage() {
  const [rows, setRows] = useState<Lead[]>([]);
  const load = async () => {
    const { data } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
    setRows((data as Lead[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const update = async (id: string, status: typeof stages[number]) => {
    const { error } = await supabase.from("leads").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Updated"); load(); }
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Leads</h1><p className="text-muted-foreground text-sm">Enquiries from your listings.</p></div>
      {rows.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent"><CardContent className="p-12 text-center text-muted-foreground"><Inbox className="mx-auto h-10 w-10 mb-3 opacity-40" />No leads yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {rows.map((l) => (
            <Card key={l.id} className="border-0 shadow-card">
              <CardContent className="p-5 flex flex-wrap items-start gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="font-semibold">{l.name}</div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-3 mt-1">
                    {l.email && <a href={`mailto:${l.email}`} className="inline-flex items-center gap-1 hover:underline"><Mail className="h-3 w-3" />{l.email}</a>}
                    {l.phone && <a href={`tel:${l.phone}`} className="inline-flex items-center gap-1 hover:underline"><Phone className="h-3 w-3" />{l.phone}</a>}
                    <span>{new Date(l.created_at).toLocaleDateString()}</span>
                  </div>
                  {l.message && <p className="text-sm mt-2 text-muted-foreground">{l.message}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{l.status}</Badge>
                  <Select value={l.status} onValueChange={(v) => update(l.id, v as typeof stages[number])}>
                    <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{stages.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
