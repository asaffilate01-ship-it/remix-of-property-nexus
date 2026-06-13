import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import {
  listAgencyReferencingCases,
  updateReferencingStatus,
} from "@/lib/referencing.functions";
import { toast } from "sonner";
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  Eye,
  Search,
  RotateCcw,
  User,
  Home,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/referencing-cases")({
  head: () => ({ meta: [{ title: "Referencing cases — Estately" }] }),
  component: ReferencingCasesPage,
});

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  in_review: "In review",
  approved: "Approved",
  declined: "Declined",
  withdrawn: "Withdrawn",
};

const STATUS_TONE: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  submitted: "bg-blue-50 text-blue-700 border-blue-200",
  in_review: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  declined: "bg-red-50 text-red-700 border-red-200",
  withdrawn: "bg-muted text-muted-foreground",
};

const COLUMNS = ["submitted", "in_review", "approved", "declined"] as const;

function ReferencingCasesPage() {
  const fetchCases = useServerFn(listAgencyReferencingCases);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["referencing-cases"],
    queryFn: () => fetchCases({}),
  });

  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<any | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [decisionStatus, setDecisionStatus] = useState<string>("");

  const cases = (data?.cases ?? []).filter((c: any) => {
    const term = filter.toLowerCase();
    return (
      !term ||
      (c.applicant?.name ?? "").toLowerCase().includes(term) ||
      (c.properties?.address ?? "").toLowerCase().includes(term) ||
      (c.agencies?.name ?? "").toLowerCase().includes(term)
    );
  });

  const byStatus = (status: string) => cases.filter((c: any) => c.status === status);

  const changeStatus = useServerFn(updateReferencingStatus);

  const decide = async () => {
    if (!selected || !decisionStatus) return;
    try {
      await changeStatus({
        data: {
          id: selected.id,
          status: decisionStatus as any,
          decision: decisionNote,
        },
      });
      toast.success(`Case marked ${STATUS_LABEL[decisionStatus]}`);
      setSelected(null);
      setDecisionNote("");
      setDecisionStatus("");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <main className="flex-1 p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight">Referencing cases</h1>
              <p className="text-sm text-muted-foreground mt-1">Review tenant references, documents and decisions.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search applicants or properties…"
                  className="pl-9 w-64"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon" onClick={() => refetch()}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading cases…</div>
          ) : cases.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-10 text-center">
                <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No referencing cases yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {COLUMNS.map((status) => (
                <div key={status} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {STATUS_LABEL[status]}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {byStatus(status).length}
                    </Badge>
                  </div>
                  {byStatus(status).map((c: any) => (
                    <button
                      key={c.id}
                      onClick={() => setSelected(c)}
                      className="w-full text-left"
                    >
                      <Card className="hover:shadow-card transition-shadow">
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium truncate">
                              {c.applicant?.name || "Unnamed applicant"}
                            </span>
                            <Badge className={STATUS_TONE[c.status] || ""}>
                              {STATUS_LABEL[c.status]}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Home className="h-3 w-3" />
                            <span className="truncate">
                              {c.properties?.address || "No property linked"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span>Income £{c.income_monthly ?? "—"}/mo</span>
                          </div>
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(c.created_at).toLocaleDateString()}
                            </span>
                            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Referencing case</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Applicant</p>
                  <p className="text-sm font-medium mt-1">{selected.applicant?.name || "—"}</p>
                  <p className="text-sm text-muted-foreground">{selected.applicant?.email || "—"}</p>
                  <p className="text-sm text-muted-foreground">{selected.applicant?.phone || "—"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Property</p>
                  <p className="text-sm font-medium mt-1">{selected.properties?.address || "—"}</p>
                  <p className="text-sm text-muted-foreground">{selected.properties?.city || ""} {selected.properties?.postcode || ""}</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Employment</p>
                  <p className="text-sm font-medium mt-1">{selected.employment?.employer || "—"}</p>
                  <p className="text-sm text-muted-foreground">{selected.employment?.role || "—"}</p>
                  <p className="text-sm text-muted-foreground">{selected.employment?.contract || "—"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Income</p>
                  <p className="text-sm font-medium mt-1">£{selected.income_monthly ?? "—"} / month</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Previous landlord</p>
                  <p className="text-sm font-medium mt-1">{selected.previous_landlord?.name || "—"}</p>
                  <p className="text-sm text-muted-foreground">{selected.previous_landlord?.email || "—"}</p>
                  <p className="text-sm text-muted-foreground">Arrears: {selected.previous_landlord?.arrears || "—"}</p>
                </div>
              </div>

              <div className="rounded-lg border p-3 bg-muted/30">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Consent</p>
                <p className="text-sm">
                  {selected.credit_consent ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" /> Credit check consented
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-red-700">
                      <XCircle className="h-4 w-4" /> No consent given
                    </span>
                  )}
                </p>
              </div>

              {selected.decision && (
                <div className="rounded-lg border p-3 bg-muted/30">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Decision</p>
                  <p className="text-sm font-medium">{selected.decision}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Decided on {new Date(selected.decided_at).toLocaleDateString()}
                  </p>
                </div>
              )}

              <div className="pt-2 border-t space-y-3">
                <p className="text-sm font-medium">Update decision</p>
                <Select value={decisionStatus} onValueChange={setDecisionStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose status…" />
                  </SelectTrigger>
                  <SelectContent>
                    {COLUMNS.filter((s) => s !== "submitted").map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Textarea
                  placeholder="Notes or reason for decision…"
                  value={decisionNote}
                  onChange={(e) => setDecisionNote(e.target.value)}
                  rows={3}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setSelected(null)}>
                    Close
                  </Button>
                  <Button onClick={decide} disabled={!decisionStatus}>
                    Save decision <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
