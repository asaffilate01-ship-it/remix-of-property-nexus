import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IsoIcon } from "@/components/iso/IsoIcon";
import {
  Users, Building2, ShieldCheck, Activity, Database, AlertTriangle,
  ArrowRight, Crown, BarChart3, Settings,
} from "lucide-react";

type AdminStats = {
  users: number;
  agencies: number;
  properties: number;
  listings: number;
  complianceAlerts: number;
  openWorkOrders: number;
};

export function AdminDashboard({ name }: { name: string }) {
  const [stats, setStats] = useState<AdminStats>({
    users: 0, agencies: 0, properties: 0, listings: 0, complianceAlerts: 0, openWorkOrders: 0,
  });
  const [recentUsers, setRecentUsers] = useState<{ id: string; full_name: string | null; primary_role: string | null; created_at: string }[]>([]);

  useEffect(() => {
    (async () => {
      const [u, ag, p, l, c, wo, ru] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("agencies").select("id", { count: "exact", head: true }),
        supabase.from("properties").select("id", { count: "exact", head: true }),
        supabase.from("listings").select("id", { count: "exact", head: true }),
        supabase.from("compliance_records").select("id", { count: "exact", head: true }).neq("status", "valid"),
        supabase.from("work_orders").select("id", { count: "exact", head: true }).neq("status", "completed"),
        supabase.from("profiles").select("id,full_name,primary_role,created_at").order("created_at", { ascending: false }).limit(6),
      ]);
      setStats({
        users: u.count ?? 0,
        agencies: ag.count ?? 0,
        properties: p.count ?? 0,
        listings: l.count ?? 0,
        complianceAlerts: c.count ?? 0,
        openWorkOrders: wo.count ?? 0,
      });
      setRecentUsers(ru.data ?? []);
    })();
  }, []);

  const tiles = [
    { icon: Users, label: "Users", value: stats.users, to: "/agency", tone: "from-primary/15 to-primary/5" },
    { icon: Building2, label: "Agencies", value: stats.agencies, to: "/agency", tone: "from-accent/15 to-accent/5" },
    { icon: Database, label: "Properties", value: stats.properties, to: "/properties", tone: "from-primary/15 to-accent/5" },
    { icon: ShieldCheck, label: "Compliance alerts", value: stats.complianceAlerts, to: "/compliance", tone: "from-destructive/15 to-destructive/5", danger: stats.complianceAlerts > 0 },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/15 via-background to-accent/10 p-6 sm:p-8 shadow-card">
        <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="hidden sm:block shrink-0 rounded-2xl bg-card/70 backdrop-blur border shadow-card p-2">
              <IsoIcon name="agent" size={64} />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border bg-card/70 backdrop-blur px-3 py-1 text-xs font-medium mb-3">
                <Crown className="h-3 w-3 text-primary" /> Platform admin
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
                {name ? `${name.split(" ")[0]}, ` : ""}you have the keys.
              </h1>
              <p className="text-muted-foreground mt-1">Workspace health, agencies, users, and platform-wide compliance.</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button asChild variant="outline"><Link to="/reports"><BarChart3 className="mr-2 h-4 w-4" /> Reports</Link></Button>
            <Button asChild><Link to="/settings"><Settings className="mr-2 h-4 w-4" /> Settings</Link></Button>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map((t) => (
          <Link key={t.label} to={t.to}>
            <Card className="group border-0 shadow-card hover:shadow-lg hover:-translate-y-0.5 transition-all overflow-hidden">
              <CardContent className={`p-5 bg-gradient-to-br ${t.tone}`}>
                <div className="flex items-center justify-between mb-3">
                  <t.icon className={`h-5 w-5 ${"danger" in t && t.danger ? "text-destructive" : "text-accent"}`} />
                  {"danger" in t && t.danger ? <Badge variant="destructive" className="text-[10px]">Action</Badge> : null}
                </div>
                <div className="text-3xl font-bold">{t.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{t.label}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="border-0 shadow-card lg:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center gap-2"><Users className="h-4 w-4 text-accent" /> Recent users</h2>
              <Button asChild variant="ghost" size="sm"><Link to="/agency">Manage <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
            </div>
            {recentUsers.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">No users yet.</div>
            ) : (
              <div className="divide-y">
                {recentUsers.map((r) => (
                  <div key={r.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{r.full_name ?? "Unnamed"}</div>
                      <div className="text-xs text-muted-foreground capitalize">{r.primary_role ?? "—"}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("en-GB")}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card bg-gradient-to-br from-accent/10 to-primary/5">
          <CardContent className="p-6 space-y-3">
            <h3 className="font-semibold flex items-center gap-2"><Activity className="h-4 w-4 text-accent" /> Platform load</h3>
            <Stat icon={Database} label="Active listings" value={stats.listings} />
            <Stat icon={AlertTriangle} label="Open work orders" value={stats.openWorkOrders} />
            <Stat icon={ShieldCheck} label="Compliance alerts" value={stats.complianceAlerts} danger={stats.complianceAlerts > 0} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, danger = false }: { icon: typeof Users; label: string; value: number; danger?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-card/70 border p-3">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${danger ? "text-destructive" : "text-muted-foreground"}`} />
        <span className="text-sm">{label}</span>
      </div>
      <span className={`text-lg font-bold ${danger ? "text-destructive" : ""}`}>{value}</span>
    </div>
  );
}
