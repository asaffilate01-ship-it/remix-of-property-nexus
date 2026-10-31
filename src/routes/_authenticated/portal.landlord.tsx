import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { collectPages, summarizeRent, type RentItem } from "@/lib/portfolio-summary";
import { currentLondonMonth } from "@/lib/owner-statement";
import { currentLondonDate } from "@/lib/tenant-rent";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { Building2, Users, PoundSterling, ShieldAlert, RefreshCw, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/portal/landlord")({
  head: () => ({ meta: [{ title: "Landlord portfolio — Gabley" }] }),
  component: LandlordPortal,
});

type OwnedProperty = { id: string; title: string; address: string | null };
type OwnedTenancy = {
  id: string; property_id: string; tenant_name: string; rent_amount: number;
  rent_frequency: string; status: string; properties: { title: string } | null;
};
type ComplianceRow = { id: string; type: string; expires_on: string | null; status: string };
type Portfolio = {
  properties: OwnedProperty[];
  tenancies: OwnedTenancy[];
  compliance: ComplianceRow[];
  expected: number;
  applied: number;
  overdue: number;
  overdueCount: number;
};
const money = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });

/** Query by 75 IDs to avoid oversized PostgREST URLs; paginate every batch. */
async function collectByIds<T>(
  ids: string[],
  load: (ids: string[], from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const unique = [...new Set(ids)];
  const all: T[] = [];
  for (let i = 0; i < unique.length; i += 75) {
    const batch = unique.slice(i, i + 75);
    all.push(...await collectPages((from, to) => load(batch, from, to)));
  }
  return all;
}

function LandlordPortal() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const month = currentLondonMonth();

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setPortfolio(null);
    void (async () => {
      try {
        const { data: auth, error: authError } = await supabase.auth.getUser();
        if (authError || !auth.user) throw new Error("Your sign-in could not be verified.");
        const properties = await collectPages(async (from, to) => {
          const response = await supabase.from("properties")
            .select("id,title,address")
            .eq("owner_id", auth.user.id)
            .order("id")
            .range(from, to);
          return { data: response.data as OwnedProperty[] | null, error: response.error };
        });
        const propertyIds = properties.map((property) => property.id);
        const [tenancies, compliance] = await Promise.all([
          collectByIds<OwnedTenancy>(propertyIds, async (ids, from, to) => {
            const response = await supabase.from("tenancies")
              .select("id,property_id,tenant_name,rent_amount,rent_frequency,status,properties(title)")
              .in("property_id", ids)
              .order("id")
              .range(from, to);
            return { data: response.data as unknown as OwnedTenancy[] | null, error: response.error };
          }),
          collectByIds<ComplianceRow>(propertyIds, async (ids, from, to) => {
            const response = await supabase.from("compliance_records")
              .select("id,type,expires_on,status")
              .in("property_id", ids)
              .order("id")
              .range(from, to);
            return { data: response.data as ComplianceRow[] | null, error: response.error };
          }),
        ]);
        const rents = await collectByIds<RentItem>(tenancies.map((tenancy) => tenancy.id), async (ids, from, to) => {
          const response = await supabase.from("rent_schedule")
            .select("id,amount,paid_amount,due_date,status")
            .in("tenancy_id", ids)
            .order("id")
            .range(from, to);
          return { data: response.data as RentItem[] | null, error: response.error };
        });
        const summary = summarizeRent(rents, currentLondonMonth(), currentLondonDate());
        if (!active) return;
        setPortfolio({
          properties, tenancies, compliance,
          expected: summary.expected, applied: summary.received,
          overdue: summary.overdue, overdueCount: summary.overdueCount,
        });
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Unable to load your portfolio.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [reload]);

  if (loading) return <div role="status" aria-live="polite" className="rounded-xl border bg-card p-8 text-sm text-muted-foreground">Loading your owned properties, tenancies and rent charges…</div>;
  if (error || !portfolio) return (
    <div role="alert" className="space-y-3 rounded-xl border bg-card p-8">
      <h1 className="text-lg font-semibold">Your landlord portfolio is unavailable</h1>
      <p className="text-sm text-muted-foreground">{error ?? "The latest figures could not be verified."} No balances are shown until the data is available.</p>
      <Button onClick={() => setReload((value) => value + 1)}><RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" /> Try again</Button>
    </div>
  );

  const today = currentLondonDate();
  const within30Days = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const expiring = portfolio.compliance.filter((item) => item.expires_on && item.expires_on <= within30Days);
  const activeTenancies = portfolio.tenancies.filter((item) => item.status === "active").length;

  return (
    <div className="space-y-6">
      <PageHeader title="Landlord portfolio" description="Your owned properties, active tenancies and compliance alerts."
        actions={<Button asChild variant="outline"><Link to="/statements">Review charges <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" /></Link></Button>}
      />
      <div className="rounded-xl border bg-muted/50 p-4 text-sm text-muted-foreground">
        <strong className="text-foreground">Rent figures are charge allocations, not bank receipts.</strong>
        Applied means recorded against charges due in {month}; overdue covers outstanding charges from all dates.
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm text-muted-foreground"><Building2 className="h-4 w-4" aria-hidden="true" />Properties</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{portfolio.properties.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm text-muted-foreground"><Users className="h-4 w-4" aria-hidden="true" />Active tenancies</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{activeTenancies}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm text-muted-foreground"><PoundSterling className="h-4 w-4" aria-hidden="true" />Charged in {month}</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-semibold tabular">{money.format(portfolio.expected)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm text-muted-foreground"><PoundSterling className="h-4 w-4" aria-hidden="true" />Applied to {month} charges</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-semibold tabular">{money.format(portfolio.applied)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldAlert className="h-4 w-4" aria-hidden="true" />Overdue across charges</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-semibold tabular">{money.format(portfolio.overdue)}</p><p className="text-xs text-muted-foreground">{portfolio.overdueCount} rent lines</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Tenancies</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {portfolio.tenancies.length === 0 && <p className="text-sm text-muted-foreground">No tenancies linked to these properties.</p>}
          {portfolio.tenancies.slice(0, 30).map((tenancy) => (
            <div key={tenancy.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium">{tenancy.properties?.title ?? "Property"}</p>
                <p className="text-xs text-muted-foreground">{tenancy.tenant_name} · {money.format(tenancy.rent_amount)} <span className="capitalize">{tenancy.rent_frequency}</span></p>
              </div>
              <Badge variant="outline" className="capitalize">{tenancy.status.replaceAll("_", " ")}</Badge>
            </div>
          ))}
          {portfolio.tenancies.length > 30 && <p className="text-xs text-muted-foreground">Showing 30 of {portfolio.tenancies.length} tenancies. Open the Tenancies workspace for the full list.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Compliance: expiring or expired within 30 days</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {expiring.length === 0 && <p className="text-sm text-muted-foreground">No dated compliance records require attention within the next 30 days. Check that required evidence is complete.</p>}
          {expiring.slice(0, 20).map((item) => (
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm">
              <span>{item.type.replaceAll("_", " ")}</span>
              <Badge variant={item.expires_on && item.expires_on < today ? "destructive" : "outline"}>{item.expires_on}</Badge>
            </div>
          ))}
          {expiring.length > 20 && <p className="text-xs text-muted-foreground">Showing 20 of {expiring.length} dated compliance records requiring attention.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
