import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardLoadState } from "./DashboardLoadState";
import { collectPages } from "@/lib/portfolio-summary";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wrench, Clock, CheckCircle2, Sparkles, ArrowRight, Calendar, Eye } from "lucide-react";

type Job = { id: string; title: string; status: string; priority: string; scheduled_for: string | null; created_at: string };

export function ContractorDashboard({ name }: { name: string }) {
  const [jobs, setJobs] = useState<Job[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    void (async () => {
      try {
        const { data: u, error: authError } = await supabase.auth.getUser();
        if (authError || !u.user?.email) throw new Error("Account unavailable");
        const contacts = await collectPages((from, to) => supabase.from("contacts").select("id").eq("email", u.user!.email!).order("id").range(from, to));
        const ids = contacts.map((c) => c.id);
        const data = ids.length ? await collectPages((from, to) => supabase
          .from("work_orders")
          .select("id,title,status,priority,scheduled_for,created_at")
          .in("contact_id", ids)
          .order("created_at", { ascending: false })
          .order("id")
          .range(from, to)) : [];
        if (active) setJobs(data as Job[]);
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [reload]);

  if (loading || error) return <DashboardLoadState loading={loading} retry={() => setReload(value => value + 1)} />;

  const open = jobs.filter((j) => !["completed", "cancelled"].includes(j.status)).length;
  const scheduled = jobs.filter((j) => !["completed", "cancelled"].includes(j.status) && j.scheduled_for && new Date(j.scheduled_for) > new Date()).length;
  const done = jobs.filter((j) => j.status === "completed").length;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-accent/10 p-6 sm:p-8 shadow-card">
        <div className="inline-flex items-center gap-2 rounded-full border bg-card/70 backdrop-blur px-3 py-1 text-xs font-medium mb-3">
          <Sparkles className="h-3 w-3 text-accent" /> Trades portal
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Hi{name ? `, ${name.split(" ")[0]}` : ""}.</h1>
        <p className="text-muted-foreground mt-1">Your assigned jobs and schedule.</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 bg-muted/50 sm:inline-flex sm:w-auto h-auto min-h-11">
          <TabsTrigger value="overview" className="gap-1.5 min-h-10"><Eye className="h-3.5 w-3.5" /> Overview</TabsTrigger>
          <TabsTrigger value="schedule" className="gap-1.5 min-h-10"><Calendar className="h-3.5 w-3.5" /> Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <Card className="border-0 shadow-card">
              <CardContent className="p-5">
                <Wrench className="h-5 w-5 mb-2 text-accent" />
                <div className="text-2xl font-bold">{open}</div>
                <div className="text-xs text-muted-foreground">Open jobs</div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-card">
              <CardContent className="p-5">
                <Clock className="h-5 w-5 mb-2 text-accent" />
                <div className="text-2xl font-bold">{scheduled}</div>
                <div className="text-xs text-muted-foreground">Scheduled</div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-card">
              <CardContent className="p-5">
                <CheckCircle2 className="h-5 w-5 mb-2 text-success" />
                <div className="text-2xl font-bold">{done}</div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <Card className="border-0 shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Your jobs</h2>
                <Button asChild variant="ghost" size="sm"><Link to="/work-orders">All work orders <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
              </div>
              {jobs.length === 0 ? (
                <div className="text-sm text-muted-foreground py-8 text-center">No jobs assigned to you yet.</div>
              ) : (
                <div className="divide-y">
                  {jobs.slice(0, 10).map((j) => (
                    <div key={j.id} className="py-3 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{j.title}</div>
                        <div className="text-xs text-muted-foreground">{j.scheduled_for ? new Date(j.scheduled_for).toLocaleString("en-GB") : "Unscheduled"}</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{j.priority}</Badge>
                        <Badge>{j.status}</Badge>
                      </div>
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
