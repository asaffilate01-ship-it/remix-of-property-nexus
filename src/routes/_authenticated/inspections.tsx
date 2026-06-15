import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardList, Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/inspections")({
  head: () => ({ meta: [{ title: "Inspections — Estately" }] }),
  component: InspectionsPage,
});

type WO = { id: string; title: string; status: string; scheduled_for: string | null; completed_at: string | null; properties: { address: string | null; city: string | null } | null };

function InspectionsPage() {
  const [rows, setRows] = useState<WO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("work_orders")
        .select("id, title, status, scheduled_for, completed_at, category, properties(address, city)")
        .ilike("category", "%inspection%")
        .order("scheduled_for", { ascending: false, nullsFirst: false });
      setRows((data as any) ?? []); setLoading(false);
    })();
  }, []);

  const upcoming = useMemo(() => rows.filter((r) => r.status !== "completed"), [rows]);
  const completed = useMemo(() => rows.filter((r) => r.status === "completed"), [rows]);

  return (
    <div className="space-y-6">
      <PageHeader title="Inspections" description="Property inspections — managed as work orders with category 'inspection'." actions={
        <Button asChild><Link to="/work-orders"><Plus className="mr-2 h-4 w-4" /> Schedule inspection</Link></Button>
      } />

      {loading ? <Card className="animate-pulse"><CardContent className="h-32" /></Card> :
       rows.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent"><CardContent className="p-12 text-center text-muted-foreground"><ClipboardList className="mx-auto h-10 w-10 mb-3 opacity-40" /><div>No inspections yet. Create a work order with category "inspection".</div></CardContent></Card>
      ) : (
        <div className="space-y-4">
          {upcoming.length > 0 && <div>
            <h2 className="text-sm font-bold mb-2 text-muted-foreground uppercase tracking-wider">Upcoming ({upcoming.length})</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {upcoming.map((w) => <InspCard key={w.id} w={w} />)}
            </div>
          </div>}
          {completed.length > 0 && <div>
            <h2 className="text-sm font-bold mb-2 text-muted-foreground uppercase tracking-wider">Completed ({completed.length})</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {completed.map((w) => <InspCard key={w.id} w={w} />)}
            </div>
          </div>}
        </div>
      )}
    </div>
  );
}

function InspCard({ w }: { w: WO }) {
  return (
    <Card className="border-0 shadow-card">
      <CardContent className="p-4 space-y-2">
        <Link to="/work-orders/$id" params={{ id: w.id }} className="font-medium hover:underline truncate block">{w.title}</Link>
        <div className="text-xs text-muted-foreground truncate">{[w.properties?.address, w.properties?.city].filter(Boolean).join(", ")}</div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{w.scheduled_for ? new Date(w.scheduled_for).toLocaleDateString() : "Unscheduled"}</span>
          <Badge variant="outline" className="capitalize">{w.status.replace("_"," ")}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
