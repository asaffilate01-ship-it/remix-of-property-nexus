import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Vault } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/deposits")({
  head: () => ({ meta: [{ title: "Deposits — Estately" }] }),
  component: DepositsPage,
});

type Row = { id: string; deposit_amount: number | null; deposit_scheme: string | null; deposit_reference: string | null; deposit_protected_at: string | null; start_date: string | null; tenants: { full_name: string | null } | null; properties: { address: string | null; city: string | null } | null };

function DepositsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("tenancies")
        .select("id, deposit_amount, deposit_scheme, deposit_reference, deposit_protected_at, start_date, tenants(full_name), properties(address, city)")
        .not("deposit_amount", "is", null)
        .order("start_date", { ascending: false });
      setRows((data as any) ?? []);
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const total = rows.reduce((s, r) => s + Number(r.deposit_amount ?? 0), 0);
    const protectedCount = rows.filter((r) => r.deposit_protected_at).length;
    const unprotected = rows.length - protectedCount;
    return { total, count: rows.length, protectedCount, unprotected };
  }, [rows]);

  const overdueProtection = (start: string | null, protectedAt: string | null) => {
    if (protectedAt || !start) return false;
    return Date.now() - new Date(start).getTime() > 30 * 86400000;
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Deposits" description="Protected deposits across all tenancies — scheme, reference and protection deadline." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-0 shadow-card"><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total held</div><div className="text-xl font-bold">£{stats.total.toLocaleString()}</div></CardContent></Card>
        <Card className="border-0 shadow-card"><CardContent className="p-4"><div className="text-xs text-muted-foreground">Deposits</div><div className="text-xl font-bold">{stats.count}</div></CardContent></Card>
        <Card className="border-0 shadow-card"><CardContent className="p-4"><div className="text-xs text-muted-foreground">Protected</div><div className="text-xl font-bold text-emerald-600">{stats.protectedCount}</div></CardContent></Card>
        <Card className="border-0 shadow-card"><CardContent className="p-4"><div className="text-xs text-muted-foreground">Unprotected</div><div className={`text-xl font-bold ${stats.unprotected ? "text-red-600" : ""}`}>{stats.unprotected}</div></CardContent></Card>
      </div>

      {loading ? <Card className="animate-pulse"><CardContent className="h-32" /></Card> :
       rows.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent"><CardContent className="p-12 text-center text-muted-foreground"><Vault className="mx-auto h-10 w-10 mb-3 opacity-40" /><div>No deposits recorded. Add deposit details on a tenancy.</div></CardContent></Card>
      ) : (
        <Card className="border-0 shadow-card"><CardContent className="p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-xs text-muted-foreground"><th className="text-left p-3">Tenant</th><th className="text-left p-3">Property</th><th className="text-right p-3">Amount</th><th className="text-left p-3">Scheme</th><th className="text-left p-3">Reference</th><th className="text-left p-3">Status</th></tr></thead>
            <tbody>
              {rows.map((r) => {
                const overdue = overdueProtection(r.start_date, r.deposit_protected_at);
                return (
                  <tr key={r.id} className="border-b hover:bg-muted/30">
                    <td className="p-3 font-medium">{r.tenants?.full_name ?? "—"}</td>
                    <td className="p-3 text-xs text-muted-foreground">{[r.properties?.address, r.properties?.city].filter(Boolean).join(", ")}</td>
                    <td className="p-3 text-right font-medium">£{Number(r.deposit_amount).toLocaleString()}</td>
                    <td className="p-3">{r.deposit_scheme ?? "—"}</td>
                    <td className="p-3 text-xs">{r.deposit_reference ?? "—"}</td>
                    <td className="p-3">{r.deposit_protected_at ? <Badge variant="outline" className="border-emerald-300 text-emerald-700">Protected {new Date(r.deposit_protected_at).toLocaleDateString()}</Badge> : overdue ? <Badge variant="outline" className="border-red-300 text-red-700">Overdue</Badge> : <Badge variant="outline" className="border-amber-300 text-amber-700">Awaiting</Badge>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent></Card>
      )}
    </div>
  );
}
