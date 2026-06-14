import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listRuns, cancelRun } from "@/lib/tracks.functions";
import { XCircle, PlayCircle, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/automations/runs")({ component: RunsPage });

const STATUS_ICON = {
  running: PlayCircle,
  completed: CheckCircle2,
  cancelled: XCircle,
  failed: AlertCircle,
};

function RunsPage() {
  const load = useServerFn(listRuns);
  const cancel = useServerFn(cancelRun);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["track-runs"], queryFn: () => load({ data: {} }) });
  const cancelMut = useMutation({
    mutationFn: (id: string) => cancel({ data: { id } }),
    onSuccess: () => { toast.success("Run cancelled"); qc.invalidateQueries({ queryKey: ["track-runs"] }); },
  });

  const runs = data?.runs ?? [];

  return (
    <div className="space-y-4">
      <PageHeader title="Active runs" description="Track executions across all entities" />
      {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
      {!isLoading && runs.length === 0 && <Card className="border-dashed"><CardContent className="py-12 text-center text-sm text-muted-foreground">No runs yet</CardContent></Card>}
      <div className="space-y-2">
        {runs.map((r: any) => {
          const Icon = STATUS_ICON[r.status as keyof typeof STATUS_ICON] ?? PlayCircle;
          const total = r.run_steps?.length ?? 0;
          const done = r.run_steps?.filter((s: any) => s.status === "done").length ?? 0;
          return (
            <Card key={r.id} className="border-0 shadow-card">
              <CardContent className="p-3 flex items-center gap-3">
                <Icon className={`h-4 w-4 ${r.status === "running" ? "text-primary" : r.status === "failed" ? "text-destructive" : "text-muted-foreground"}`} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{r.template?.name ?? "Track"}</div>
                  <div className="text-xs text-muted-foreground flex gap-2">
                    <Badge variant="secondary" className="text-[10px]">{r.template?.entity_type}</Badge>
                    <span>{done}/{total} steps</span>
                    <span>·</span>
                    <span>{new Date(r.started_at).toLocaleString("en-GB")}</span>
                  </div>
                </div>
                <Badge variant={r.status === "running" ? "default" : r.status === "failed" ? "destructive" : "secondary"}>{r.status}</Badge>
                {r.status === "running" && (
                  <Button variant="ghost" size="sm" onClick={() => cancelMut.mutate(r.id)}>Cancel</Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
