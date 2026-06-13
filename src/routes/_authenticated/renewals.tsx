import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CalendarClock, TrendingUp, FileText, Mail, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/renewals")({
  head: () => ({ meta: [{ title: "Tenancy renewals — Estately" }] }),
  component: RenewalsPage,
});

type Status = "due_soon" | "negotiating" | "renewed" | "notice_served" | "vacating";
type Row = {
  id: string; property: string; tenant: string; currentRent: number; proposedRent: number;
  endDate: string; status: Status; lastContact: string;
};

const SEED: Row[] = [
  { id: "T-101", property: "12 Acacia Avenue, M14", tenant: "Sarah Mitchell", currentRent: 1250, proposedRent: 1320, endDate: "2026-07-31", status: "due_soon", lastContact: "5 days ago" },
  { id: "T-102", property: "Flat 4, Quay View, M50", tenant: "James Patel", currentRent: 1450, proposedRent: 1525, endDate: "2026-08-14", status: "negotiating", lastContact: "yesterday" },
  { id: "T-103", property: "8 Cromwell Road, M16", tenant: "Olivia Brown", currentRent: 995, proposedRent: 1050, endDate: "2026-07-04", status: "renewed", lastContact: "2 weeks ago" },
  { id: "T-104", property: "27 King's Crescent, M20", tenant: "Daniel O'Connor", currentRent: 1700, proposedRent: 1800, endDate: "2026-08-30", status: "notice_served", lastContact: "today" },
  { id: "T-105", property: "Apt 11, The Mill, M3", tenant: "Aisha Khan", currentRent: 1100, proposedRent: 1175, endDate: "2026-09-12", status: "vacating", lastContact: "3 days ago" },
];

const TONE: Record<Status, string> = {
  due_soon: "bg-amber-50 text-amber-700 border-amber-200",
  negotiating: "bg-blue-50 text-blue-700 border-blue-200",
  renewed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  notice_served: "bg-purple-50 text-purple-700 border-purple-200",
  vacating: "bg-rose-50 text-rose-700 border-rose-200",
};
const LABEL: Record<Status, string> = { due_soon: "Due soon", negotiating: "In negotiation", renewed: "Renewed", notice_served: "Section 21 served", vacating: "Vacating" };

function RenewalsPage() {
  const [rows] = useState(SEED);
  const totalUplift = rows.reduce((a, r) => a + Math.max(0, r.proposedRent - r.currentRent), 0);
  const avgUpliftPct = Math.round((rows.reduce((a, r) => a + (r.proposedRent / r.currentRent - 1), 0) / rows.length) * 100 * 10) / 10;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">Tenancy renewals</h1>
          <p className="text-muted-foreground mt-1">Track ASTs approaching end‑date, propose rent reviews and serve notice.</p>
        </div>
        <Button><Mail className="h-4 w-4 mr-2" /> Bulk renewal letters</Button>
      </div>

      <div className="grid sm:grid-cols-4 gap-3">
        <Stat label="Renewals due" value={String(rows.filter(r => r.status === "due_soon" || r.status === "negotiating").length)} icon={CalendarClock} />
        <Stat label="Avg uplift" value={`${avgUpliftPct}%`} icon={TrendingUp} />
        <Stat label="Added monthly rent" value={`£${totalUplift.toLocaleString()}`} icon={TrendingUp} />
        <Stat label="Vacating" value={String(rows.filter(r => r.status === "vacating").length)} icon={AlertTriangle} />
      </div>

      <Card className="border-0 shadow-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left p-3">Property / Tenant</th>
                  <th className="text-left p-3">End date</th>
                  <th className="text-right p-3">Current PCM</th>
                  <th className="text-right p-3">Proposed PCM</th>
                  <th className="text-right p-3">Uplift</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-right p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const pct = ((r.proposedRent / r.currentRent - 1) * 100).toFixed(1);
                  return (
                    <tr key={r.id} className="border-t hover:bg-muted/30">
                      <td className="p-3">
                        <div className="font-medium">{r.property}</div>
                        <div className="text-xs text-muted-foreground">{r.tenant} · last contact {r.lastContact}</div>
                      </td>
                      <td className="p-3">{new Date(r.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</td>
                      <td className="p-3 text-right tabular-nums">£{r.currentRent.toLocaleString()}</td>
                      <td className="p-3 text-right tabular-nums">£{r.proposedRent.toLocaleString()}</td>
                      <td className="p-3 text-right tabular-nums text-emerald-700">+{pct}%</td>
                      <td className="p-3"><Badge variant="outline" className={TONE[r.status]}>{LABEL[r.status]}</Badge></td>
                      <td className="p-3 text-right">
                        <Button size="sm" variant="ghost" onClick={() => toast.success("Renewal offer sent")}><FileText className="h-3.5 w-3.5 mr-1" /> Offer</Button>
                        <Button size="sm" variant="ghost" onClick={() => toast.success("Marked as renewed")}><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Mark renewed</Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-card">
        <CardContent className="p-5">
          <div className="text-sm font-semibold mb-2">Quick rent review calculator</div>
          <RentCalc />
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: typeof CalendarClock }) {
  return (
    <Card className="border-0 shadow-card">
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="font-display text-2xl font-bold mt-0.5">{value}</div>
        </div>
        <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Icon className="h-5 w-5" /></div>
      </CardContent>
    </Card>
  );
}

function RentCalc() {
  const [current, setCurrent] = useState(1250);
  const [pct, setPct] = useState(5);
  const proposed = Math.round(current * (1 + pct / 100));
  return (
    <div className="grid sm:grid-cols-4 gap-3 items-end">
      <div><div className="text-xs text-muted-foreground mb-1">Current PCM (£)</div><Input type="number" value={current} onChange={(e) => setCurrent(Number(e.target.value))} /></div>
      <div><div className="text-xs text-muted-foreground mb-1">Uplift (%)</div><Input type="number" value={pct} onChange={(e) => setPct(Number(e.target.value))} /></div>
      <div><div className="text-xs text-muted-foreground mb-1">Proposed PCM</div><div className="h-10 rounded-md border bg-muted/40 px-3 flex items-center font-semibold">£{proposed.toLocaleString()}</div></div>
      <div><div className="text-xs text-muted-foreground mb-1">Added annually</div><div className="h-10 rounded-md border bg-muted/40 px-3 flex items-center font-semibold text-emerald-700">+£{((proposed - current) * 12).toLocaleString()}</div></div>
    </div>
  );
}
