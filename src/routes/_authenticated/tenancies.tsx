import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useSuspenseQuery, queryOptions, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, Home, Users } from "lucide-react";
import { listTenancyOverview } from "@/lib/tenancy-lifecycle.functions";
import { PageHeader } from "@/components/PageHeader";
import { AddTenancyDialog } from "@/components/tenancy/AddTenancyDialog";

const tenanciesQueryOptions = () =>
  queryOptions({
    queryKey: ["tenancies-overview"],
    queryFn: () => listTenancyOverview(),
  });

export const Route = createFileRoute("/_authenticated/tenancies")({
  head: () => ({ meta: [{ title: "Tenancies — Estately" }] }),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(tenanciesQueryOptions()),
  component: TenanciesPage,
  errorComponent: ({ error }) => (
    <div className="p-6 text-sm text-destructive">Failed to load tenancies: {error.message}</div>
  ),
});

const STATUS_TONE: Record<string, string> = {
  draft: "bg-muted text-foreground border-muted-foreground/20",
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ended: "bg-rose-50 text-rose-700 border-rose-200",
  renewed: "bg-blue-50 text-blue-700 border-blue-200",
};

function TenanciesPage() {
  const { data } = useSuspenseQuery(tenanciesQueryOptions());

  const active = data.filter((t) => t.status === "active").length;
  const draft = data.filter((t) => t.status === "draft").length;
  const totalArrears = data.reduce((sum, t) => sum + (t.arrears ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tenancies"
        description="End-to-end lifecycle: lead → viewing → offer → tenancy → deposit → rent → renewal."
        actions={
          <Button asChild>
            <Link to="/pipeline">
              <Plus className="mr-2 h-4 w-4" /> Start from pipeline
            </Link>
          </Button>
        }
      />


      <div className="grid sm:grid-cols-4 gap-3">
        <Stat label="Active" value={String(active)} />
        <Stat label="Draft" value={String(draft)} />
        <Stat label="Total" value={String(data.length)} />
        <Stat label="Arrears" value={`£${totalArrears.toLocaleString()}`} tone={totalArrears > 0 ? "text-red-600" : undefined} />
      </div>

      <Card className="border-0 shadow-card">
        <CardContent className="p-0">
          {data.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Home className="h-10 w-10 mx-auto opacity-50 mb-2" />
              <p>No tenancies yet. Create one from the lettings pipeline once an offer is accepted.</p>
            </div>
          ) : (
            <div className="divide-y">
              {data.map((t) => (
                <Link
                  key={t.id}
                  to="/tenancies/$id"
                  params={{ id: t.id }}
                  className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-4 p-4 hover:bg-muted/40 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{t.property_address ?? "Unassigned property"}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <Users className="h-3 w-3" /> {t.tenant_name}
                      {t.last_event_kind && <span>· {t.last_event_kind.replace(/_/g, " ")}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold tabular-nums">£{Number(t.rent_amount).toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">{t.rent_frequency}</div>
                  </div>
                  {t.arrears > 0 ? (
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                      £{Number(t.arrears).toLocaleString()} arrears
                    </Badge>
                  ) : (
                    <span />
                  )}
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={STATUS_TONE[t.status] ?? ""}>{t.status}</Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <Card className="border-0 shadow-card">
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={`font-display text-2xl font-bold mt-0.5 ${tone ?? ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
