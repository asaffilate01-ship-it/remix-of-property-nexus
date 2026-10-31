import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { collectPages } from "@/lib/portfolio-summary";
import { currentLondonDate, rentChargeOutstandingMinor, rentCheckoutBlockReason, summarizeTenantRent, type TenantRentSummary } from "@/lib/tenant-rent";
import { getDocumentSignedUrl } from "@/lib/documents.functions";
import { safeExternalUrl } from "@/lib/url-safety";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Home, FileText, Wrench, CreditCard, MessageSquare, RefreshCw, ShieldAlert } from "lucide-react";
import { RentCheckoutDialog } from "@/components/RentCheckoutDialog";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";

export const Route = createFileRoute("/_authenticated/portal/tenant")({
  head: () => ({ meta: [{ title: "Tenant portal — Gabley" }] }),
  component: TenantPortal,
});

type Tenancy = Pick<
  Database["public"]["Tables"]["tenancies"]["Row"],
  "id" | "tenant_name" | "agency_id" | "property_id" | "status" | "start_date" | "end_date" | "rent_amount" | "rent_frequency"
> & { properties: { title: string; address: string | null; city: string | null; postcode: string | null } | null };
type Rent = Pick<Database["public"]["Tables"]["rent_schedule"]["Row"], "id" | "due_date" | "amount" | "paid_amount" | "status">;
type WorkOrder = Pick<Database["public"]["Tables"]["work_orders"]["Row"], "id" | "title" | "status" | "created_at">;
type Document = Pick<Database["public"]["Tables"]["documents"]["Row"], "id" | "name" | "created_at">;
type Detail = { rents: Rent[]; workOrders: WorkOrder[]; docs: Document[]; summary: TenantRentSummary };
const money = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });

function TenantPortal() {
  const signDocument = useServerFn(getDocumentSignedUrl);
  const [userId, setUserId] = useState<string | null>(null);
  const [tenancies, setTenancies] = useState<Tenancy[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingTenancies, setLoadingTenancies] = useState(true);
  const [tenancyError, setTenancyError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [newIssue, setNewIssue] = useState({ title: "", description: "", priority: "medium" as "low" | "medium" | "high" | "emergency" });
  const [reporting, setReporting] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoadingTenancies(true);
    setTenancyError(null);
    void (async () => {
      try {
        const { data: auth, error: authError } = await supabase.auth.getUser();
        if (authError || !auth.user) throw new Error("Your sign-in could not be verified.");
        const found = await collectPages(async (from, to) => {
          const response = await supabase.from("tenancies")
            .select("id,tenant_name,agency_id,property_id,status,start_date,end_date,rent_amount,rent_frequency,properties(title,address,city,postcode)")
            .eq("tenant_user_id", auth.user.id)
            .order("start_date", { ascending: false })
            .order("id")
            .range(from, to);
          return { data: response.data as unknown as Tenancy[] | null, error: response.error };
        });
        if (!active) return;
        setUserId(auth.user.id);
        setTenancies(found);
        const preferred = found.find((tenancy) => tenancy.status === "active") ?? found[0];
        setSelectedId((previous) => found.some((tenancy) => tenancy.id === previous) ? previous : preferred?.id ?? null);
      } catch (cause) {
        if (active) {
          setUserId(null);
          setSelectedId(null);
          setTenancies([]);
          setTenancyError(cause instanceof Error ? cause.message : "Unable to retrieve tenancies.");
        }
      } finally {
        if (active) setLoadingTenancies(false);
      }
    })();
    return () => { active = false; };
  }, [reload]);

  useEffect(() => {
    if (!userId || !selectedId) {
      setDetail(null);
      return;
    }
    let active = true;
    setLoadingDetails(true);
    setDetail(null);
    setDetailError(null);
    void (async () => {
      try {
        const [rents, workOrders, docs] = await Promise.all([
          collectPages(async (from, to) => {
            const result = await supabase.from("rent_schedule")
              .select("id,due_date,amount,paid_amount,status")
              .eq("tenancy_id", selectedId)
              .order("due_date")
              .order("id")
              .range(from, to);
            return { data: result.data as Rent[] | null, error: result.error };
          }),
          supabase.from("work_orders")
            .select("id,title,status,created_at")
            .eq("tenancy_id", selectedId)
            .order("created_at", { ascending: false })
            .limit(20),
          supabase.from("documents")
            .select("id,name,created_at")
            // Tenant-scoped records plus tenancy-specific files, under RLS.
            .or(`tenant_user_id.eq.${userId},tenancy_id.eq.${selectedId}`)
            .order("created_at", { ascending: false })
            .limit(20),
        ]);
        if (workOrders.error) throw workOrders.error;
        if (docs.error) throw docs.error;
        const summary = summarizeTenantRent(rents, currentLondonDate());
        if (!active) return;
        setDetail({
          rents,
          workOrders: workOrders.data ?? [],
          docs: docs.data ?? [],
          summary,
        });
      } catch (cause) {
        if (active) setDetailError(cause instanceof Error ? cause.message : "Unable to load your rent and repair records.");
      } finally {
        if (active) setLoadingDetails(false);
      }
    })();
    return () => { active = false; };
  }, [userId, selectedId, reload]);

  const tenancy = tenancies.find((item) => item.id === selectedId) ?? null;

  const reportIssue = async () => {
    const title = newIssue.title.trim();
    if (!tenancy || !userId || !tenancy.agency_id || !title || reporting) return;
    setReporting(true);
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || auth.user?.id !== userId) throw new Error("Your sign-in needs refreshing.");
      const { error } = await supabase.from("work_orders").insert({
        agency_id: tenancy.agency_id,
        property_id: tenancy.property_id,
        tenancy_id: tenancy.id,
        title: title.slice(0, 160),
        description: newIssue.description.trim().slice(0, 2000),
        priority: newIssue.priority,
        status: "open",
        reported_by: userId,
      });
      if (error) throw error;
      toast.success("Repair request submitted");
      setNewIssue({ title: "", description: "", priority: "medium" });
      setReload((value) => value + 1);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Unable to submit the request");
    } finally {
      setReporting(false);
    }
  };

  const openDocument = async (id: string) => {
    try {
      const { url } = await signDocument({ data: { id } });
      const safe = safeExternalUrl(url);
      if (!safe) throw new Error("The document link is not safe to open.");
      window.location.assign(safe);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Document unavailable");
    }
  };

  if (loadingTenancies) return <div role="status" className="rounded-xl border p-8 text-sm text-muted-foreground">Verifying your tenancies…</div>;
  if (tenancyError) return (
    <div role="alert" className="space-y-3 rounded-xl border p-8">
      <h1 className="text-lg font-semibold">Unable to open your tenant portal</h1>
      <p className="text-sm text-muted-foreground">{tenancyError}</p>
      <Button onClick={() => setReload((value) => value + 1)}>Try again</Button>
    </div>
  );
  if (!tenancies.length) return (
    <div className="mx-auto max-w-2xl space-y-4 py-12 text-center">
      <Home className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
      <h1 className="text-xl font-semibold">No tenancy linked yet</h1>
      <p className="text-sm text-muted-foreground">Your letting agent can link your account to your tenancy.</p>
      <Button asChild variant="outline"><Link to="/inbox">Open messages</Link></Button>
    </div>
  );
  if (!tenancy) return null;

  return (
    <div className="space-y-6">
      <PaymentTestModeBanner />
      <RentCheckoutDialog rentScheduleId={payingId} onClose={() => {
        setPayingId(null);
        setReload((value) => value + 1);
      }} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">My tenancy</h1>
          <p className="text-sm text-muted-foreground">
            {tenancy.properties?.title ?? "Home"} · {tenancy.properties?.address ?? "Address pending"}
            {tenancy.properties?.city ? `, ${tenancy.properties.city}` : ""}
          </p>
        </div>
        <Button asChild variant="outline" size="sm"><Link to="/inbox"><MessageSquare className="mr-2 h-4 w-4" aria-hidden="true" /> Messages</Link></Button>
      </div>

      {tenancies.length > 1 && (
        <div className="max-w-lg space-y-2">
          <Label htmlFor="tenancy-select">Tenancy</Label>
          <Select value={tenancy.id} onValueChange={setSelectedId}>
            <SelectTrigger id="tenancy-select" aria-label="Choose tenancy">
              <SelectValue placeholder="Choose your tenancy" />
            </SelectTrigger>
            <SelectContent>
              {tenancies.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.properties?.address ?? item.properties?.title ?? item.tenant_name} ({item.status})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Rent agreement</CardTitle></CardHeader><CardContent>
          <p className="text-xl font-semibold tabular">{money.format(tenancy.rent_amount)}</p>
          <p className="text-xs text-muted-foreground capitalize">{tenancy.rent_frequency}</p>
        </CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Tenancy status</CardTitle></CardHeader><CardContent>
          <Badge variant="outline" className="capitalize">{tenancy.status.replaceAll("_", " ")}</Badge>
          <p className="mt-2 text-xs text-muted-foreground">Started {new Date(tenancy.start_date).toLocaleDateString("en-GB")}</p>
        </CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">End date</CardTitle></CardHeader><CardContent>
          <p className="text-lg font-semibold">{tenancy.end_date ? new Date(tenancy.end_date).toLocaleDateString("en-GB") : "Not specified"}</p>
        </CardContent></Card>
      </div>

      {loadingDetails ? (
        <div role="status" aria-live="polite" className="rounded-xl border p-8 text-sm text-muted-foreground">
          Loading this tenancy's verified charges and requests…
        </div>
      ) : detailError || !detail ? (
        <div role="alert" className="space-y-3 rounded-xl border p-8">
          <h2 className="text-lg font-semibold">Rent and repair records are unavailable</h2>
          <p className="text-sm text-muted-foreground">{detailError ?? "Please try again."} Figures are withheld until verified.</p>
          <Button onClick={() => setReload((value) => value + 1)}><RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" /> Retry</Button>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Next scheduled outstanding charge</CardTitle></CardHeader><CardContent>
              <p className="text-2xl font-semibold tabular">{detail.summary.nextDue ? money.format(detail.summary.nextDue.amount_due) : "—"}</p>
              <p className="text-xs text-muted-foreground">{detail.summary.nextDue ? `Due ${detail.summary.nextDue.due_date}` : "No upcoming outstanding charges"}</p>
            </CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Overdue rent charges</CardTitle></CardHeader><CardContent>
              <p className="text-2xl font-semibold tabular">{money.format(detail.summary.overdueAmount)}</p>
              <p className="text-xs text-muted-foreground">{detail.summary.overdueCount} outstanding charge(s)</p>
            </CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-4 w-4" aria-hidden="true" /> Rent schedule</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">Recorded allocations against rent charges; not a bank receipt or cash ledger. Online payments are currently available only for wholly unpaid charges.</p>
              {detail.rents.length === 0 && <p className="text-sm text-muted-foreground">No rent charges have been scheduled yet.</p>}
              {detail.rents.map((rent) => {
                const outstanding = rentChargeOutstandingMinor(rent);
                const block = rentCheckoutBlockReason(rent);
                return (
                  <div key={rent.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                    <div className="min-w-0">
                      <div className="font-semibold tabular">{money.format(outstanding / 100)} remaining</div>
                      <p className="text-xs text-muted-foreground">Due {rent.due_date} · Charge {money.format(rent.amount)} · Applied {money.format(rent.paid_amount ?? 0)}</p>
                      {block && outstanding > 0 && <p className="mt-1 max-w-lg text-xs text-muted-foreground">{block}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{outstanding === 0 ? "Settled / waived" : rent.status === "paid" ? "Check status" : "Outstanding"}</Badge>
                      {!block && (
                        <Button size="sm" type="button" onClick={() => setPayingId(rent.id)} disabled={payingId === rent.id}>
                          Pay {money.format(outstanding / 100)}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Wrench className="h-4 w-4" aria-hidden="true" /> Repair requests</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="flex items-start gap-2 text-xs text-muted-foreground"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> For an immediate danger such as a fire or gas leak, use the emergency services instead of this form.</p>
              <div className="space-y-2"><Label htmlFor="repair-title">What needs repairing?</Label>
                <Input id="repair-title" maxLength={160} value={newIssue.title} onChange={(event) => setNewIssue({ ...newIssue, title: event.target.value })} placeholder="Leaking tap in kitchen" />
              </div>
              <div className="space-y-2"><Label htmlFor="repair-detail">Description</Label>
                <Textarea id="repair-detail" maxLength={2000} value={newIssue.description} onChange={(event) => setNewIssue({ ...newIssue, description: event.target.value })} />
              </div>
              <div className="max-w-xs space-y-2"><Label htmlFor="repair-priority">Priority</Label>
                <Select value={newIssue.priority} onValueChange={(priority) => setNewIssue({ ...newIssue, priority: priority as typeof newIssue.priority })}>
                  <SelectTrigger id="repair-priority" aria-label="Repair request priority"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {!tenancy.agency_id && <p role="alert" className="text-sm text-destructive">Ask your letting agent to link your tenancy to the correct agency before submitting a request.</p>}
              <Button type="button" onClick={() => void reportIssue()} disabled={reporting || !tenancy.agency_id || !newIssue.title.trim()}>
                {reporting ? "Submitting…" : "Submit repair request"}
              </Button>
              <div className="space-y-2 pt-3">
                <h3 className="font-semibold text-sm">Recent requests</h3>
                {detail.workOrders.length === 0 && <p className="text-sm text-muted-foreground">No repair requests reported yet.</p>}
                {detail.workOrders.map((work) => (
                  <div key={work.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm">
                    <span className="min-w-0 break-words">{work.title}</span><Badge variant="outline">{work.status.replaceAll("_", " ")}</Badge>
                  </div>
                ))}
                {detail.workOrders.length === 20 && <p className="text-xs text-muted-foreground">Showing the latest 20 requests.</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4" aria-hidden="true" /> Documents</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {detail.docs.length === 0 && <p className="text-sm text-muted-foreground">No documents shared with this tenancy yet.</p>}
              {detail.docs.map((doc) => (
                <div key={doc.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2 text-sm last:border-b-0">
                  <span className="min-w-0 break-words">{doc.name}</span>
                  <Button type="button" variant="outline" size="sm" onClick={() => void openDocument(doc.id)}>Open document</Button>
                </div>
              ))}
              {detail.docs.length === 20 && <p className="text-xs text-muted-foreground">Showing the most recent 20 documents.</p>}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
