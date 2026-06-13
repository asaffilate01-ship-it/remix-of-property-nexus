import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wrench, Clock, CheckCircle2, Sparkles, ArrowRight } from "lucide-react";

type Job = { id: string; title: string; status: string; priority: string; scheduled_for: string | null; created_at: string };

export function ContractorDashboard({ name }: { name: string }) {
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user?.email) return;
      // Find contact rows linked by email (third-party contractors are stored in contacts).
      const { data: contacts } = await supabase.from("contacts").select("id").eq("email", u.user.email);
      const ids = (contacts ?? []).map((c) => c.id);
      if (!ids.length) return;
      const { data } = await supabase
        .from("work_orders")
        .select("id,title,status,priority,scheduled_for,created_at")
        .in("contact_id", ids)
        .order("created_at", { ascending: false });
      setJobs((data as Job[]) ?? []);
    })();
  }, []);

  const open = jobs.filter((j) => j.status !== "completed").length;
  const scheduled = jobs.filter((j) => j.scheduled_for && new Date(j.scheduled_for) > new Date()).length;
  const done = jobs.filter((j) => j.status === "completed").length;

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-accent/10 p-6 sm:p-8 shadow-card">
        <div className="inline-flex items-center gap-2 rounded-full border bg-card/70 backdrop-blur px-3 py-1 text-xs font-medium mb-3">
          <Sparkles className="h-3 w-3 text-accent" /> Trades portal
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Hi{name ? `, ${name.split(" ")[0]}` : ""}.</h1>
        <p className="text-muted-foreground mt-1">Your assigned jobs and schedule.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-card"><CardContent className="p-5"><Wrench className="h-5 w-5 mb-2 text-accent" /><div className="text-2xl font-bold">{open}</div><div className="text-xs text-muted-foreground">Open jobs</div></CardContent></Card>
        <Card className="border-0 shadow-card"><CardContent className="p-5"><Clock className="h-5 w-5 mb-2 text-accent" /><div className="text-2xl font-bold">{scheduled}</div><div className="text-xs text-muted-foreground">Scheduled</div></CardContent></Card>
        <Card className="border-0 shadow-card"><CardContent className="p-5"><CheckCircle2 className="h-5 w-5 mb-2 text-success" /><div className="text-2xl font-bold">{done}</div><div className="text-xs text-muted-foreground">Completed</div></CardContent></Card>
      </div>

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
                <div key={j.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{j.title}</div>
                    <div className="text-xs text-muted-foreground">{j.scheduled_for ? new Date(j.scheduled_for).toLocaleString("en-GB") : "Unscheduled"}</div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Badge variant="outline">{j.priority}</Badge>
                    <Badge>{j.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
