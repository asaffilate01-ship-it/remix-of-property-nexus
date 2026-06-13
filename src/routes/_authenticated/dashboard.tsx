import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2, Tag, Inbox, ShieldCheck, Plus, BedDouble, PoundSterling,
  Users, Wrench, ArrowRight, Sparkles, TrendingUp,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Estately" }] }),
  component: Dashboard,
});

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
};

function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    properties: 0, listings: 0, leads: 0, compliance: 0,
    rooms: 0, tenancies: 0, workOrdersOpen: 0, rentOverdue: 0, rentCollected: 0,
  });
  const [name, setName] = useState("");
  const [recent, setRecent] = useState<{ id: string; title: string; created_at: string }[]>([]);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const meta = u.user?.user_metadata as { full_name?: string } | undefined;
      setName(meta?.full_name ?? u.user?.email ?? "");

      const [p, l, ld, c, rm, tn, wo, rentRows, recentLeads] = await Promise.all([
        supabase.from("properties").select("id", { count: "exact", head: true }),
        supabase.from("listings").select("id", { count: "exact", head: true }),
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("compliance_records").select("id", { count: "exact", head: true }).neq("status", "valid"),
        supabase.from("rooms").select("id", { count: "exact", head: true }),
        supabase.from("tenancies").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("work_orders").select("id", { count: "exact", head: true }).neq("status", "completed"),
        supabase.from("rent_schedule").select("status,paid_amount,due_date").limit(500),
        supabase.from("leads").select("id,name,created_at").order("created_at", { ascending: false }).limit(5),
      ]);

      const now = new Date();
      const rent = rentRows.data ?? [];
      const rentCollected = rent.filter((r) => r.status === "paid").reduce((s, r) => s + Number(r.paid_amount ?? 0), 0);
      const rentOverdue = rent.filter((r) => r.status !== "paid" && new Date(r.due_date) < now).length;

      setStats({
        properties: p.count ?? 0,
        listings: l.count ?? 0,
        leads: ld.count ?? 0,
        compliance: c.count ?? 0,
        rooms: rm.count ?? 0,
        tenancies: tn.count ?? 0,
        workOrdersOpen: wo.count ?? 0,
        rentOverdue,
        rentCollected,
      });
      setRecent((recentLeads.data ?? []).map((r) => ({ id: r.id, title: r.name, created_at: r.created_at })));
    })();
  }, []);

  const primaryTiles = [
    { icon: Building2, label: "Properties", value: stats.properties, to: "/properties", tone: "from-primary/15 to-primary/5" },
    { icon: Tag, label: "Active listings", value: stats.listings, to: "/listings", tone: "from-accent/15 to-accent/5" },
    { icon: Inbox, label: "New leads", value: stats.leads, to: "/leads", tone: "from-primary/15 to-accent/5" },
    { icon: ShieldCheck, label: "Compliance alerts", value: stats.compliance, to: "/compliance", tone: "from-destructive/15 to-destructive/5", danger: stats.compliance > 0 },
  ] as const;

  const opsTiles = [
    { icon: BedDouble, label: "HMO rooms", value: stats.rooms, to: "/hmo" },
    { icon: Users, label: "Active tenancies", value: stats.tenancies, to: "/hmo" },
    { icon: Wrench, label: "Open work orders", value: stats.workOrdersOpen, to: "/work-orders" },
    { icon: PoundSterling, label: "Rent overdue", value: stats.rentOverdue, to: "/hmo", danger: stats.rentOverdue > 0 },
  ] as const;

  return (
    <div className="space-y-8">
      {/* Premium hero */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-accent/10 p-6 sm:p-8 shadow-card">
        <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border bg-card/70 backdrop-blur px-3 py-1 text-xs font-medium mb-3">
              <Sparkles className="h-3 w-3 text-accent" /> Your property OS
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Welcome back{name ? `, ${name.split(" ")[0]}` : ""}.
            </h1>
            <p className="text-muted-foreground mt-1">Here's what's happening across your portfolio today.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button asChild variant="outline"><Link to="/listings"><Tag className="mr-2 h-4 w-4" /> New listing</Link></Button>
            <Button asChild className="shadow-lg shadow-primary/20"><Link to="/properties"><Plus className="mr-2 h-4 w-4" /> Add property</Link></Button>
          </div>
        </div>

        {/* Rent strip */}
        <div className="relative mt-6 grid sm:grid-cols-3 gap-3">
          <div className="rounded-xl bg-card/80 backdrop-blur border p-4 flex items-center gap-3">
            <div className="rounded-lg bg-success/10 p-2"><TrendingUp className="h-5 w-5 text-success" /></div>
            <div>
              <div className="text-xs text-muted-foreground">Rent collected</div>
              <div className="text-2xl font-bold">£{stats.rentCollected.toLocaleString()}</div>
            </div>
          </div>
          <div className="rounded-xl bg-card/80 backdrop-blur border p-4 flex items-center gap-3">
            <div className="rounded-lg bg-accent/10 p-2"><Users className="h-5 w-5 text-accent" /></div>
            <div>
              <div className="text-xs text-muted-foreground">Active tenancies</div>
              <div className="text-2xl font-bold">{stats.tenancies}</div>
            </div>
          </div>
          <div className="rounded-xl bg-card/80 backdrop-blur border p-4 flex items-center gap-3">
            <div className={`rounded-lg p-2 ${stats.rentOverdue ? "bg-destructive/10" : "bg-muted"}`}>
              <PoundSterling className={`h-5 w-5 ${stats.rentOverdue ? "text-destructive" : "text-muted-foreground"}`} />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Rent overdue</div>
              <div className="text-2xl font-bold">{stats.rentOverdue}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Primary KPIs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Portfolio</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {primaryTiles.map((t) => (
            <Link key={t.label} to={t.to}>
              <Card className="group border-0 shadow-card hover:shadow-lg hover:-translate-y-0.5 transition-all overflow-hidden">
                <CardContent className={`p-5 bg-gradient-to-br ${t.tone}`}>
                  <div className="flex items-center justify-between mb-3">
                    <t.icon className={`h-5 w-5 ${"danger" in t && t.danger ? "text-destructive" : "text-accent"}`} />
                    {"danger" in t && t.danger ? <Badge variant="destructive" className="text-[10px]">Action</Badge> : null}
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
      </div>

      {/* Ops KPIs */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Operations</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {opsTiles.map((t) => (
            <Link key={t.label} to={t.to}>
              <Card className="border-0 shadow-card hover:shadow-lg transition-all">
                <CardContent className="p-5">
                  <t.icon className={`h-5 w-5 mb-2 ${"danger" in t && t.danger ? "text-destructive" : "text-muted-foreground"}`} />
                  <div className="text-2xl font-bold">{t.value}</div>
                  <div className="text-xs text-muted-foreground">{t.label}</div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Two-col activity / getting started */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="border-0 shadow-card lg:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Recent leads</h2>
              <Button asChild variant="ghost" size="sm"><Link to="/leads">View all <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
            </div>
            {recent.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">No leads yet. Publish a listing to start receiving enquiries.</div>
            ) : (
              <div className="divide-y">
                {recent.map((r) => (
                  <div key={r.id} className="py-3 flex items-center justify-between">
                    <div className="font-medium truncate">{r.title}</div>
                    <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("en-GB")}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card bg-gradient-to-br from-primary/5 to-accent/5">
          <CardContent className="p-6">
            <h2 className="font-semibold mb-3">Get started</h2>
            <ol className="text-sm text-muted-foreground space-y-2">
              <li className="flex gap-2"><span className="text-primary font-semibold">1.</span> Add a property and rooms</li>
              <li className="flex gap-2"><span className="text-primary font-semibold">2.</span> Record compliance certificates</li>
              <li className="flex gap-2"><span className="text-primary font-semibold">3.</span> Publish a marketplace listing</li>
              <li className="flex gap-2"><span className="text-primary font-semibold">4.</span> Track leads through your pipeline</li>
            </ol>
            <Button asChild className="w-full mt-4" size="sm"><Link to="/properties">Add your first property</Link></Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
