import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery, queryOptions, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Inbox, CalendarDays, Gavel, ClipboardCheck, FileSignature, ShieldCheck,
  PackageOpen, Banknote, RefreshCcw, LogOut, Check, ArrowLeft, History,
} from "lucide-react";
import { toast } from "sonner";
import {
  getTenancyLifecycle,
  logTenancyEvent,
  advanceTenancyStatus,
} from "@/lib/tenancy-lifecycle.functions";
import { TenancyActions } from "@/components/tenancy/TenancyActions";

const lifecycleQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["tenancy-lifecycle", id],
    queryFn: () => getTenancyLifecycle({ data: { tenancyId: id } }),
  });

export const Route = createFileRoute("/_authenticated/tenancies/$id")({
  head: () => ({ meta: [{ title: "Tenancy lifecycle — Estately" }] }),
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(lifecycleQueryOptions(params.id)),
  component: TenancyDetail,
  errorComponent: ({ error }) => (
    <div className="p-6 text-sm text-destructive">Failed to load tenancy: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-6">Tenancy not found.</div>,
});

type StageKey =
  | "lead" | "viewing" | "offer" | "references" | "ast"
  | "deposit" | "moved_in" | "renewal" | "moved_out";

const STAGES: { key: StageKey; label: string; icon: typeof Inbox; eventKinds: string[]; advance?: { kind: string; label: string } }[] = [
  { key: "lead", label: "Lead captured", icon: Inbox, eventKinds: ["lead_captured"], advance: { kind: "lead_captured", label: "Log lead" } },
  { key: "viewing", label: "Viewing", icon: CalendarDays, eventKinds: ["viewing_booked", "viewing_completed"], advance: { kind: "viewing_completed", label: "Mark viewing done" } },
  { key: "offer", label: "Offer accepted", icon: Gavel, eventKinds: ["offer_made", "offer_accepted"], advance: { kind: "offer_accepted", label: "Accept offer" } },
  { key: "references", label: "References passed", icon: ClipboardCheck, eventKinds: ["references_requested", "references_passed"], advance: { kind: "references_passed", label: "Pass references" } },
  { key: "ast", label: "AST signed", icon: FileSignature, eventKinds: ["tenancy_drafted", "ast_signed"], advance: { kind: "ast_signed", label: "Mark AST signed" } },
  { key: "deposit", label: "Deposit protected", icon: ShieldCheck, eventKinds: ["deposit_received", "deposit_protected", "prescribed_info_served"], advance: { kind: "deposit_protected", label: "Protect deposit" } },
  { key: "moved_in", label: "Moved in", icon: PackageOpen, eventKinds: ["moved_in"], advance: { kind: "moved_in", label: "Confirm move-in" } },
  { key: "renewal", label: "Renewal", icon: RefreshCcw, eventKinds: ["renewal_offered", "renewed"], advance: { kind: "renewal_offered", label: "Offer renewal" } },
  { key: "moved_out", label: "Moved out", icon: LogOut, eventKinds: ["notice_served", "moved_out", "deposit_returned"], advance: { kind: "moved_out", label: "Confirm move-out" } },
];

const STATUS_TONE: Record<string, string> = {
  draft: "bg-muted text-foreground border-muted-foreground/20",
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ended: "bg-rose-50 text-rose-700 border-rose-200",
  renewed: "bg-blue-50 text-blue-700 border-blue-200",
};

function TenancyDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data } = useSuspenseQuery(lifecycleQueryOptions(id));
  const logFn = useServerFn(logTenancyEvent);
  const advFn = useServerFn(advanceTenancyStatus);

  const eventKinds = new Set(data.events.map((e: any) => e.kind));
  const propertyLabel = data.property
    ? [data.property.address, data.property.city, data.property.postcode].filter(Boolean).join(", ")
    : "Unassigned property";

  const completedCount = STAGES.filter((s) => s.eventKinds.some((k) => eventKinds.has(k))).length;
  const pct = Math.round((completedCount / STAGES.length) * 100);

  const refresh = () => qc.invalidateQueries({ queryKey: ["tenancy-lifecycle", id] });

  const handleAdvance = async (kind: string, label: string) => {
    await logFn({ data: { tenancyId: id, kind, summary: label } });
    if (kind === "ast_signed" && data.tenancy.status === "draft") {
      await advFn({ data: { tenancyId: id, status: "active" } });
    }
    if (kind === "renewed") {
      await advFn({ data: { tenancyId: id, status: "renewed" } });
    }
    if (kind === "moved_out") {
      await advFn({ data: { tenancyId: id, status: "ended" } });
    }
    toast.success(`${label} logged`);
    refresh();
  };

  return (
    <div className="space-y-6">
      <div>
        <Link to="/tenancies" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> All tenancies
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight truncate">{propertyLabel}</h1>
            <p className="text-muted-foreground mt-1">
              {data.tenancy.tenant_name} · £{Number(data.tenancy.rent_amount).toLocaleString()} {data.tenancy.rent_frequency}
              {data.tenancy.start_date && <> · started {new Date(data.tenancy.start_date).toLocaleDateString("en-GB")}</>}
            </p>
          </div>
          <Badge variant="outline" className={STATUS_TONE[data.tenancy.status] ?? ""}>{data.tenancy.status}</Badge>
        </div>
        <div className="mt-4">
          <TenancyActions tenancyId={id} />
        </div>
      </div>

      <Card className="border-0 shadow-card">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold">Lifecycle progress</div>
            <div className="text-sm tabular-nums text-muted-foreground">{completedCount} of {STAGES.length} · {pct}%</div>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden mb-5">
            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {STAGES.map((stage) => {
              const done = stage.eventKinds.some((k) => eventKinds.has(k));
              const Icon = stage.icon;
              return (
                <div
                  key={stage.key}
                  className={`rounded-lg border p-3 flex flex-col gap-2 ${done ? "bg-emerald-50/50 border-emerald-200" : "bg-card"}`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`h-8 w-8 rounded-md flex items-center justify-center ${done ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}`}>
                      {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </div>
                    <div className="text-sm font-medium">{stage.label}</div>
                  </div>
                  {stage.advance && !done && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="self-start text-xs h-7 px-2"
                      onClick={() => handleAdvance(stage.advance!.kind, stage.advance!.label)}
                    >
                      {stage.advance.label}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="border-0 shadow-card lg:col-span-2">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <History className="h-4 w-4" />
              <div className="font-semibold">Event log</div>
            </div>
            {data.events.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No events logged yet — use the stage buttons above.</p>
            ) : (
              <ol className="space-y-3">
                {data.events.map((e: any) => (
                  <li key={e.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 text-sm">
                    <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                    <div className="min-w-0">
                      <div className="font-medium">{(e.summary as string) ?? e.kind.replace(/_/g, " ")}</div>
                      <div className="text-xs text-muted-foreground capitalize">{e.kind.replace(/_/g, " ")}</div>
                    </div>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      {new Date(e.occurred_at).toLocaleDateString("en-GB")}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-0 shadow-card">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Banknote className="h-4 w-4" /> <div className="font-semibold">Rent schedule</div>
              </div>
              {data.schedule.length === 0 ? (
                <p className="text-sm text-muted-foreground">No schedule generated yet.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {data.schedule.slice(0, 5).map((s: any) => (
                    <li key={s.id} className="flex items-center justify-between">
                      <span>{new Date(s.due_date).toLocaleDateString("en-GB")}</span>
                      <span className="tabular-nums">£{Number(s.amount).toLocaleString()}</span>
                      <Badge variant="outline" className={s.status === "paid" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : ""}>
                        {s.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-card">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="h-4 w-4" /> <div className="font-semibold">Deposit</div>
              </div>
              <div className="text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="tabular-nums">£{Number(data.tenancy.deposit ?? 0).toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Scheme</span><span>{data.tenancy.deposit_scheme ?? "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Reference</span><span className="font-mono text-xs">{data.tenancy.deposit_reference ?? "—"}</span></div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-card">
            <CardContent className="p-5">
              <div className="font-semibold mb-3">Compliance</div>
              {data.compliance.length === 0 ? (
                <p className="text-sm text-muted-foreground">No compliance records attached.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {data.compliance.map((c: any) => (
                    <li key={c.id} className="flex items-center justify-between">
                      <span className="capitalize">{String(c.type).replace(/_/g, " ")}</span>
                      <Badge variant="outline">{c.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
