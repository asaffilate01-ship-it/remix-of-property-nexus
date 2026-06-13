import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Banknote, Mail, Phone, FileText, Link2, Sparkles, RefreshCw, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { listBankTransactions, reconcileTransactions, seedMockBankFeed } from "@/lib/banking.functions";

export const Route = createFileRoute("/_authenticated/arrears")({
  head: () => ({ meta: [{ title: "Arrears & rent reconciliation — Estately" }] }),
  component: ArrearsPage,
});

type Stage = "current" | "1_to_7" | "8_to_30" | "31_to_60" | "60_plus";
type Row = { id: string; tenant: string; property: string; pcm: number; balance: number; daysLate: number; stage: Stage; lastChase: string };

const SEED: Row[] = [
  { id: "ARR-401", tenant: "Sarah Mitchell", property: "12 Acacia Avenue, M14", pcm: 1250, balance: 0, daysLate: 0, stage: "current", lastChase: "—" },
  { id: "ARR-402", tenant: "James Patel", property: "Flat 4, Quay View, M50", pcm: 1450, balance: 480, daysLate: 5, stage: "1_to_7", lastChase: "yesterday — SMS" },
  { id: "ARR-403", tenant: "Olivia Brown", property: "8 Cromwell Road, M16", pcm: 995, balance: 995, daysLate: 14, stage: "8_to_30", lastChase: "3 days ago — email" },
  { id: "ARR-404", tenant: "Daniel O'Connor", property: "27 King's Crescent, M20", pcm: 1700, balance: 2400, daysLate: 42, stage: "31_to_60", lastChase: "today — call" },
  { id: "ARR-405", tenant: "Aisha Khan", property: "Apt 11, The Mill, M3", pcm: 1100, balance: 3300, daysLate: 91, stage: "60_plus", lastChase: "yesterday — letter before action" },
];

const TONE: Record<Stage, string> = {
  current: "bg-emerald-50 text-emerald-700 border-emerald-200",
  "1_to_7": "bg-amber-50 text-amber-700 border-amber-200",
  "8_to_30": "bg-orange-50 text-orange-700 border-orange-200",
  "31_to_60": "bg-red-50 text-red-700 border-red-200",
  "60_plus": "bg-purple-50 text-purple-700 border-purple-200",
};
const LABEL: Record<Stage, string> = { current: "Up to date", "1_to_7": "1–7 days", "8_to_30": "8–30 days", "31_to_60": "31–60 days", "60_plus": "60+ days" };

function ArrearsPage() {
  const [rows] = useState(SEED);
  const [reconciled, setReconciled] = useState(false);

  const fetchTxn = useServerFn(listBankTransactions);
  const runReconcile = useServerFn(reconcileTransactions);
  const seed = useServerFn(seedMockBankFeed);
  const [txns, setTxns] = useState<Array<{ id: string; posted_at: string; amount: number; reference: string | null; counterparty: string | null; matched_rent_schedule_id: string | null }>>([]);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try { const r = await fetchTxn({}); setTxns(r.transactions as never); } catch { /* noop */ }
  };
  useEffect(() => { refresh(); }, []);

  const connect = async () => {
    setBusy(true);
    try {
      await seed({});
      setReconciled(true);
      await refresh();
      toast.success("Sandbox bank feed connected");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  };
  const doReconcile = async () => {
    setBusy(true);
    try {
      const r = await runReconcile({});
      await refresh();
      toast.success(`${r.matched} of ${r.scanned} transactions matched to rent due`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  };

  const total = rows.reduce((a, r) => a + r.balance, 0);
  const buckets = (["1_to_7","8_to_30","31_to_60","60_plus"] as Stage[]).map(s => ({ s, total: rows.filter(r => r.stage === s).reduce((a, r) => a + r.balance, 0) }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">Arrears & rent reconciliation</h1>
          <p className="text-muted-foreground mt-1">Connect a bank feed via Open Banking (FCA‑regulated) — rents auto‑match against the schedule.</p>
        </div>
        <div className="flex gap-2">
          <Button variant={reconciled ? "outline" : "default"} onClick={connect} disabled={busy}>
            <Link2 className="h-4 w-4 mr-2" /> {reconciled ? "Connected: Sandbox feed" : "Connect bank (sandbox)"}
          </Button>
          {reconciled && (
            <Button variant="secondary" onClick={doReconcile} disabled={busy}>
              {busy ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Auto-reconcile
            </Button>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-5 gap-3">
        <Card className="border-0 shadow-card sm:col-span-1">
          <CardContent className="p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Total in arrears</div>
            <div className="font-display text-2xl font-bold mt-0.5 text-red-600">£{total.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">across {rows.filter(r => r.balance > 0).length} tenancies</div>
          </CardContent>
        </Card>
        {buckets.map((b) => (
          <Card key={b.s} className="border-0 shadow-card">
            <CardContent className="p-4">
              <Badge variant="outline" className={TONE[b.s]}>{LABEL[b.s]}</Badge>
              <div className="font-display text-xl font-bold mt-2 tabular-nums">£{b.total.toLocaleString()}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left p-3">Tenant / Property</th>
                  <th className="text-right p-3">Rent PCM</th>
                  <th className="text-right p-3">Balance</th>
                  <th className="text-left p-3">Stage</th>
                  <th className="text-left p-3">Last chase</th>
                  <th className="text-right p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-muted/30">
                    <td className="p-3"><div className="font-medium">{r.tenant}</div><div className="text-xs text-muted-foreground">{r.property}</div></td>
                    <td className="p-3 text-right tabular-nums">£{r.pcm.toLocaleString()}</td>
                    <td className={`p-3 text-right tabular-nums font-semibold ${r.balance > 0 ? "text-red-600" : "text-emerald-700"}`}>£{r.balance.toLocaleString()}</td>
                    <td className="p-3"><Badge variant="outline" className={TONE[r.stage]}>{LABEL[r.stage]}</Badge></td>
                    <td className="p-3 text-xs text-muted-foreground">{r.lastChase}</td>
                    <td className="p-3 text-right">
                      {r.balance > 0 && <>
                        <Button size="sm" variant="ghost" onClick={() => toast.success("SMS chase sent")}><Phone className="h-3.5 w-3.5 mr-1" /> SMS</Button>
                        <Button size="sm" variant="ghost" onClick={() => toast.success("Email chase sent")}><Mail className="h-3.5 w-3.5 mr-1" /> Email</Button>
                        {r.daysLate > 60 && <Button size="sm" variant="ghost" onClick={() => toast.success("Letter before action generated")}><FileText className="h-3.5 w-3.5 mr-1" /> LBA</Button>}
                      </>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {txns.length > 0 && (
        <Card className="border-0 shadow-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-semibold">Bank transactions</h2>
                <p className="text-xs text-muted-foreground">{txns.filter((t) => t.matched_rent_schedule_id).length} of {txns.length} matched to rent due</p>
              </div>
              <Badge variant="secondary">{txns.length} cleared</Badge>
            </div>
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="text-left py-2">Posted</th>
                    <th className="text-left py-2">Counterparty</th>
                    <th className="text-left py-2">Reference</th>
                    <th className="text-right py-2">Amount</th>
                    <th className="text-right py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {txns.slice(0, 20).map((t) => (
                    <tr key={t.id} className="border-t">
                      <td className="py-2 text-xs text-muted-foreground">{new Date(t.posted_at).toLocaleDateString()}</td>
                      <td className="py-2">{t.counterparty ?? "—"}</td>
                      <td className="py-2 text-xs text-muted-foreground">{t.reference ?? "—"}</td>
                      <td className="py-2 text-right tabular-nums">£{Number(t.amount).toLocaleString()}</td>
                      <td className="py-2 text-right">
                        {t.matched_rent_schedule_id
                          ? <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200"><CheckCircle2 className="h-3 w-3 mr-1" />Matched</Badge>
                          : <Badge variant="outline">Unmatched</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-0 shadow-card">
        <CardContent className="p-5 flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Banknote className="h-5 w-5" /></div>
          <div className="text-sm">
            <div className="font-semibold">How reconciliation works</div>
            <div className="text-muted-foreground mt-1">A sandbox feed is currently in use. Switch to a live Open Banking provider (TrueLayer/Plaid) to pull cleared transactions every 4 hours. We match by tenancy reference and amount — anything ambiguous lands in a review queue.</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
