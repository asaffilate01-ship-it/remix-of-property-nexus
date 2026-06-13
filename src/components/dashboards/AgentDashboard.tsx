import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IsoIcon } from "@/components/iso/IsoIcon";
import {
  Inbox, CalendarDays, Gavel, Tag, Kanban, Handshake, Users, ArrowRight,
  Sparkles, Plus, BarChart3, Briefcase, Activity, ClipboardList,
} from "lucide-react";

type Stats = {
  leads: number;
  viewingsThisWeek: number;
  liveListings: number;
  pipelineOpen: number;
  offers: number;
  inspectionsDue: number;
};

export function AgentDashboard({ name }: { name: string }) {
  const [stats, setStats] = useState<Stats>({
    leads: 0, viewingsThisWeek: 0, liveListings: 0, pipelineOpen: 0, offers: 0, inspectionsDue: 0,
  });
  const [recent, setRecent] = useState<{ id: string; name: string; created_at: string }[]>([]);

  useEffect(() => {
    (async () => {
      const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 7);
      const [ld, lst, dl, recentLeads] = await Promise.all([
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "new"),
        supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "live"),
        supabase.from("deals").select("id", { count: "exact", head: true }).neq("status", "won").neq("status", "lost"),
        supabase.from("leads").select("id,name,created_at").order("created_at", { ascending: false }).limit(6),
      ]);
      setStats((s) => ({
        ...s,
        leads: ld.count ?? 0,
        liveListings: lst.count ?? 0,
        pipelineOpen: dl.count ?? 0,
      }));
      setRecent(recentLeads.data ?? []);
    })();
  }, []);

  const pipelineTiles = [
    { icon: Inbox, label: "New leads", value: stats.leads, to: "/leads", tone: "from-primary/15 to-primary/5" },
    { icon: CalendarDays, label: "Viewings this week", value: stats.viewingsThisWeek, to: "/viewings", tone: "from-accent/15 to-accent/5" },
    { icon: Kanban, label: "Open pipeline", value: stats.pipelineOpen, to: "/pipeline", tone: "from-primary/10 to-accent/10" },
    { icon: Gavel, label: "Offers in play", value: stats.offers, to: "/offers", tone: "from-accent/15 to-primary/5" },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-accent/10 via-background to-primary/10 p-6 sm:p-8 shadow-card">
        <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-accent/15 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="hidden sm:block shrink-0 rounded-2xl bg-card/70 backdrop-blur border shadow-card p-2">
              <IsoIcon name="agent" size={64} />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border bg-card/70 backdrop-blur px-3 py-1 text-xs font-medium mb-3">
                <Sparkles className="h-3 w-3 text-accent" /> Agency control centre
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
                Welcome back{name ? `, ${name.split(" ")[0]}` : ""}.
              </h1>
              <p className="text-muted-foreground mt-1">Pipeline, leads, viewings and offers across your branches.</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button asChild variant="outline"><Link to="/leads"><Inbox className="mr-2 h-4 w-4" /> New lead</Link></Button>
            <Button asChild><Link to="/listings"><Plus className="mr-2 h-4 w-4" /> New listing</Link></Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="pipeline" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="pipeline" className="gap-1.5"><Briefcase className="h-3.5 w-3.5" /> Pipeline</TabsTrigger>
          <TabsTrigger value="stock" className="gap-1.5"><Tag className="h-3.5 w-3.5" /> Stock</TabsTrigger>
          <TabsTrigger value="activity" className="gap-1.5"><Activity className="h-3.5 w-3.5" /> Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {pipelineTiles.map((t) => (
              <Link key={t.label} to={t.to}>
                <Card className="group border-0 shadow-card hover:shadow-lg hover:-translate-y-0.5 transition-all overflow-hidden">
                  <CardContent className={`p-5 bg-gradient-to-br ${t.tone}`}>
                    <t.icon className="h-5 w-5 text-accent mb-3" />
                    <div className="text-3xl font-bold">{t.value}</div>
                    <div className="text-sm text-muted-foreground mt-1">{t.label}</div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="stock" className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <StockCard icon={Tag} label="Live listings" value={stats.liveListings} to="/listings" />
            <StockCard icon={ClipboardList} label="Inspections due" value={stats.inspectionsDue} to="/inspections" />
            <StockCard icon={Handshake} label="Sales pipeline" value={stats.pipelineOpen} to="/sales" />
          </div>
          <Card className="border-0 shadow-card bg-gradient-to-br from-primary/5 to-accent/5">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-2 flex items-center gap-2"><Users className="h-4 w-4 text-accent" /> Branches & team</h3>
              <p className="text-sm text-muted-foreground mb-3">Manage branches, members and roles.</p>
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm"><Link to="/branches">Branches</Link></Button>
                <Button asChild variant="outline" size="sm"><Link to="/agency">Team</Link></Button>
                <Button asChild size="sm"><Link to="/reports"><BarChart3 className="mr-1 h-3 w-3" /> Reports</Link></Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card className="border-0 shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Latest enquiries</h2>
                <Button asChild variant="ghost" size="sm"><Link to="/leads">View all <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
              </div>
              {recent.length === 0 ? (
                <div className="text-sm text-muted-foreground py-6 text-center">No enquiries yet.</div>
              ) : (
                <div className="divide-y">
                  {recent.map((r) => (
                    <div key={r.id} className="py-3 flex items-center justify-between">
                      <div className="font-medium truncate">{r.name}</div>
                      <Badge variant="outline" className="text-[10px]">{new Date(r.created_at).toLocaleDateString("en-GB")}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StockCard({ icon: Icon, label, value, to }: { icon: typeof Tag; label: string; value: number; to: string }) {
  return (
    <Link to={to}>
      <Card className="border-0 shadow-card hover:shadow-lg transition-all">
        <CardContent className="p-5">
          <Icon className="h-5 w-5 text-muted-foreground mb-2" />
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </CardContent>
      </Card>
    </Link>
  );
}
