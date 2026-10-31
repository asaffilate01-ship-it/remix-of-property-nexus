import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { collectPages } from "@/lib/portfolio-summary";
import { summarizeTenantRent, type TenantRentSummary } from "@/lib/tenant-rent";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Home, PoundSterling, Wrench, FileText, Search, Sparkles, ArrowRight, Shield, ClipboardList } from "lucide-react";

type Tenancy = {
  id: string; tenant_name: string; rent_amount: number; rent_frequency: string;
  start_date: string; end_date: string | null; status: string;
  property: { address_line1: string | null; city: string | null; postcode: string | null } | null;
};

export function TenantDashboard({ name, userId }: { name: string; userId: string | null }) {
  const [tenancies, setTenancies] = useState<Tenancy[]>([]);
  const [summary, setSummary] = useState<TenantRentSummary>({
    nextDue: null, overdueCount: 0, overdueAmount: 0,
  });
  const [openRequests, setOpenRequests] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    void (async () => {
      try {
        if (!userId) throw new Error("User unavailable");
        const { data: tn, error: tenancyError } = await supabase
          .from("tenancies")
          .select("id,tenant_name,rent_amount,rent_frequency,start_date,end_date,status,property:properties(address_line1,city,postcode)")
          .eq("tenant_user_id", userId);
        if (tenancyError) throw tenancyError;
        const ids = (tn ?? []).map((row) => row.id);
        let rentSummary: TenantRentSummary = { nextDue: null, overdueCount: 0, overdueAmount: 0 };
        let requestCount = 0;
        if (ids.length > 0) {
          const [rentRows, requests] = await Promise.all([
            collectPages((from, to) => supabase
              .from("rent_schedule")
              .select("id,due_date,amount,paid_amount,status")
              .in("tenancy_id", ids)
              .order("due_date")
              .order("id")
              .range(from, to)),
            supabase.from("work_orders")
              .select("id", { count: "exact", head: true })
              .in("tenancy_id", ids)
              .neq("status", "completed"),
          ]);
          if (requests.error) throw requests.error;
          const today = new Date().toLocaleDateString("en-CA", {
            timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit",
          });
          rentSummary = summarizeTenantRent(rentRows, today);
          requestCount = requests.count ?? 0;
        }
        if (!active) return;
        setTenancies((tn as unknown as Tenancy[]) ?? []);
        setSummary(rentSummary);
        setOpenRequests(requestCount);
      } catch {
        if (active) {
          setError(true);
          setTenancies([]);
          setSummary({ nextDue: null, overdueCount: 0, overdueAmount: 0 });
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [userId, reload]);

  if (loading) {
    return <div role="status" aria-live="polite" className="rounded-xl border bg-card p-8 text-sm text-muted-foreground">Loading your tenancy and rent schedule…</div>;
  }
  if (error) {
    return (
      <div role="alert" className="space-y-3 rounded-xl border bg-card p-8">
        <h2 className="text-lg font-semibold">Tenancy details are unavailable</h2>
        <p className="text-sm text-muted-foreground">We couldn't confirm the latest rent and repair information. No figures are shown until it loads.</p>
        <Button type="button" onClick={() => setReload((value) => value + 1)}>Try again</Button>
      </div>
    );
  }

  const active = tenancies.find((tenancy) => tenancy.status === "active") ?? tenancies[0];
  if (!active) {
    return (
      <div className="rounded-2xl border bg-card p-8 sm:p-12">
        <Home className="mb-4 h-8 w-8 text-primary" aria-hidden="true" />
        <h1 className="text-2xl font-semibold">Your tenancy will appear here</h1>
        <p className="mt-2 max-w-prose text-sm text-muted-foreground">No tenancy is linked to your account yet. Ask your letting agent to confirm your invitation and account email.</p>
        <Button asChild className="mt-5"><Link to="/inbox">Open messages</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-accent/10 p-6 sm:p-8 shadow-card">
        <div className="inline-flex items-center gap-2 rounded-full border bg-card/70 backdrop-blur px-3 py-1 text-xs font-medium mb-3">
          <Sparkles className="h-3 w-3 text-accent" /> Tenant portal
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Hi{name ? `, ${name.split(" ")[0]}` : ""}.</h1>
        <p className="text-muted-foreground mt-1">Your home, rent and requests in one place.</p>
      </div>

      {active && (
        <Card className="border-0 shadow-card">
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Home className="h-4 w-4" /> Your home</div>
            <div className="text-xl font-semibold">
              {active.property?.address_line1 ?? "Address pending"}
              {active.property?.city ? `, ${active.property.city}` : ""}
              {active.property?.postcode ? ` ${active.property.postcode}` : ""}
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <Badge variant="outline">{active.status}</Badge>
              <span className="text-muted-foreground">Tenancy from {new Date(active.start_date).toLocaleDateString("en-GB")}</span>
              {active.end_date && <span className="text-muted-foreground">to {new Date(active.end_date).toLocaleDateString("en-GB")}</span>}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="rent" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="rent" className="gap-1.5"><PoundSterling className="h-3.5 w-3.5" /> Rent & Payments</TabsTrigger>
          <TabsTrigger value="actions" className="gap-1.5"><Wrench className="h-3.5 w-3.5" /> Actions</TabsTrigger>
          <TabsTrigger value="docs" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="rent" className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <Card className="border-0 shadow-card">
              <CardContent className="p-5">
                <PoundSterling className="h-5 w-5 mb-2 text-accent" />
                <div className="text-2xl font-bold">{summary.nextDue ? `£${summary.nextDue.amount_due.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}</div>
                <div className="text-xs text-muted-foreground">{summary.nextDue ? `Outstanding on ${new Date(summary.nextDue.due_date).toLocaleDateString("en-GB")}` : "No upcoming outstanding charges"}</div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-card">
              <CardContent className="p-5">
                <PoundSterling className={`h-5 w-5 mb-2 ${summary.overdueCount ? "text-destructive" : "text-muted-foreground"}`} />
                <div className="text-2xl font-bold">{summary.overdueCount}</div>
                <div className="text-xs text-muted-foreground">Overdue charges · £{summary.overdueAmount.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} remaining</div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-card">
              <CardContent className="p-5">
                <Wrench className="h-5 w-5 mb-2 text-accent" />
                <div className="text-2xl font-bold">{openRequests}</div>
                <div className="text-xs text-muted-foreground">Open requests</div>
              </CardContent>
            </Card>
          </div>
          <Card className="border-0 shadow-card bg-gradient-to-br from-primary/5 to-accent/5">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-2">Rent schedule and payments</h3>
              <p className="text-sm text-muted-foreground">Review recorded rent charges, payments and available payment actions in your tenant portal.</p>
              <Button asChild variant="outline" size="sm" className="mt-3"><Link to="/portal/tenant">Open rent schedule <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="border-0 shadow-card bg-gradient-to-br from-primary/5 to-accent/5">
              <CardContent className="p-6">
                <h2 className="font-semibold mb-2 flex items-center gap-2"><Wrench className="h-4 w-4" /> Report an issue</h2>
                <p className="text-sm text-muted-foreground mb-4">Need a repair? Let your landlord or agent know.</p>
                <Button asChild><Link to="/work-orders">Raise a request <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-card">
              <CardContent className="p-6">
                <h2 className="font-semibold mb-2 flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Inspection reports</h2>
                <p className="text-sm text-muted-foreground mb-4">View check-in, periodic and check-out reports.</p>
                <Button asChild variant="outline"><Link to="/inspections">View reports</Link></Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="docs" className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="border-0 shadow-card">
              <CardContent className="p-6">
                <h2 className="font-semibold mb-2 flex items-center gap-2"><FileText className="h-4 w-4" /> Tenancy documents</h2>
                <p className="text-sm text-muted-foreground mb-4">Tenancy agreement, deposit certificate and safety records.</p>
                <Button asChild variant="outline"><Link to="/compliance">View documents</Link></Button>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-card">
              <CardContent className="p-6">
                <h2 className="font-semibold mb-2 flex items-center gap-2"><Shield className="h-4 w-4" /> Deposit protection</h2>
                <p className="text-sm text-muted-foreground mb-4">Check your deposit status and prescribed information.</p>
                <Button asChild variant="outline"><Link to="/deposits">View deposit</Link></Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
