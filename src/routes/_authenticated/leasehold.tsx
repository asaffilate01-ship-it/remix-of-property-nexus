import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Landmark } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/leasehold")({
  head: () => ({ meta: [{ title: "Leasehold register — Estately" }] }),
  component: LeaseholdPage,
});

type Listing = { id: string; title: string | null; address: string | null; city: string | null; postcode: string | null; tenure: string | null; lease_term_months: number | null; service_charge_pa: number | null };

function LeaseholdPage() {
  const [rows, setRows] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("listings")
        .select("id, title, address, city, postcode, tenure, lease_term_months, service_charge_pa")
        .eq("tenure", "leasehold");
      setRows((data as any) ?? []); setLoading(false);
    })();
  }, []);

  const years = (m: number | null) => m ? Math.round(m / 12) : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Leasehold register" description="Leasehold listings with remaining term and service charge." />

      {loading ? <Card className="animate-pulse"><CardContent className="h-32" /></Card> :
       rows.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent"><CardContent className="p-12 text-center text-muted-foreground"><Landmark className="mx-auto h-10 w-10 mb-3 opacity-40" /><div>No leasehold listings on file.</div></CardContent></Card>
      ) : (
        <Card className="border-0 shadow-card"><CardContent className="p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-xs text-muted-foreground"><th className="text-left p-3">Listing</th><th className="text-right p-3">Years left</th><th className="text-right p-3">Service charge p.a.</th></tr></thead>
            <tbody>
              {rows.map((p) => {
                const yrs = years(p.lease_term_months);
                return (
                  <tr key={p.id} className="border-b hover:bg-muted/30">
                    <td className="p-3"><Link to="/listings" className="font-medium hover:underline">{p.title || [p.address, p.city].filter(Boolean).join(", ")}</Link><div className="text-xs text-muted-foreground">{p.postcode}</div></td>
                    <td className="p-3 text-right">{yrs ?? "—"}{yrs !== null && yrs < 80 && <Badge variant="outline" className="ml-2 border-red-300 text-red-700">Short</Badge>}</td>
                    <td className="p-3 text-right">{p.service_charge_pa ? `£${Number(p.service_charge_pa).toLocaleString()}` : "—"}</td>
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
