import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Vault } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/deposits")({
  head: () => ({ meta: [{ title: "Deposits — Gabley" }] }),
  component: DepositsPage,
});

type Row = { id: string; deposit: number | null; deposit_scheme: string | null; deposit_reference: string | null; start_date: string | null; status: string; tenants: { full_name: string | null } | null; properties: { address: string | null; city: string | null } | null };

function DepositsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("tenancies")
        .select("id, deposit, deposit_scheme, deposit_reference, start_date, status, tenants(full_name), properties(address, city)")
        .not("deposit", "is", null)
        .order("start_date", { ascending: false });
      setRows((data as any) ?? []);
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const total = rows.reduce((s, r) => s + Number(r.deposit ?? 0), 0);
    const protectedCount = rows.filter((r) => r.deposit_reference).length;
    const unprotected = rows.length - protectedCount;
    return { total, count: rows.length, protectedCount, unprotected };
  }, [rows]);

  return (
    <div className="space-y-6">
      <PageHeader title="Deposits" description="Protected deposits across all tenancies — amount, scheme and reference." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-0 shadow-card"><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total held</div><div className="text-xl font-bold">£{stats.total.toLocaleString()}</div></CardContent></Card>
        <Card className="border-0 shadow-card"><CardContent className="p-4"><div className="text-xs text-muted-foreground">Tenancies</div><div className="text-xl font-bold">{stats.count}</div></CardContent></Card>
        <Card className="border-0 shadow-card"><CardContent className="p-4"><div className="text-xs text-muted-foreground">With reference</div><div className="text-xl font-bold text-emerald-600">{stats.protectedCount}</div></CardContent></Card>
        <Card className="border-0 shadow-card"><CardContent className="p-4"><div className="text-xs text-muted-foreground">Missing reference</div><div className={`text-xl font-bold ${stats.unprotected ? "text-amber-600" : ""}`}>{stats.unprotected}</div></CardContent></Card>
      </div>

      {loading ? <Card className="animate-pulse"><CardContent className="h-32" /></Card> :
       rows.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent"><CardContent className="p-12 text-center text-muted-foreground"><Vault className="mx-auto h-10 w-10 mb-3 opacity-40" /><div>No deposits recorded. Add deposit details on a tenancy.</div></CardContent></Card>
      ) : (
        <Card className="border-0 shadow-card"><CardContent className="p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-xs text-muted-foreground"><th className="text-left p-3">Tenant</th><th className="text-left p-3">Property</th><th className="text-right p-3">Amount</th><th className="text-left p-3">Scheme</th><th className="text-left p-3">Reference</th><th className="text-left p-3">Status</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b hover:bg-muted/30">
                  <td className="p-3 font-medium">{r.tenants?.full_name ?? "—"}</td>
                  <td className="p-3 text-xs text-muted-foreground">{[r.properties?.address, r.properties?.city].filter(Boolean).join(", ")}</td>
                  <td className="p-3 text-right font-medium">£{Number(r.deposit).toLocaleString()}</td>
                  <td className="p-3">{r.deposit_scheme ?? "—"}</td>
                  <td className="p-3 text-xs">{r.deposit_reference ?? <Badge variant="outline" className="border-amber-300 text-amber-700">Missing</Badge>}</td>
                  <td className="p-3"><Badge variant="outline" className="capitalize">{r.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
      )}
    </div>
  );
}
