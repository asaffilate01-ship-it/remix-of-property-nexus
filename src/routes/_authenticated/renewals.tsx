import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCcw, CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/renewals")({
  head: () => ({ meta: [{ title: "Renewals — Estately" }] }),
  component: RenewalsPage,
});

type Row = { id: string; end_date: string | null; rent_amount: number; status: string; properties: { address: string | null; city: string | null } | null; tenants: { full_name: string | null } | null };

function RenewalsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() + 4);
      const { data } = await supabase
        .from("tenancies")
        .select("id, end_date, rent_amount, status, properties(address, city), tenants(full_name)")
        .in("status", ["active"] as any)
        .lte("end_date", cutoff.toISOString().slice(0, 10))
        .order("end_date");
      setRows((data as any) ?? []);
      setLoading(false);
    })();
  }, []);

  const daysUntil = (d: string | null) => d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) : 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Renewals" description="Tenancies ending within 4 months — start renewals or serve notice in time." />

      {loading ? <Card className="animate-pulse"><CardContent className="h-32" /></Card> :
       rows.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent"><CardContent className="p-12 text-center text-muted-foreground"><RefreshCcw className="mx-auto h-10 w-10 mb-3 opacity-40" /><div>No tenancies ending soon.</div></CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((r) => {
            const days = daysUntil(r.end_date);
            const tone = days < 30 ? "bg-red-50 text-red-700 border-red-200" : days < 90 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-blue-50 text-blue-700 border-blue-200";
            return (
              <Card key={r.id} className="border-0 shadow-card">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{r.tenants?.full_name ?? "Tenant"}</div>
                      <div className="text-xs text-muted-foreground truncate">{[r.properties?.address, r.properties?.city].filter(Boolean).join(", ")}</div>
                    </div>
                    <Badge className={`${tone} border`} variant="outline">{days}d</Badge>
                  </div>
                  <div className="text-xs flex items-center gap-1.5 text-muted-foreground"><CalendarDays className="h-3 w-3" />Ends {r.end_date ? new Date(r.end_date).toLocaleDateString() : "—"}</div>
                  <div className="text-sm">£{Number(r.rent_amount).toLocaleString()} / period</div>
                  <Button asChild size="sm" variant="outline" className="w-full"><Link to="/tenancies/$id" params={{ id: r.id }}>Open tenancy</Link></Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
