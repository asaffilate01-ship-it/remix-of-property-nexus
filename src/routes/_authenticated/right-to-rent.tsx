import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserCheck, Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/right-to-rent")({
  head: () => ({ meta: [{ title: "Right to Rent — Estately" }] }),
  component: RtrPage,
});

type Row = { id: string; type: string; status: string; issued_on: string | null; expires_on: string | null; reference: string | null; properties: { address: string | null; city: string | null } | null };

function RtrPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("compliance_records")
        .select("id, type, status, issued_on, expires_on, reference, properties(address, city)")
        .in("type", ["right_to_rent", "right_to_rent_followup"])
        .order("expires_on", { nullsFirst: false });
      setRows((data as any) ?? []); setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Right to Rent" description="Statutory tenant identity checks (England)." actions={
        <Button asChild><Link to="/compliance"><Plus className="mr-2 h-4 w-4" /> Add check</Link></Button>
      } />

      {loading ? <Card className="animate-pulse"><CardContent className="h-32" /></Card> :
       rows.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent"><CardContent className="p-12 text-center text-muted-foreground"><UserCheck className="mx-auto h-10 w-10 mb-3 opacity-40" /><div>No Right to Rent checks recorded yet.</div></CardContent></Card>
      ) : (
        <Card className="border-0 shadow-card"><CardContent className="p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-xs text-muted-foreground"><th className="text-left p-3">Property</th><th className="text-left p-3">Type</th><th className="text-left p-3">Reference</th><th className="text-left p-3">Issued</th><th className="text-left p-3">Followup</th><th className="text-left p-3">Status</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b hover:bg-muted/30">
                  <td className="p-3 font-medium">{[r.properties?.address, r.properties?.city].filter(Boolean).join(", ")}</td>
                  <td className="p-3 text-xs">{r.type.replaceAll("_"," ")}</td>
                  <td className="p-3 text-xs">{r.reference ?? "—"}</td>
                  <td className="p-3 text-xs">{r.issued_on ? new Date(r.issued_on).toLocaleDateString() : "—"}</td>
                  <td className="p-3 text-xs">{r.expires_on ? new Date(r.expires_on).toLocaleDateString() : "—"}</td>
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
