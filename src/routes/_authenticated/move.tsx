import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PackageOpen } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/move")({
  head: () => ({ meta: [{ title: "Move in / out — Gabley" }] }),
  component: MovePage,
});

type Event = { id: string; kind: string; summary: string | null; occurred_at: string; tenancies: { properties: { address: string | null; city: string | null } | null; tenants: { full_name: string | null } | null } | null };

const MOVE_KINDS = ["moved_in","moved_out","deposit_protected","deposit_received","deposit_returned","ast_signed","references_passed"];

function MovePage() {
  const [rows, setRows] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("tenancy_events")
        .select("id, kind, summary, occurred_at, tenancies(properties(address, city), tenants(full_name))")
        .in("kind", MOVE_KINDS as any)
        .order("occurred_at", { ascending: false })
        .limit(50);
      setRows((data as any) ?? []); setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Move in / out" description="Timeline of key moments — sign, protect, hand keys, return deposits." />

      {loading ? <Card className="animate-pulse"><CardContent className="h-32" /></Card> :
       rows.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent"><CardContent className="p-12 text-center text-muted-foreground"><PackageOpen className="mx-auto h-10 w-10 mb-3 opacity-40" /><div>No move events logged yet.</div></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {rows.map((e) => (
            <Card key={e.id} className="border-0 shadow-card">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="text-xs text-muted-foreground w-24 shrink-0">{new Date(e.occurred_at).toLocaleDateString()}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{e.summary || e.kind.replaceAll("_"," ")}</div>
                  <div className="text-xs text-muted-foreground truncate">{e.tenancies?.tenants?.full_name} · {[e.tenancies?.properties?.address, e.tenancies?.properties?.city].filter(Boolean).join(", ")}</div>
                </div>
                <Badge variant="outline" className="capitalize">{e.kind.replaceAll("_"," ")}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
