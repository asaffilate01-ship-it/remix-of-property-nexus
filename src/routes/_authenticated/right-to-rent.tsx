import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, AlertTriangle, RefreshCw, FileCheck2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/right-to-rent")({
  head: () => ({ meta: [{ title: "Right to Rent — Estately" }] }),
  component: RtRPage,
});

type Status = "verified" | "share_code_pending" | "expiring" | "expired" | "follow_up";
type Row = { id: string; tenant: string; property: string; method: "Passport" | "Share code" | "BRP" | "ID verification provider"; expiry?: string; status: Status; nextCheck?: string };

const SEED: Row[] = [
  { id: "RTR-301", tenant: "Sarah Mitchell", property: "12 Acacia Avenue, M14", method: "Passport", status: "verified", nextCheck: "—" },
  { id: "RTR-302", tenant: "Yusuf Demir", property: "Flat 4, Quay View, M50", method: "Share code", expiry: "2026-09-30", status: "expiring", nextCheck: "2026-08-30" },
  { id: "RTR-303", tenant: "Maria Souza", property: "8 Cromwell Road, M16", method: "BRP", expiry: "2026-05-12", status: "expired", nextCheck: "Immediate" },
  { id: "RTR-304", tenant: "Daniel O'Connor", property: "27 King's Crescent, M20", method: "ID verification provider", status: "verified", nextCheck: "—" },
  { id: "RTR-305", tenant: "Aisha Khan", property: "Apt 11, The Mill, M3", method: "Share code", status: "share_code_pending", nextCheck: "Awaiting code" },
];

const TONE: Record<Status, string> = {
  verified: "bg-emerald-50 text-emerald-700 border-emerald-200",
  share_code_pending: "bg-amber-50 text-amber-700 border-amber-200",
  expiring: "bg-amber-50 text-amber-700 border-amber-200",
  expired: "bg-red-50 text-red-700 border-red-200",
  follow_up: "bg-blue-50 text-blue-700 border-blue-200",
};
const LABEL: Record<Status, string> = { verified: "Verified", share_code_pending: "Share code pending", expiring: "Expiring soon", expired: "Expired", follow_up: "Follow‑up check due" };

function RtRPage() {
  const [rows] = useState(SEED);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">Right to Rent</h1>
        <p className="text-muted-foreground mt-1">Section 22 Immigration Act 2014 — verify before any tenancy begins and diarise follow‑ups for time‑limited statuses.</p>
      </div>

      <Card className="border-0 shadow-card bg-amber-50/60 border-l-4 border-l-amber-500">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-700 mt-0.5" />
          <div className="text-sm">
            <div className="font-semibold text-amber-900">Penalties of up to £20,000 per tenant for breaches</div>
            <div className="text-amber-800/80">Re‑check time‑limited rights either 12 months from the original check or when leave expires — whichever is later.</div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left p-3">Ref</th>
                  <th className="text-left p-3">Tenant / Property</th>
                  <th className="text-left p-3">Method</th>
                  <th className="text-left p-3">Expiry</th>
                  <th className="text-left p-3">Follow‑up</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-right p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs">{r.id}</td>
                    <td className="p-3"><div className="font-medium">{r.tenant}</div><div className="text-xs text-muted-foreground">{r.property}</div></td>
                    <td className="p-3">{r.method}</td>
                    <td className="p-3">{r.expiry ? new Date(r.expiry).toLocaleDateString("en-GB") : "—"}</td>
                    <td className="p-3 text-xs">{r.nextCheck}</td>
                    <td className="p-3"><Badge variant="outline" className={TONE[r.status]}>{LABEL[r.status]}</Badge></td>
                    <td className="p-3 text-right">
                      <Button size="sm" variant="ghost" onClick={() => toast.success("Share‑code verified with Home Office")}><FileCheck2 className="h-3.5 w-3.5 mr-1" /> Verify</Button>
                      <Button size="sm" variant="ghost" onClick={() => toast.success("Reminder scheduled")}><RefreshCw className="h-3.5 w-3.5 mr-1" /> Re‑check</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-card">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><ShieldCheck className="h-5 w-5" /></div>
            <div className="text-sm">
              <div className="font-semibold">Accepted evidence</div>
              <div className="text-muted-foreground mt-1">UK/Irish passport · UK birth certificate + NI proof · Biometric Residence Permit · Home Office share code · Certified IDSP digital identity check.</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
