import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Building2, Tag, Inbox, Wrench, ShieldCheck, Home, Banknote, Download } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports — Estately" }] }),
  component: ReportsPage,
});

function toCSV(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return "";
  const cols = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const esc = (v: unknown) => {
    if (v == null) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

function downloadCSV(filename: string, rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) {
    toast.info("Nothing to export");
    return;
  }
  const blob = new Blob([toCSV(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function exportTable(table: "properties" | "listings" | "tenancies" | "leads" | "work_orders" | "rent_schedule") {
  const { data, error } = await supabase.from(table).select("*").limit(5000);
  if (error) {
    toast.error(error.message);
    return;
  }
  downloadCSV(`${table}-${new Date().toISOString().slice(0, 10)}.csv`, (data ?? []) as Array<Record<string, unknown>>);
}


type Stat = { label: string; value: number | string; icon: typeof BarChart3; sub?: string };

function ReportsPage() {
  const [stats, setStats] = useState<Stat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const counts = await Promise.all([
        supabase.from("properties").select("id", { count: "exact", head: true }),
        supabase.from("listings").select("id", { count: "exact", head: true }),
        supabase.from("tenancies").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("leads").select("id", { count: "exact", head: true }).neq("status", "closed_lost").neq("status", "closed_won"),
        supabase.from("work_orders").select("id", { count: "exact", head: true }).in("status", ["open", "in_progress"]),
        supabase.from("compliance_records").select("id", { count: "exact", head: true }).lt("expires_on", new Date().toISOString().slice(0, 10)),
      ]);
      const [props, lists, tens, leads, wos, expired] = counts.map((r) => r.count ?? 0);

      const [{ data: rent }, { data: arr }] = await Promise.all([
        supabase.from("rent_schedule").select("amount, paid_at").gte("due_date", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)),
        supabase.from("rent_schedule").select("amount").is("paid_at", null).lte("due_date", new Date().toISOString().slice(0, 10)),
      ]);
      const rentReceived = (rent ?? []).filter((r: any) => r.paid_at).reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0);
      const arrears = (arr ?? []).reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0);

      setStats([
        { label: "Properties", value: props, icon: Building2 },
        { label: "Live listings", value: lists, icon: Tag },
        { label: "Active tenancies", value: tens, icon: Home },
        { label: "Open leads", value: leads, icon: Inbox },
        { label: "Open work orders", value: wos, icon: Wrench },
        { label: "Expired compliance", value: expired, icon: ShieldCheck, sub: expired ? "Needs attention" : "All current" },
        { label: "Rent received this month", value: `£${rentReceived.toLocaleString()}`, icon: Banknote },
        { label: "Arrears outstanding", value: `£${arrears.toLocaleString()}`, icon: Banknote, sub: arrears ? "Overdue" : "Up to date" },
      ]);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Portfolio at a glance — counts and cash flow from your live data." />

      <Card className="border-0 shadow-card">
        <CardContent className="p-4 flex flex-wrap items-center gap-2">
          <div className="text-sm font-medium mr-2 flex items-center gap-2"><Download className="h-4 w-4" /> Export CSV</div>
          {(["properties", "listings", "tenancies", "leads", "work_orders", "rent_schedule"] as const).map((t) => (
            <Button key={t} size="sm" variant="outline" onClick={() => exportTable(t)}>{t.replace("_", " ")}</Button>
          ))}
        </CardContent>
      </Card>


      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Array.from({ length: 8 }).map((_, i) => <Card key={i} className="animate-pulse"><CardContent className="h-24" /></Card>)}</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((s) => (
            <Card key={s.label} className="border-0 shadow-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2"><div className="text-xs text-muted-foreground">{s.label}</div><s.icon className="h-4 w-4 opacity-40" /></div>
                <div className="text-2xl font-bold">{s.value}</div>
                {s.sub && <div className="text-xs text-muted-foreground mt-1">{s.sub}</div>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
