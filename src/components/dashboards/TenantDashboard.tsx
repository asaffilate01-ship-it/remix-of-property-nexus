import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  const [nextDue, setNextDue] = useState<{ due_date: string; amount_due: number } | null>(null);
  const [overdueCount, setOverdueCount] = useState(0);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data: tn } = await supabase
        .from("tenancies")
        .select("id,tenant_name,rent_amount,rent_frequency,start_date,end_date,status,property:properties(address_line1,city,postcode)")
        .eq("tenant_user_id", userId);
      setTenancies((tn as unknown as Tenancy[]) ?? []);
      const ids = (tn ?? []).map((t) => t.id);
      if (ids.length) {
        const { data: rs } = await supabase
          .from("rent_schedule")
          .select("due_date,amount,status")
          .in("tenancy_id", ids)
          .order("due_date", { ascending: true });
        const now = new Date();
        const upcoming = (rs ?? []).find((r) => r.status !== "paid" && new Date(r.due_date) >= now);
        setNextDue(upcoming ? { due_date: upcoming.due_date, amount_due: Number(upcoming.amount) } : null);
        setOverdueCount((rs ?? []).filter((r) => r.status !== "paid" && new Date(r.due_date) < now).length);
      }
    })();
  }, [userId]);

  const active = tenancies[0];

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
                <div className="text-2xl font-bold">{nextDue ? `£${nextDue.amount_due.toLocaleString()}` : "—"}</div>
                <div className="text-xs text-muted-foreground">{nextDue ? `Next rent due ${new Date(nextDue.due_date).toLocaleDateString("en-GB")}` : "No upcoming rent"}</div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-card">
              <CardContent className="p-5">
                <PoundSterling className={`h-5 w-5 mb-2 ${overdueCount ? "text-destructive" : "text-muted-foreground"}`} />
                <div className="text-2xl font-bold">{overdueCount}</div>
                <div className="text-xs text-muted-foreground">Overdue payments</div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-card">
              <CardContent className="p-5">
                <Wrench className="h-5 w-5 mb-2 text-accent" />
                <div className="text-2xl font-bold">—</div>
                <div className="text-xs text-muted-foreground">Open requests</div>
              </CardContent>
            </Card>
          </div>
          <Card className="border-0 shadow-card bg-gradient-to-br from-primary/5 to-accent/5">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-2">Payment history</h3>
              <p className="text-sm text-muted-foreground">View past rent payments and download statements.</p>
              <Button asChild variant="outline" size="sm" className="mt-3"><Link to="/statements">View statements <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
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
