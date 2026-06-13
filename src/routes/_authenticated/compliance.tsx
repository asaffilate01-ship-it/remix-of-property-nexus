import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, AlertTriangle, FileText, Trash2, BookOpen, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { IsoIcon } from "@/components/iso/IsoIcon";
import {
  fetchComplianceData,
  saveComplianceRecord,
  deleteComplianceRecord,
  computeStatus,
  type ComplianceStatus,
} from "@/lib/compliance.functions";

export const Route = createFileRoute("/_authenticated/compliance")({ component: CompliancePage });

type Rule = { type: string; label: string; scope: "property" | "tenancy" | "agency"; renewal_months: number | null; description: string | null; authority: string | null };
type Record_ = { id: string; type: string; property_id: string | null; agency_id: string | null; tenancy_id: string | null; issued_on: string | null; expires_on: string | null; status: ComplianceStatus; document_url: string | null; reference: string | null; notes: string | null };

function statusBadge(s: ComplianceStatus) {
  const map: Record<ComplianceStatus, string> = {
    valid: "bg-success text-success-foreground",
    due_soon: "bg-warning text-warning-foreground",
    expired: "bg-destructive text-destructive-foreground",
    missing: "bg-muted text-muted-foreground",
  };
  return <Badge className={map[s]}>{s.replace("_", " ")}</Badge>;
}

function iconFor(type: string) {
  if (type === "gas_safety") return "gas" as const;
  if (type === "eicr") return "eicr" as const;
  if (type === "epc") return "epc" as const;
  if (type.includes("hmo")) return "hmo" as const;
  return "shield" as const;
}

function CompliancePage() {
  const qc = useQueryClient();
  const load = useServerFn(fetchComplianceData);
  const save = useServerFn(saveComplianceRecord);
  const del = useServerFn(deleteComplianceRecord);
  const { data, isLoading } = useQuery({ queryKey: ["compliance"], queryFn: () => load() });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    type: "gas_safety",
    scope_kind: "property" as "property" | "agency" | "tenancy",
    scope_id: "",
    issued_on: "",
    expires_on: "",
    reference: "",
    document_url: "",
    notes: "",
  });
  const [scopeTab, setScopeTab] = useState<"all" | "property" | "tenancy" | "agency" | "library">("all");
  const [libAudience, setLibAudience] = useState<"all" | "landlord" | "agent" | "hmo" | "tenant">("all");

  const rules = (data?.rules ?? []) as Rule[];
  const records = (data?.records ?? []) as Record_[];
  const props = data?.properties ?? [];
  const agencies = data?.agencies ?? [];
  const tenancies = data?.tenancies ?? [];

  const summary = useMemo(() => ({
    valid: records.filter((r) => r.status === "valid").length,
    due_soon: records.filter((r) => r.status === "due_soon").length,
    expired: records.filter((r) => r.status === "expired").length,
    total: records.length,
  }), [records]);

  const expiring = records.filter((r) => r.status === "due_soon" || r.status === "expired").slice(0, 5);

  const visible = records.filter((r) => {
    if (scopeTab === "all") return true;
    if (scopeTab === "property") return !!r.property_id;
    if (scopeTab === "agency") return !!r.agency_id;
    if (scopeTab === "tenancy") return !!r.tenancy_id;
    return true;
  });

  const ruleByType = useMemo(() => Object.fromEntries(rules.map((r) => [r.type, r])), [rules]);
  const scopeOptions = useMemo(() => {
    const rule = ruleByType[form.type];
    if (!rule) return [] as { value: string; label: string }[];
    if (rule.scope === "property") return props.map((p) => ({ value: p.id, label: p.title }));
    if (rule.scope === "agency") return agencies.map((a) => ({ value: a.id, label: a.name }));
    return tenancies.map((t) => ({ value: t.id, label: t.tenant_name }));
  }, [form.type, ruleByType, props, agencies, tenancies]);

  const onTypeChange = (t: string) => {
    const rule = ruleByType[t];
    const scope_kind = (rule?.scope ?? "property") as typeof form.scope_kind;
    setForm({ ...form, type: t, scope_kind, scope_id: "" });
  };

  const submit = async () => {
    if (!form.scope_id) return;
    try {
      await save({ data: form });
      toast.success("Record saved");
      setOpen(false);
      setForm({ type: "gas_safety", scope_kind: "property", scope_id: "", issued_on: "", expires_on: "", reference: "", document_url: "", notes: "" });
      qc.invalidateQueries({ queryKey: ["compliance"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this record?")) return;
    await del({ data: { id } });
    qc.invalidateQueries({ queryKey: ["compliance"] });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:justify-between sm:items-center">
        <div className="flex min-w-0 items-center gap-4">
          <IsoIcon name="shield" size={56} className="shrink-0 hidden sm:block" />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold truncate">Compliance hub</h1>
            <p className="text-muted-foreground text-sm">UK landlord, tenancy and agency obligations — all tracked in one place.</p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="shrink-0"><Plus className="mr-2 h-4 w-4" /> Add record</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>New compliance record</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Item type</Label>
                <Select value={form.type} onValueChange={onTypeChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {(["property", "tenancy", "agency"] as const).map((scope) => (
                      <div key={scope}>
                        <div className="text-xs font-semibold text-muted-foreground px-2 py-1 capitalize">{scope}</div>
                        {rules.filter((r) => r.scope === scope).map((r) => (
                          <SelectItem key={r.type} value={r.type}>{r.label}</SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
                {ruleByType[form.type]?.description && (
                  <p className="text-xs text-muted-foreground mt-1">{ruleByType[form.type].description}{ruleByType[form.type].authority ? ` — ${ruleByType[form.type].authority}` : ""}</p>
                )}
              </div>
              <div>
                <Label>Applies to</Label>
                <Select value={form.scope_id} onValueChange={(v) => setForm({ ...form, scope_id: v })}>
                  <SelectTrigger><SelectValue placeholder={`Pick a ${form.scope_kind}`} /></SelectTrigger>
                  <SelectContent>
                    {scopeOptions.length === 0
                      ? <SelectItem value="__none" disabled>No {form.scope_kind} records yet</SelectItem>
                      : scopeOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Issued on</Label><Input type="date" value={form.issued_on} onChange={(e) => setForm({ ...form, issued_on: e.target.value })} /></div>
                <div><Label>Expires on</Label><Input type="date" value={form.expires_on} onChange={(e) => setForm({ ...form, expires_on: e.target.value })} /></div>
              </div>
              <div><Label>Reference / cert. number</Label><Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></div>
              <div><Label>Document URL</Label><Input value={form.document_url} onChange={(e) => setForm({ ...form, document_url: e.target.value })} placeholder="https://…" /></div>
              <div><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <div className="text-xs text-muted-foreground">
                Status will be set to <span className="font-medium">{computeStatus(form.expires_on || null)}</span> on save.
              </div>
            </div>
            <DialogFooter><Button onClick={submit} disabled={!form.scope_id || form.scope_id === "__none"}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard label="Tracked" value={summary.total} tint="text-foreground" />
        <SummaryCard label="Valid" value={summary.valid} tint="text-success" />
        <SummaryCard label="Due soon" value={summary.due_soon} tint="text-warning" />
        <SummaryCard label="Expired" value={summary.expired} tint="text-destructive" />
      </div>

      {/* Expiring banner */}
      {expiring.length > 0 && (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="font-medium">Action needed</div>
              <div className="text-sm text-muted-foreground">
                {expiring.length} item{expiring.length === 1 ? "" : "s"} expiring within 30 days or already expired.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={scopeTab} onValueChange={(v) => setScopeTab(v as typeof scopeTab)}>
        <TabsList>
          <TabsTrigger value="all">All records</TabsTrigger>
          <TabsTrigger value="property">Property</TabsTrigger>
          <TabsTrigger value="tenancy">Tenancy</TabsTrigger>
          <TabsTrigger value="agency">Agency</TabsTrigger>
          <TabsTrigger value="library"><BookOpen className="h-3 w-3 mr-1" /> Knowledge library</TabsTrigger>
        </TabsList>
        <TabsContent value="library" className="mt-4">
          <ComplianceLibrary rules={rules} audience={libAudience} setAudience={setLibAudience} onAdd={(type) => { onTypeChange(type); setOpen(true); }} />
        </TabsContent>
        <TabsContent value={scopeTab} className="mt-4">
          {isLoading ? (
            <div className="text-muted-foreground">Loading…</div>
          ) : visible.length === 0 ? (
            <Card className="border-dashed border-2 bg-transparent">
              <CardContent className="p-12 text-center">
                <IsoIcon name="shield" size={80} className="mx-auto opacity-70 mb-3" />
                <p className="font-medium">No records yet</p>
                <p className="text-sm text-muted-foreground">Add your first certificate to start tracking expiries.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-card">
              <CardContent className="p-0">
                <div className="divide-y">
                  {visible.map((r) => {
                    const rule = ruleByType[r.type];
                    const scopeLabel = r.property_id
                      ? props.find((p) => p.id === r.property_id)?.title
                      : r.agency_id
                      ? agencies.find((a) => a.id === r.agency_id)?.name
                      : tenancies.find((t) => t.id === r.tenancy_id)?.tenant_name;
                    return (
                      <div key={r.id} className="p-4 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 sm:gap-4">
                        <IsoIcon name={iconFor(r.type)} size={40} className="shrink-0" />
                        <div className="min-w-0">
                          <div className="font-medium truncate">{rule?.label ?? r.type.replace(/_/g, " ")}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {scopeLabel ?? "—"}{r.reference ? ` · Ref ${r.reference}` : ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                          <div className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                            {r.expires_on ? `Expires ${new Date(r.expires_on).toLocaleDateString("en-GB")}` : "No expiry"}
                          </div>
                          {statusBadge(r.status)}
                          {r.document_url && (
                            <a href={r.document_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
                              <FileText className="h-4 w-4" />
                            </a>
                          )}
                          <button onClick={() => remove(r.id)} className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SummaryCard({ label, value, tint }: { label: string; value: number; tint: string }) {
  return (
    <Card className="border-0 shadow-card">
      <CardContent className="p-4">
        <div className={`text-2xl font-bold ${tint}`}>{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}
