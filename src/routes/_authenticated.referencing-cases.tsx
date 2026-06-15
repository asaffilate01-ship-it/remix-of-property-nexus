import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/referencing-cases")({
  head: () => ({ meta: [{ title: "Referencing — Estately" }] }),
  component: ReferencingPage,
});

type Case = { id: string; status: string; current_step: number; decision: string | null; income_monthly: number | null; created_at: string; tenants: { full_name: string | null } | null; properties: { address: string | null; city: string | null } | null };

function ReferencingPage() {
  const [rows, setRows] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("referencing_cases")
        .select("id, status, current_step, decision, income_monthly, created_at, tenants(full_name), properties(address, city)")
        .order("created_at", { ascending: false });
      setRows((data as any) ?? []); setLoading(false);
    })();
  }, []);

  const tone = (d: string | null, s: string) =>
    d === "pass" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
    d === "fail" ? "bg-red-50 text-red-700 border-red-200" :
    s === "in_progress" ? "bg-blue-50 text-blue-700 border-blue-200" :
    "bg-amber-50 text-amber-700 border-amber-200";

  return (
    <div className="space-y-6">
      <PageHeader title="Referencing" description="Tenant referencing cases — identity, employment, affordability." actions={
        <Button asChild><Link to="/tenants"><Plus className="mr-2 h-4 w-4" /> New case</Link></Button>
      } />

      {loading ? <Card className="animate-pulse"><CardContent className="h-32" /></Card> :
       rows.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent"><CardContent className="p-12 text-center text-muted-foreground"><ClipboardCheck className="mx-auto h-10 w-10 mb-3 opacity-40" /><div>No referencing cases yet.</div></CardContent></Card>
      ) : (
        <Card className="border-0 shadow-card"><CardContent className="p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-xs text-muted-foreground"><th className="text-left p-3">Applicant</th><th className="text-left p-3">Property</th><th className="text-right p-3">Income/mo</th><th className="text-left p-3">Step</th><th className="text-left p-3">Status</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b hover:bg-muted/30">
                  <td className="p-3 font-medium">{r.tenants?.full_name ?? "—"}</td>
                  <td className="p-3 text-xs text-muted-foreground">{[r.properties?.address, r.properties?.city].filter(Boolean).join(", ")}</td>
                  <td className="p-3 text-right">{r.income_monthly ? `£${Number(r.income_monthly).toLocaleString()}` : "—"}</td>
                  <td className="p-3 text-xs">{r.current_step ?? 0}/5</td>
                  <td className="p-3"><Badge className={`${tone(r.decision, r.status)} border`} variant="outline">{r.decision ?? r.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
      )}
    </div>
  );
}
