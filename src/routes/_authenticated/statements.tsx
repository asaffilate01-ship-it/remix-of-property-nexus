import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Receipt } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/statements")({
  head: () => ({ meta: [{ title: "Owner statements — Gabley" }] }),
  component: StatementsPage,
});

type Row = { property: string; rent_received: number; rent_due: number; expenses: number; net: number };

function StatementsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const monthLabel = useMemo(() => new Date().toLocaleString("default", { month: "long", year: "numeric" }), []);

  useEffect(() => {
    (async () => {
      const start = new Date(); start.setDate(1);
      const end = new Date(start); end.setMonth(end.getMonth() + 1);
      const s = start.toISOString().slice(0, 10);
      const e = end.toISOString().slice(0, 10);

      const [rentRes, woRes] = await Promise.all([
        supabase.from("rent_schedule")
          .select("amount, paid_at, due_date, tenancies(properties(id, address, city))")
          .gte("due_date", s).lt("due_date", e),
        supabase.from("work_orders")
          .select("actual_cost, completed_at, property_id, properties(address, city)")
          .not("actual_cost", "is", null)
          .gte("completed_at", start.toISOString()).lt("completed_at", end.toISOString()),
      ]);

      const map = new Map<string, Row>();
      for (const r of (rentRes.data as any[]) ?? []) {
        const key = [r.tenancies?.properties?.address, r.tenancies?.properties?.city].filter(Boolean).join(", ") || "Unknown";
        const cur = map.get(key) ?? { property: key, rent_received: 0, rent_due: 0, expenses: 0, net: 0 };
        cur.rent_due += Number(r.amount ?? 0);
        if (r.paid_at) cur.rent_received += Number(r.amount ?? 0);
        map.set(key, cur);
      }
      for (const w of (woRes.data as any[]) ?? []) {
        const key = [w.properties?.address, w.properties?.city].filter(Boolean).join(", ") || "Unknown";
        const cur = map.get(key) ?? { property: key, rent_received: 0, rent_due: 0, expenses: 0, net: 0 };
        cur.expenses += Number(w.actual_cost ?? 0);
        map.set(key, cur);
      }
      for (const v of map.values()) v.net = v.rent_received - v.expenses;
      setRows(Array.from(map.values()).sort((a, b) => b.net - a.net));
      setLoading(false);
    })();
  }, []);

  const totals = useMemo(() => rows.reduce((s, r) => ({ rec: s.rec + r.rent_received, due: s.due + r.rent_due, exp: s.exp + r.expenses, net: s.net + r.net }), { rec: 0, due: 0, exp: 0, net: 0 }), [rows]);

  return (
    <div className="space-y-6">
      <PageHeader title="Owner statements" description={`Rent collected vs expenses — ${monthLabel}`} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-0 shadow-card"><CardContent className="p-4"><div className="text-xs text-muted-foreground">Rent due</div><div className="text-xl font-bold">£{totals.due.toLocaleString()}</div></CardContent></Card>
        <Card className="border-0 shadow-card"><CardContent className="p-4"><div className="text-xs text-muted-foreground">Received</div><div className="text-xl font-bold text-emerald-600">£{totals.rec.toLocaleString()}</div></CardContent></Card>
        <Card className="border-0 shadow-card"><CardContent className="p-4"><div className="text-xs text-muted-foreground">Expenses</div><div className="text-xl font-bold text-red-600">£{totals.exp.toLocaleString()}</div></CardContent></Card>
        <Card className="border-0 shadow-card"><CardContent className="p-4"><div className="text-xs text-muted-foreground">Net</div><div className={`text-xl font-bold ${totals.net >= 0 ? "text-foreground" : "text-red-600"}`}>£{totals.net.toLocaleString()}</div></CardContent></Card>
      </div>

      {loading ? <Card className="animate-pulse"><CardContent className="h-32" /></Card> :
       rows.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent"><CardContent className="p-12 text-center text-muted-foreground"><Receipt className="mx-auto h-10 w-10 mb-3 opacity-40" /><div>No activity this month.</div></CardContent></Card>
      ) : (
        <Card className="border-0 shadow-card"><CardContent className="p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-xs text-muted-foreground"><th className="text-left p-3">Property</th><th className="text-right p-3">Rent due</th><th className="text-right p-3">Received</th><th className="text-right p-3">Expenses</th><th className="text-right p-3">Net</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.property} className="border-b hover:bg-muted/30">
                  <td className="p-3 font-medium">{r.property}</td>
                  <td className="p-3 text-right">£{r.rent_due.toLocaleString()}</td>
                  <td className="p-3 text-right">{r.rent_received < r.rent_due ? <Badge variant="outline" className="border-amber-300 text-amber-700">£{r.rent_received.toLocaleString()}</Badge> : <>£{r.rent_received.toLocaleString()}</>}</td>
                  <td className="p-3 text-right text-red-600">£{r.expenses.toLocaleString()}</td>
                  <td className={`p-3 text-right font-bold ${r.net >= 0 ? "" : "text-red-600"}`}>£{r.net.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
      )}
    </div>
  );
}
