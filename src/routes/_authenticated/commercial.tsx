import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building, Search, Users, FileText, ShieldCheck, AlertTriangle, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/commercial")({
  head: () => ({ meta: [{ title: "Commercial lettings — Estately" }] }),
  component: CommercialPage,
});

type Property = {
  id: string; address: string; use: "Retail" | "Office" | "Industrial" | "Mixed use" | "Hospitality";
  sqft: number; rent: number; lease: number; rentReview: string; epc: "A"|"B"|"C"|"D"|"E"|"F"|"G";
  tenant?: { name: string; companyNo: string; sic: string; incorporated: string; status: "Active" | "Active - proposal to strike off" | "Liquidation"; accounts: string; rating: "AAA"|"AA"|"A"|"B"|"C" };
};

const SEED: Property[] = [
  { id: "COM-1", address: "14 Deansgate, M3 1RH", use: "Retail", sqft: 2400, rent: 68000, lease: 10, rentReview: "5-yearly upward only", epc: "C",
    tenant: { name: "Beech & Co Ltd", companyNo: "08471236", sic: "47710 — Retail sale of clothing", incorporated: "2013-04-12", status: "Active", accounts: "Filed 2025-09-30", rating: "AA" } },
  { id: "COM-2", address: "Unit 7, Trafford Park, M17", use: "Industrial", sqft: 18500, rent: 142000, lease: 15, rentReview: "RPI-linked", epc: "B",
    tenant: { name: "Pennine Logistics LLP", companyNo: "OC412987", sic: "52290 — Other freight transport", incorporated: "2016-08-22", status: "Active", accounts: "Filed 2025-06-30", rating: "A" } },
  { id: "COM-3", address: "1st Floor, 88 Mosley St, M2", use: "Office", sqft: 4200, rent: 95000, lease: 5, rentReview: "Open market", epc: "D" },
  { id: "COM-4", address: "The Grain Store, M4", use: "Hospitality", sqft: 3100, rent: 78000, lease: 20, rentReview: "RPI-linked, capped 5%", epc: "C",
    tenant: { name: "Storehouse Coffee Co Ltd", companyNo: "11203847", sic: "56103 — Take away food", incorporated: "2018-01-09", status: "Active - proposal to strike off", accounts: "Overdue", rating: "C" } },
];

const STATUS_TONE = {
  "Active": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Active - proposal to strike off": "bg-red-50 text-red-700 border-red-200",
  "Liquidation": "bg-red-100 text-red-800 border-red-300",
};
const RATING_TONE: Record<string, string> = { AAA: "bg-emerald-100 text-emerald-800", AA: "bg-emerald-50 text-emerald-700", A: "bg-lime-50 text-lime-700", B: "bg-amber-50 text-amber-700", C: "bg-red-50 text-red-700" };

function CommercialPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">Commercial lettings</h1>
        <p className="text-muted-foreground mt-1">Track FRI leases, schedule rent reviews and screen corporate covenants via Companies House and Experian.</p>
      </div>

      <Card className="border-0 shadow-card">
        <CardContent className="p-5">
          <div className="text-sm font-semibold mb-3 flex items-center gap-2"><Search className="h-4 w-4 text-primary" /> Companies House lookup</div>
          <CompaniesHouseLookup />
        </CardContent>
      </Card>

      <div className="space-y-3">
        {SEED.map((p) => (
          <Card key={p.id} className="border-0 shadow-card">
            <CardContent className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold flex items-center gap-2"><Building className="h-4 w-4 text-muted-foreground" /> {p.address}</div>
                  <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-2">
                    <Badge variant="outline">{p.use}</Badge>
                    <span>{p.sqft.toLocaleString()} sq ft</span>
                    <span>· £{(p.rent / p.sqft).toFixed(2)}/sq ft</span>
                    <span>· EPC {p.epc}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display text-2xl font-bold">£{p.rent.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">per annum · {p.lease}yr lease</div>
                </div>
              </div>

              <div className="mt-3 grid sm:grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted/40 p-3 text-sm">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">Rent review</div>
                  <div className="font-medium mt-0.5">{p.rentReview}</div>
                </div>
                {p.tenant ? (
                  <div className="rounded-lg border-l-4 border-l-primary bg-primary/5 p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold">{p.tenant.name}</div>
                        <div className="text-xs text-muted-foreground font-mono mt-0.5">Co. No. {p.tenant.companyNo} · inc. {new Date(p.tenant.incorporated).getFullYear()}</div>
                        <div className="text-xs text-muted-foreground mt-1">{p.tenant.sic}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge variant="outline" className={RATING_TONE[p.tenant.rating]}>Covenant {p.tenant.rating}</Badge>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <Badge variant="outline" className={STATUS_TONE[p.tenant.status]}>{p.tenant.status}</Badge>
                      <span className="text-muted-foreground">Accounts: {p.tenant.accounts}</span>
                      {p.tenant.status !== "Active" && <AlertTriangle className="h-3.5 w-3.5 text-red-600" />}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border-2 border-dashed p-3 text-sm text-muted-foreground flex items-center justify-between">
                    <span>Vacant — to let</span>
                    <Button size="sm" variant="ghost">Find tenant</Button>
                  </div>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                <Button size="sm" variant="ghost"><FileText className="h-3.5 w-3.5 mr-1" /> Lease</Button>
                <Button size="sm" variant="ghost"><Users className="h-3.5 w-3.5 mr-1" /> Schedule of cond.</Button>
                <Button size="sm" variant="ghost"><ShieldCheck className="h-3.5 w-3.5 mr-1" /> AML check</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CompaniesHouseLookup() {
  const [q, setQ] = useState("");
  const [result, setResult] = useState<{ name: string; no: string; status: string; address: string; officers: number } | null>(null);
  const search = () => {
    if (!q) { toast.error("Enter a company name or number"); return; }
    setResult({ name: q.length > 8 ? q : "Acme Trading Ltd", no: "0" + Math.floor(1000000 + Math.random() * 9000000), status: "Active", address: "1 Princess Street, Manchester M2 4DF", officers: 3 });
    toast.success("Companies House match found");
  };
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-[220px]">
        <div className="text-xs text-muted-foreground mb-1">Company name or registration number</div>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Beech & Co Ltd / 08471236" />
      </div>
      <Button onClick={search}><Search className="h-4 w-4 mr-2" /> Search</Button>
      {result && (
        <div className="w-full rounded-lg border bg-muted/30 p-3 text-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold">{result.name}</div>
              <div className="text-xs text-muted-foreground font-mono">Co. No. {result.no} · {result.address}</div>
            </div>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">{result.status}</Badge>
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            <span>{result.officers} officers on file</span>
            <Button size="sm" variant="ghost" className="h-7"><ExternalLink className="h-3 w-3 mr-1" /> View on Companies House</Button>
          </div>
        </div>
      )}
    </div>
  );
}
