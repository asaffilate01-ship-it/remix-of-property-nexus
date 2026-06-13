import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Banknote, TrendingDown, AlertTriangle, Mail, Phone, FileText, Link2 } from "lucide-react";
import { toast } from "sonner";

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

  const total = rows.reduce((a, r) => a + r.balance, 0);
  const buckets = (["1_to_7","8_to_30","31_to_60","60_plus"] as Stage[]).map(s => ({ s, total: rows.filter(r => r.stage === s).reduce((a, r) => a + r.balance, 0) }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">Arrears & rent reconciliation</h1>
          <p className="text-muted-foreground mt-1">Connect a bank feed via Open Banking (FCA‑regulated) — rents auto‑match against the schedule.</p>
        </div>
        <Button variant={reconciled ? "outline" : "default"} onClick={() => { setReconciled(true); toast.success("Bank feed connected — 47 transactions matched"); }}>
          <Link2 className="h-4 w-4 mr-2" /> {reconciled ? "Connected: Barclays Business" : "Connect bank (Open Banking)"}
        </Button>
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

      <Card className="border-0 shadow-card">
        <CardContent className="p-5 flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Banknote className="h-5 w-5" /></div>
          <div className="text-sm">
            <div className="font-semibold">How reconciliation works</div>
            <div className="text-muted-foreground mt-1">Open Banking feeds (TrueLayer/Plaid) pull cleared transactions every 4 hours. We match by tenancy reference, amount and payer name — anything ambiguous lands in a review queue.</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
