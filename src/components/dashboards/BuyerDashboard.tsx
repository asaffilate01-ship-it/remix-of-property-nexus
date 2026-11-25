import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardLoadState } from "./DashboardLoadState";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Heart, Bell, Sparkles, MapPin, TrendingUp, Eye } from "lucide-react";

export function BuyerDashboard({ name }: { name: string }) {
  const [stats, setStats] = useState({ searches: 0, shortlist: 0, alerts: 0 });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    void (async () => {
      try {
        const { data: auth, error: authError } = await supabase.auth.getUser();
        if (authError || !auth.user) throw new Error("Account unavailable");
        const [searches, shortlist, alerts] = await Promise.all([
          supabase.from("saved_searches").select("id", { count: "exact", head: true }).eq("user_id", auth.user.id),
          supabase.from("saved_listings").select("listing_id", { count: "exact", head: true }).eq("user_id", auth.user.id),
          supabase.from("alerts").select("id", { count: "exact", head: true }).eq("user_id", auth.user.id).is("read_at", null),
        ]);
        if (searches.error || shortlist.error || alerts.error || searches.count === null || shortlist.count === null || alerts.count === null) throw new Error("Dashboard counts unavailable");
        if (active) setStats({ searches: searches.count, shortlist: shortlist.count, alerts: alerts.count });
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [reload]);

  if (loading || error) return <DashboardLoadState loading={loading} retry={() => setReload(value => value + 1)} />;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-accent/10 p-6 sm:p-8 shadow-card">
        <div className="inline-flex items-center gap-2 rounded-full border bg-card/70 backdrop-blur px-3 py-1 text-xs font-medium mb-3">
          <Sparkles className="h-3 w-3 text-accent" /> Buyer portal
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Hi{name ? `, ${name.split(" ")[0]}` : ""}.</h1>
        <p className="text-muted-foreground mt-1">Find your next home on Gabley.</p>
        <div className="mt-4">
          <Button asChild className="shadow-lg shadow-primary/20"><Link to="/marketplace"><Search className="mr-2 h-4 w-4" /> Browse properties</Link></Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 bg-muted/50 sm:inline-flex sm:w-auto h-auto min-h-11">
          <TabsTrigger value="overview" className="gap-1.5 min-h-10"><Eye className="h-3.5 w-3.5" /> Overview</TabsTrigger>
          <TabsTrigger value="discover" className="gap-1.5 min-h-10"><MapPin className="h-3.5 w-3.5" /> Discover</TabsTrigger>
          <TabsTrigger value="track" className="gap-1.5 min-h-10"><TrendingUp className="h-3.5 w-3.5" /> Track</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <Card className="border-0 shadow-card">
              <CardContent className="p-5">
                <Search className="h-5 w-5 mb-2 text-accent" />
                <div className="text-2xl font-bold">{stats.searches}</div>
                <div className="text-xs text-muted-foreground">Saved searches</div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-card">
              <CardContent className="p-5">
                <Heart className="h-5 w-5 mb-2 text-accent" />
                <div className="text-2xl font-bold">{stats.shortlist}</div>
                <div className="text-xs text-muted-foreground">Shortlist</div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-card">
              <CardContent className="p-5">
                <Bell className="h-5 w-5 mb-2 text-accent" />
                <div className="text-2xl font-bold">{stats.alerts}</div>
                <div className="text-xs text-muted-foreground">Alerts</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="discover" className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="border-0 shadow-card bg-gradient-to-br from-primary/5 to-accent/5">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">Browse the marketplace</h3>
                <p className="text-sm text-muted-foreground mb-4">Explore available properties for sale and to let.</p>
                <Button asChild><Link to="/marketplace"><Search className="mr-2 h-4 w-4" /> Start browsing</Link></Button>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-card">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">Area guides</h3>
                <p className="text-sm text-muted-foreground mb-4">Explore neighbourhoods, schools and transport links.</p>
                <Button asChild variant="outline"><Link to="/area-guides">View guides</Link></Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="track" className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="border-0 shadow-card">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">My sale / purchase</h3>
                <p className="text-sm text-muted-foreground mb-4">Track viewings, offers and conveyancing progress.</p>
                <Button asChild variant="outline"><Link to="/vendor-portal">Open portal</Link></Button>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-card">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">Saved searches</h3>
                <p className="text-sm text-muted-foreground mb-4">Keep and re-run your favourite marketplace filters.</p>
                <Button asChild variant="outline"><Link to="/saved-searches">Manage searches</Link></Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
