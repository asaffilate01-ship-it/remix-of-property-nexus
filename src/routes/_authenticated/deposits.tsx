import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, AlertTriangle, Clock, Building2, Banknote } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/deposits")({
  head: () => ({ meta: [{ title: "Deposit protection — Estately" }] }),
  component: DepositsPage,
});

type Scheme = "DPS" | "MyDeposits" | "TDS";
type Status = "protected" | "pending" | "overdue" | "returned" | "disputed";

type Row = { id: string; property: string; tenant: string; amount: number; scheme: Scheme; receivedOn: string; protectedOn?: string; status: Status; prescribedInfo: boolean };

const SEED: Row[] = [
  { id: "DEP-2401", property: "12 Acacia Avenue, M14", tenant: "Sarah Mitchell", amount: 1442, scheme: "DPS", receivedOn: "2025-07-12", protectedOn: "2025-07-18", status: "protected", prescribedInfo: true },
  { id: "DEP-2402", property: "Flat 4, Quay View, M50", tenant: "James Patel", amount: 1673, scheme: "MyDeposits", receivedOn: "2026-06-08", status: "pending", prescribedInfo: false },
  { id: "DEP-2403", property: "8 Cromwell Road, M16", tenant: "Olivia Brown", amount: 1148, scheme: "TDS", receivedOn: "2026-05-19", status: "overdue", prescribedInfo: false },
  { id: "DEP-2404", property: "27 King's Crescent, M20", tenant: "Daniel O'Connor", amount: 1961, scheme: "DPS", receivedOn: "2025-09-01", protectedOn: "2025-09-04", status: "disputed", prescribedInfo: true },
  { id: "DEP-2405", property: "Apt 11, The Mill, M3", tenant: "Aisha Khan", amount: 1269, scheme: "DPS", receivedOn: "2024-04-22", protectedOn: "2024-04-25", status: "returned", prescribedInfo: true },
];

const TONE: Record<Status, string> = {
  protected: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  overdue: "bg-red-50 text-red-700 border-red-200",
  returned: "bg-muted text-foreground border-muted-foreground/20",
  disputed: "bg-purple-50 text-purple-700 border-purple-200",
};

function daysSince(d: string) { return Math.floor((Date.now() - new Date(d).getTime()) / 86400000); }

function DepositsPage() {
  const [rows] = useState(SEED);
  const protectedTotal = rows.filter(r => r.status === "protected").reduce((a, r) => a + r.amount, 0);
  const overdue = rows.filter(r => r.status === "overdue" || (r.status === "pending" && daysSince(r.receivedOn) > 30));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">Deposit protection</h1>
        <p className="text-muted-foreground mt-1">DPS, MyDeposits and TDS register. 30‑day protection deadline tracked automatically.</p>
      </div>

      {overdue.length > 0 && (
        <Card className="border-0 shadow-card bg-red-50/60 border-l-4 border-l-red-500">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="text-sm">
              <div className="font-semibold text-red-900">{overdue.length} deposit{overdue.length === 1 ? "" : "s"} outside the 30‑day window</div>
              <div className="text-red-800/80">Landlords risk 1×–3× penalty under the Housing Act 2004. Protect now to mitigate.</div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid sm:grid-cols-4 gap-3">
        <Stat icon={ShieldCheck} label="Protected" value={`£${protectedTotal.toLocaleString()}`} />
        <Stat icon={Clock} label="Pending" value={String(rows.filter(r => r.status === "pending").length)} />
        <Stat icon={AlertTriangle} label="Overdue" value={String(overdue.length)} tone="text-red-600" />
        <Stat icon={Banknote} label="Avg deposit" value={`£${Math.round(rows.reduce((a, r) => a + r.amount, 0) / rows.length).toLocaleString()}`} />
      </div>

      <Card className="border-0 shadow-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left p-3">Ref</th>
                  <th className="text-left p-3">Property / Tenant</th>
                  <th className="text-right p-3">Amount</th>
                  <th className="text-left p-3">Scheme</th>
                  <th className="text-left p-3">Received</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Prescribed info</th>
                  <th className="text-right p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const days = daysSince(r.receivedOn);
                  const breach = (r.status === "pending" || r.status === "overdue") && days > 30;
                  return (
                    <tr key={r.id} className="border-t hover:bg-muted/30">
                      <td className="p-3 font-mono text-xs">{r.id}</td>
                      <td className="p-3"><div className="font-medium">{r.property}</div><div className="text-xs text-muted-foreground">{r.tenant}</div></td>
                      <td className="p-3 text-right tabular-nums">£{r.amount.toLocaleString()}</td>
                      <td className="p-3"><Badge variant="outline" className="font-mono text-[10px]">{r.scheme}</Badge></td>
                      <td className="p-3">
                        <div>{new Date(r.receivedOn).toLocaleDateString("en-GB")}</div>
                        <div className={`text-xs ${breach ? "text-red-600 font-medium" : "text-muted-foreground"}`}>day {days} of 30</div>
                      </td>
                      <td className="p-3"><Badge variant="outline" className={TONE[r.status]}>{r.status}</Badge></td>
                      <td className="p-3">{r.prescribedInfo ? <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Served</Badge> : <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Outstanding</Badge>}</td>
                      <td className="p-3 text-right">
                        {r.status !== "protected" && r.status !== "returned" && (
                          <Button size="sm" variant="ghost" onClick={() => toast.success(`Sent to ${r.scheme}`)}><ShieldCheck className="h-3.5 w-3.5 mr-1" /> Protect</Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => toast.success("Certificate downloaded")}><Building2 className="h-3.5 w-3.5 mr-1" /> Cert.</Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }: { icon: typeof ShieldCheck; label: string; value: string; tone?: string }) {
  return (
    <Card className="border-0 shadow-card">
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className={`font-display text-2xl font-bold mt-0.5 ${tone ?? ""}`}>{value}</div>
        </div>
        <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Icon className="h-5 w-5" /></div>
      </CardContent>
    </Card>
  );
}
