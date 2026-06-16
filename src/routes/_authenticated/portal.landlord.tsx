import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, PoundSterling, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_authenticated/portal/landlord")({
  component: LandlordPortal,
});

function LandlordPortal() {
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<any[]>([]);
  const [tenancies, setTenancies] = useState<any[]>([]);
  const [rentMonth, setRentMonth] = useState(0);
  const [compliance, setCompliance] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: props } = await supabase
        .from("properties")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });
      setProperties(props ?? []);
      const ids = (props ?? []).map((p) => p.id);
      if (ids.length > 0) {
        const [{ data: ts }, { data: comp }] = await Promise.all([
          supabase.from("tenancies").select("*, properties(title,address)").in("property_id", ids),
          supabase.from("compliance_records").select("*").in("property_id", ids).order("expires_at", { ascending: true }),
        ]);
        setTenancies(ts ?? []);
        setCompliance(comp ?? []);
        const tids = (ts ?? []).map((t) => t.id);
        if (tids.length > 0) {
          const start = new Date(); start.setDate(1);
          const { data: rs } = await supabase.from("rent_schedule")
            .select("amount,paid_amount,paid_at,status")
            .in("tenancy_id", tids).eq("status", "paid")
            .gte("paid_at", start.toISOString());
          setRentMonth((rs ?? []).reduce((s, r) => s + Number(r.paid_amount ?? r.amount ?? 0), 0));
        }
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="p-8 text-muted-foreground">Loading…</div>;

  const expiring = compliance.filter((c) => c.expires_at && new Date(c.expires_at) < new Date(Date.now() + 30 * 864e5));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Landlord portal</h1>

      <div className="grid md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Building2 className="h-4 w-4" />Properties</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{properties.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Users className="h-4 w-4" />Active tenancies</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{tenancies.filter((t) => t.status === "active").length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><PoundSterling className="h-4 w-4" />This month</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">£{rentMonth.toLocaleString()}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><ShieldAlert className="h-4 w-4" />Expiring soon</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{expiring.length}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Tenancies</CardTitle></CardHeader>
        <CardContent>
          {tenancies.length === 0 && <div className="text-sm text-muted-foreground">No tenancies yet.</div>}
          <div className="space-y-2">
            {tenancies.map((t) => (
              <div key={t.id} className="flex items-center justify-between border rounded px-3 py-2 text-sm">
                <div>
                  <div className="font-medium">{t.properties?.title ?? "Property"}</div>
                  <div className="text-xs text-muted-foreground">{t.tenant_name ?? "—"} · £{Number(t.rent_amount ?? 0).toLocaleString()} {t.rent_frequency}</div>
                </div>
                <Badge>{t.status}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Compliance expiring (30 days)</CardTitle></CardHeader>
        <CardContent>
          {expiring.length === 0 && <div className="text-sm text-muted-foreground">All up to date.</div>}
          <div className="space-y-2">
            {expiring.map((c) => (
              <div key={c.id} className="flex items-center justify-between border rounded px-3 py-2 text-sm">
                <span>{c.cert_type}</span>
                <Badge variant="destructive">{c.expires_at}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
