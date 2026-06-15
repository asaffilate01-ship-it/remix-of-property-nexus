import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Banknote, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/arrears")({
  head: () => ({ meta: [{ title: "Arrears — Estately" }] }),
  component: ArrearsPage,
});

type Row = { tenancy_id: string; property: string; tenant: string; due_total: number; oldest_due: string | null; periods: number };

function ArrearsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("rent_schedule")
        .select("tenancy_id, due_on, amount, paid_on, tenancies(properties(address, city), tenants(full_name))")
        .is("paid_at", null)
        .lte("due_date", new Date().toISOString().slice(0, 10));
      if (error) { setLoading(false); return; }
      const map = new Map<string, Row>();
      for (const r of (data as any[]) ?? []) {
        const id = r.tenancy_id;
        const cur = map.get(id) ?? {
          tenancy_id: id,
          property: [r.tenancies?.properties?.address, r.tenancies?.properties?.city].filter(Boolean).join(", ") || "Unknown property",
          tenant: r.tenancies?.tenants?.full_name ?? "Tenant",
          due_total: 0, oldest_due: r.due_date, periods: 0,
        };
        cur.due_total += Number(r.amount ?? 0);
        cur.periods += 1;
        if (!cur.oldest_due || r.due_date < cur.oldest_due) cur.oldest_due = r.due_date;
        map.set(id, cur);
      }
      setRows(Array.from(map.values()).sort((a, b) => b.due_total - a.due_total));
      setLoading(false);
    })();
  }, []);

  const total = useMemo(() => rows.reduce((s, r) => s + r.due_total, 0), [rows]);
  const daysAgo = (d: string | null) => d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Arrears" description="Tenancies with overdue rent — derived from the rent schedule." />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="border-0 shadow-card"><CardContent className="p-4"><div className="text-xs text-muted-foreground">Tenancies in arrears</div><div className="text-2xl font-bold">{rows.length}</div></CardContent></Card>
        <Card className="border-0 shadow-card"><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total owed</div><div className="text-2xl font-bold">£{total.toLocaleString()}</div></CardContent></Card>
        <Card className="border-0 shadow-card"><CardContent className="p-4"><div className="text-xs text-muted-foreground">Average debt</div><div className="text-2xl font-bold">£{rows.length ? Math.round(total / rows.length).toLocaleString() : 0}</div></CardContent></Card>
      </div>

      {loading ? (
        <Card className="animate-pulse"><CardContent className="h-32" /></Card>
      ) : rows.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent"><CardContent className="p-12 text-center text-muted-foreground"><Banknote className="mx-auto h-10 w-10 mb-3 opacity-40" /><div>No arrears — all rent paid up.</div></CardContent></Card>
      ) : (
        <Card className="border-0 shadow-card">
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-xs text-muted-foreground"><th className="text-left p-3">Tenant</th><th className="text-left p-3">Property</th><th className="text-right p-3">Periods</th><th className="text-right p-3">Oldest</th><th className="text-right p-3">Owed</th></tr></thead>
              <tbody>
                {rows.map((r) => {
                  const days = daysAgo(r.oldest_due);
                  return (
                    <tr key={r.tenancy_id} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-medium">{r.tenant}</td>
                      <td className="p-3 text-xs text-muted-foreground">{r.property}</td>
                      <td className="p-3 text-right">{r.periods}</td>
                      <td className="p-3 text-right"><Badge variant="outline" className={days > 60 ? "border-red-300 text-red-700" : days > 30 ? "border-amber-300 text-amber-700" : ""}>{days}d <AlertTriangle className="h-3 w-3 ml-1 inline" /></Badge></td>
                      <td className="p-3 text-right font-bold">£{r.due_total.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
