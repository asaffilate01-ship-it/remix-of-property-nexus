import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, Building2, Tag, Inbox, Wrench, ShieldCheck, Home, Banknote } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports — Estately" }] }),
  component: ReportsPage,
});

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
        supabase.from("rent_schedule").select("amount, paid_on").gte("due_on", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)),
        supabase.from("rent_schedule").select("amount").is("paid_on", null).lte("due_on", new Date().toISOString().slice(0, 10)),
      ]);
      const rentReceived = (rent ?? []).filter((r: any) => r.paid_on).reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0);
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
