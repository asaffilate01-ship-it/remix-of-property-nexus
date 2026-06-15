import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/automations/runs")({
  head: () => ({ meta: [{ title: "Automation runs — Estately" }] }),
  component: RunsPage,
});

type Run = { id: string; status: string; started_at: string; completed_at: string | null; entity_type: string; entity_id: string; track_templates: { name: string } | null };

function RunsPage() {
  const [rows, setRows] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("track_runs").select("id, status, started_at, completed_at, entity_type, entity_id, track_templates(name)").order("started_at", { ascending: false }).limit(100);
      setRows((data as any) ?? []); setLoading(false);
    })();
  }, []);

  const tone = (s: string) => s === "completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : s === "running" ? "bg-blue-50 text-blue-700 border-blue-200" : s === "failed" ? "bg-red-50 text-red-700 border-red-200" : "bg-gray-50 text-gray-600 border-gray-200";

  return (
    <div className="space-y-6">
      <PageHeader title="Automation runs" description="Recent executions of your workflow templates." actions={<Button asChild variant="outline"><Link to="/automations">Back to templates</Link></Button>} />

      {loading ? <Card className="animate-pulse"><CardContent className="h-32" /></Card> :
       rows.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent"><CardContent className="p-12 text-center text-muted-foreground"><Clock className="mx-auto h-10 w-10 mb-3 opacity-40" /><div>No automation runs yet.</div></CardContent></Card>
      ) : (
        <Card className="border-0 shadow-card"><CardContent className="p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-xs text-muted-foreground"><th className="text-left p-3">Template</th><th className="text-left p-3">Entity</th><th className="text-left p-3">Started</th><th className="text-left p-3">Completed</th><th className="text-left p-3">Status</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b hover:bg-muted/30">
                  <td className="p-3 font-medium">{r.track_templates?.name ?? "—"}</td>
                  <td className="p-3 text-xs text-muted-foreground">{r.entity_type} · {r.entity_id.slice(0, 8)}</td>
                  <td className="p-3 text-xs">{new Date(r.started_at).toLocaleString()}</td>
                  <td className="p-3 text-xs">{r.completed_at ? new Date(r.completed_at).toLocaleString() : "—"}</td>
                  <td className="p-3"><Badge className={`${tone(r.status)} border`} variant="outline">{r.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
      )}
    </div>
  );
}
