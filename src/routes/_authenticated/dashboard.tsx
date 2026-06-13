import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Tag, Inbox, ShieldCheck, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

function Dashboard() {
  const [stats, setStats] = useState({ properties: 0, listings: 0, leads: 0, compliance: 0 });
  const [name, setName] = useState("");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const meta = u.user?.user_metadata as { full_name?: string } | undefined;
      setName(meta?.full_name ?? u.user?.email ?? "");
      const [p, l, ld, c] = await Promise.all([
        supabase.from("properties").select("id", { count: "exact", head: true }),
        supabase.from("listings").select("id", { count: "exact", head: true }),
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("compliance_records").select("id", { count: "exact", head: true }).neq("status", "valid"),
      ]);
      setStats({ properties: p.count ?? 0, listings: l.count ?? 0, leads: ld.count ?? 0, compliance: c.count ?? 0 });
    })();
  }, []);

  const tiles = [
    { icon: Building2, label: "Properties", value: stats.properties, to: "/properties" },
    { icon: Tag, label: "Active listings", value: stats.listings, to: "/listings" },
    { icon: Inbox, label: "New leads", value: stats.leads, to: "/leads" },
    { icon: ShieldCheck, label: "Compliance alerts", value: stats.compliance, to: "/compliance" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Welcome back{name ? `, ${name.split(" ")[0]}` : ""}.</h1>
          <p className="text-muted-foreground">Here's what's happening across your portfolio.</p>
        </div>
        <Button asChild><Link to="/properties"><Plus className="mr-2 h-4 w-4" /> Add property</Link></Button>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map((t) => (
          <Link key={t.label} to={t.to}>
            <Card className="border-0 shadow-card hover:shadow-lg transition">
              <CardContent className="p-5">
                <t.icon className="h-5 w-5 text-accent mb-2" />
                <div className="text-3xl font-bold">{t.value}</div>
                <div className="text-sm text-muted-foreground">{t.label}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      <Card className="border-0 shadow-card">
        <CardContent className="p-6">
          <h2 className="font-semibold mb-2">Get started</h2>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Add a property and rooms</li>
            <li>Record your compliance certificates</li>
            <li>Publish a marketplace listing</li>
            <li>Track leads through your pipeline</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
