import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IsoIcon } from "@/components/iso/IsoIcon";
import {
  Building2,
  Tag,
  Inbox,
  ShieldCheck,
  Plus,
  BedDouble,
  PoundSterling,
  Users,
  Wrench,
  ArrowRight,
  Sparkles,
  TrendingUp,
  LayoutDashboard,
  Briefcase,
  Hammer,
  Activity,
} from "lucide-react";
import { collectPages, summarizeRent } from "@/lib/portfolio-summary";
import { ExpiryWidget } from "@/components/dashboards/ExpiryWidget";

type Stats = {
  properties: number;
  listings: number;
  leads: number;
  compliance: number;
  rooms: number;
  tenancies: number;
  workOrdersOpen: number;
  rentOverdue: number;
  rentCollected: number;
  rentOutstanding: number;
  rentExpected: number;
};

export function LandlordDashboard({
  name,
  agentMode = false,
}: {
  name: string;
  agentMode?: boolean;
}) {
  const [stats, setStats] = useState<Stats>({
    properties: 0,
    listings: 0,
    leads: 0,
    compliance: 0,
    rooms: 0,
    tenancies: 0,
    workOrdersOpen: 0,
    rentOverdue: 0,
    rentCollected: 0,
    rentOutstanding: 0,
    rentExpected: 0,
  });
  const [recent, setRecent] = useState<{ id: string; title: string; created_at: string }[]>([]);

  const [month, setMonth] = useState(() => new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit" }).slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
      const [p, l, ld, c, rm, tn, wo, rentRows, recentLeads] = await Promise.all([
        supabase.from("properties").select("id", { count: "exact", head: true }),
        supabase.from("listings").select("id", { count: "exact", head: true }),
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase
          .from("compliance_records")
          .select("id", { count: "exact", head: true })
          .neq("status", "valid"),
        supabase.from("rooms").select("id", { count: "exact", head: true }),
        supabase
          .from("tenancies")
          .select("id", { count: "exact", head: true })
          .eq("status", "active"),
        supabase
          .from("work_orders")
          .select("id", { count: "exact", head: true })
          .neq("status", "completed"),
        collectPages((from, to) => supabase.from("rent_schedule").select("id,status,amount,paid_amount,due_date").order("id").range(from, to)),
        supabase
          .from("leads")
          .select("id,name,created_at")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);
      for (const response of [p, l, ld, c, rm, tn, wo, recentLeads]) {
        if (response.error) throw new Error(response.error.message);
      }
      if (!active) return;
      const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });
      const summary = summarizeRent(rentRows, month, today);
      setStats({
        properties: p.count ?? 0,
        listings: l.count ?? 0,
        leads: ld.count ?? 0,
        compliance: c.count ?? 0,
        rooms: rm.count ?? 0,
        tenancies: tn.count ?? 0,
        workOrdersOpen: wo.count ?? 0,
        rentOverdue: summary.overdueCount,
        rentCollected: summary.received,
        rentOutstanding: summary.overdue,
        rentExpected: summary.expected,
      });
      setRecent(
        (recentLeads.data ?? []).map((r) => ({
          id: r.id,
          title: r.name,
          created_at: r.created_at,
        })),
      );
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Unable to load portfolio");
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [month, reload]);

  if (loading) return <div role="status" className="rounded-xl border p-8">Loading your portfolio…</div>;
  if (error) return <div role="alert" className="space-y-3 rounded-xl border p-8"><p>We couldn't load your portfolio. No balances are shown until the data is available.</p><Button onClick={() => setReload((n) => n + 1)}>Try again</Button></div>;
  const money = (value: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(value);


  const portfolioTiles = [
    {
      icon: Building2,
      label: "Properties",
      value: stats.properties,
      to: "/properties",
      tone: "from-primary/15 to-primary/5",
    },
    {
      icon: Tag,
      label: "Active listings",
      value: stats.listings,
      to: "/listings",
      tone: "from-accent/15 to-accent/5",
    },
    {
      icon: Inbox,
      label: "New leads",
      value: stats.leads,
      to: "/leads",
      tone: "from-primary/15 to-accent/5",
    },
    {
      icon: ShieldCheck,
      label: "Compliance alerts",
      value: stats.compliance,
      to: "/compliance",
      tone: "from-destructive/15 to-destructive/5",
      danger: stats.compliance > 0,
    },
  ] as const;

  const opsTiles = [
    { icon: BedDouble, label: "HMO rooms", value: stats.rooms, to: "/hmo" },
    { icon: Users, label: "Active tenancies", value: stats.tenancies, to: "/hmo" },
    { icon: Wrench, label: "Open work orders", value: stats.workOrdersOpen, to: "/work-orders" },
    {
      icon: PoundSterling,
      label: "Rent overdue",
      value: stats.rentOverdue,
      to: "/hmo",
      danger: stats.rentOverdue > 0,
    },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Hero welcome — always visible */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-accent/10 p-6 sm:p-8 shadow-card">
        <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="hidden sm:block shrink-0 rounded-2xl bg-card/70 backdrop-blur border shadow-card p-2">
              <IsoIcon name={agentMode ? "agent" : "house"} size={64} />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border bg-card/70 backdrop-blur px-3 py-1 text-xs font-medium mb-3">
                <Sparkles className="h-3 w-3 text-accent" />{" "}
                {agentMode ? "Agency control centre" : "Your property OS"}
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
                Welcome back{name ? `, ${name.split(" ")[0]}` : ""}.
              </h1>
              <p className="text-muted-foreground mt-1">
                Here's what's happening across your portfolio today.
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button asChild variant="outline">
              <Link to="/listings" search={{ new: true }}>
                <Tag className="mr-2 h-4 w-4" /> New listing
              </Link>
            </Button>
            <Button asChild className="shadow-lg shadow-primary/20">
              <Link to="/properties">
                <Plus className="mr-2 h-4 w-4" /> Add property
              </Link>
            </Button>
          </div>
        </div>

        <div className="relative mt-5 flex flex-wrap items-center gap-3">
          <label htmlFor="rent-month" className="text-sm">Charges due in</label>
          <input id="rent-month" type="month" value={month} onChange={(e) => { if (/^\d{4}-\d{2}$/.test(e.target.value)) setMonth(e.target.value); }} className="rounded-md border bg-background px-3 py-2" />
          <span className="text-sm text-muted-foreground">Expected: {money(stats.rentExpected)}. Receipts include partial payments allocated to these charges, regardless of receipt date.</span>
        </div>
        {/* Financial summary bar */}
        <div className="relative mt-6 grid sm:grid-cols-3 gap-3">
          <div className="rounded-xl bg-card/80 backdrop-blur border p-4 flex items-center gap-3">
            <div className="rounded-lg bg-success/10 p-2">
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Received against selected month’s charges</div>
              <div className="text-2xl font-bold">{money(stats.rentCollected)}</div>
            </div>
          </div>
          <div className="rounded-xl bg-card/80 backdrop-blur border p-4 flex items-center gap-3">
            <div className="rounded-lg bg-accent/10 p-2">
              <Users className="h-5 w-5 text-accent" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Active tenancies</div>
              <div className="text-2xl font-bold">{stats.tenancies}</div>
            </div>
          </div>
          <div className="rounded-xl bg-card/80 backdrop-blur border p-4 flex items-center gap-3">
            <div
              className={`rounded-lg p-2 ${stats.rentOverdue ? "bg-destructive/10" : "bg-muted"}`}
            >
              <PoundSterling
                className={`h-5 w-5 ${stats.rentOverdue ? "text-destructive" : "text-muted-foreground"}`}
              />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Rent overdue</div>
              <div className="text-2xl font-bold">{money(stats.rentOutstanding)}</div><p className="text-xs text-muted-foreground">{stats.rentOverdue} overdue charges · all months</p>
            </div>
          </div>
        </div>
      </div>

      <section aria-labelledby="attention-title" className="rounded-2xl border bg-card p-5">
        <h2 id="attention-title" className="text-xl font-semibold">Needs your attention today</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Link to="/banking" className="rounded-xl border p-4 hover:bg-muted"><strong>{money(stats.rentOutstanding)} overdue</strong><p className="text-sm text-muted-foreground">Review payments and reconcile rent →</p></Link>
          <Link to="/work-orders" className="rounded-xl border p-4 hover:bg-muted"><strong>{stats.workOrdersOpen} open work orders</strong><p className="text-sm text-muted-foreground">Review repairs and contractor visits →</p></Link>
          <Link to="/compliance" className="rounded-xl border p-4 hover:bg-muted"><strong>{stats.compliance} compliance alerts</strong><p className="text-sm text-muted-foreground">Review certificates and deadlines →</p></Link>
        </div>
        <div className="mt-4"><ExpiryWidget /></div>
      </section>
      {/* Feature-set tabs */}
      <Tabs defaultValue="portfolio" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="portfolio" className="gap-1.5">
            <Briefcase className="h-3.5 w-3.5" /> Portfolio
          </TabsTrigger>
          <TabsTrigger value="lettings" className="gap-1.5">
            <Hammer className="h-3.5 w-3.5" /> Lettings & Ops
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-1.5">
            <Activity className="h-3.5 w-3.5" /> Activity
          </TabsTrigger>
        </TabsList>

        {/* Portfolio tab */}
        <TabsContent value="portfolio" className="space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {portfolioTiles.map((t) => (
              <Link key={t.label} to={t.to}>
                <Card className="group border-0 shadow-card hover:shadow-lg hover:-translate-y-0.5 transition-all overflow-hidden">
                  <CardContent className={`p-5 bg-gradient-to-br ${t.tone}`}>
                    <div className="flex items-center justify-between mb-3">
                      <t.icon
                        className={`h-5 w-5 ${"danger" in t && t.danger ? "text-destructive" : "text-accent"}`}
                      />
                      {"danger" in t && t.danger ? (
                        <Badge variant="destructive" className="text-[10px]">
                          Action
                        </Badge>
                      ) : null}
                    </div>
                    <div className="text-3xl font-bold">{t.value}</div>
                    <div className="text-sm text-muted-foreground mt-1">{t.label}</div>
                    <div className="text-xs text-muted-foreground mt-3 inline-flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                      Open <ArrowRight className="ml-1 h-3 w-3" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          {stats.properties === 0 && <Card className="border-0 shadow-card bg-gradient-to-br from-primary/5 to-accent/5">
            <CardContent className="p-6">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4 text-accent" /> Portfolio snapshot
              </h2>
              <ol className="text-sm text-muted-foreground space-y-2">
                <li className="flex gap-2">
                  <span className="text-primary font-semibold">1.</span> Add a property and rooms
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-semibold">2.</span> Record compliance
                  certificates
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-semibold">3.</span> Publish a marketplace
                  listing
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-semibold">4.</span> Track leads through your
                  pipeline
                </li>
              </ol>
              <Button asChild className="w-full mt-4" size="sm">
                <Link to="/properties">Add your first property</Link>
              </Button>
            </CardContent>
          </Card>}
        </TabsContent>

        {/* Lettings & Ops tab */}
        <TabsContent value="lettings" className="space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {opsTiles.map((t) => (
              <Link key={t.label} to={t.to}>
                <Card className="border-0 shadow-card hover:shadow-lg transition-all">
                  <CardContent className="p-5">
                    <t.icon
                      className={`h-5 w-5 mb-2 ${"danger" in t && t.danger ? "text-destructive" : "text-muted-foreground"}`}
                    />
                    <div className="text-2xl font-bold">{t.value}</div>
                    <div className="text-xs text-muted-foreground">{t.label}</div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="border-0 shadow-card">
              <CardContent className="p-5">
                <h3 className="font-semibold mb-2">HMO & Rooms</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Manage room-level tenancies, licences and occupancy.
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link to="/hmo">
                    Open HMO centre <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-card">
              <CardContent className="p-5">
                <h3 className="font-semibold mb-2">Work orders</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Track repairs, maintenance and contractor assignments.
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link to="/work-orders">
                    Open work orders <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Activity tab */}
        <TabsContent value="activity" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">

            <Card className="border-0 shadow-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold">Recent leads</h2>
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/leads">
                      View all <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                </div>
                {recent.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-6 text-center">
                    No leads yet. Publish a listing to start receiving enquiries.
                  </div>
                ) : (
                  <div className="divide-y">
                    {recent.map((r) => (
                      <div key={r.id} className="py-3 flex items-center justify-between">
                        <div className="font-medium truncate">{r.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString("en-GB")}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
