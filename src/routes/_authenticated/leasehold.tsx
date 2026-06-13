import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Landmark, MapPin, Calendar, TrendingUp, AlertTriangle, FileText } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/leasehold")({
  head: () => ({ meta: [{ title: "Leasehold register — Estately" }] }),
  component: LeaseholdPage,
});

type Row = {
  id: string; property: string; tenure: "Leasehold" | "Share of freehold" | "Commonhold";
  lengthRemaining: number; groundRent: number; serviceCharge: number; freeholder: string;
  managingAgent: string; reviewClause: string; nextReview: string;
};

const SEED: Row[] = [
  { id: "LH-901", property: "Flat 4, Quay View, M50", tenure: "Leasehold", lengthRemaining: 112, groundRent: 250, serviceCharge: 2400, freeholder: "Quay View Freeholders Ltd", managingAgent: "FirstPort", reviewClause: "Doubling every 25 years", nextReview: "2031-04-01" },
  { id: "LH-902", property: "Apt 11, The Mill, M3", tenure: "Leasehold", lengthRemaining: 78, groundRent: 350, serviceCharge: 3100, freeholder: "Mill Estates LLP", managingAgent: "RMG", reviewClause: "RPI linked", nextReview: "2027-09-01" },
  { id: "LH-903", property: "23 Park Mansions, M14", tenure: "Share of freehold", lengthRemaining: 982, groundRent: 0, serviceCharge: 1800, freeholder: "Park Mansions RTM Co", managingAgent: "Self‑managed", reviewClause: "None", nextReview: "—" },
  { id: "LH-904", property: "Penthouse, Sky Tower, M1", tenure: "Leasehold", lengthRemaining: 61, groundRent: 500, serviceCharge: 6200, freeholder: "Sky Tower Holdings", managingAgent: "Rendall & Rittner", reviewClause: "Doubling every 10 years", nextReview: "2027-01-15" },
];

function LeaseholdPage() {
  const [rows] = useState(SEED);
  const onerous = rows.filter((r) => r.reviewClause.toLowerCase().includes("doubling"));
  const short = rows.filter((r) => r.lengthRemaining < 80 && r.tenure === "Leasehold");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">Leasehold register</h1>
        <p className="text-muted-foreground mt-1">Track unexpired terms, ground rent, service charges and managing agents. Flag onerous review clauses and short leases.</p>
      </div>

      {(short.length > 0 || onerous.length > 0) && (
        <Card className="border-0 shadow-card bg-amber-50/60 border-l-4 border-l-amber-500">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-700 mt-0.5" />
            <div className="text-sm">
              {short.length > 0 && <div><strong>{short.length} flat{short.length === 1 ? "" : "s"} under 80 years</strong> — lenders typically require 70+ years remaining; consider statutory lease extension under LRHUDA 1993.</div>}
              {onerous.length > 0 && <div className="mt-1"><strong>{onerous.length} lease{onerous.length === 1 ? " has" : "s have"} a doubling ground rent</strong> — flagged by mortgage lenders as onerous post‑2017.</div>}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-0 shadow-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left p-3">Property</th>
                  <th className="text-left p-3">Tenure</th>
                  <th className="text-right p-3">Years left</th>
                  <th className="text-right p-3">Ground rent</th>
                  <th className="text-right p-3">Service charge</th>
                  <th className="text-left p-3">Freeholder / MA</th>
                  <th className="text-left p-3">Review clause</th>
                  <th className="text-right p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const isShort = r.lengthRemaining < 80 && r.tenure === "Leasehold";
                  const isOnerous = r.reviewClause.toLowerCase().includes("doubling");
                  return (
                    <tr key={r.id} className="border-t hover:bg-muted/30">
                      <td className="p-3 font-medium">{r.property}</td>
                      <td className="p-3"><Badge variant="outline">{r.tenure}</Badge></td>
                      <td className={`p-3 text-right tabular-nums ${isShort ? "text-red-600 font-semibold" : ""}`}>{r.lengthRemaining}</td>
                      <td className="p-3 text-right tabular-nums">{r.groundRent === 0 ? <span className="text-muted-foreground">peppercorn</span> : `£${r.groundRent}`}</td>
                      <td className="p-3 text-right tabular-nums">£{r.serviceCharge.toLocaleString()}</td>
                      <td className="p-3 text-xs"><div className="font-medium text-foreground">{r.freeholder}</div><div className="text-muted-foreground">{r.managingAgent}</div></td>
                      <td className="p-3 text-xs">
                        <Badge variant="outline" className={isOnerous ? "bg-red-50 text-red-700 border-red-200" : "bg-muted text-foreground"}>{r.reviewClause}</Badge>
                        {r.nextReview !== "—" && <div className="text-muted-foreground mt-1">Next: {new Date(r.nextReview).toLocaleDateString("en-GB")}</div>}
                      </td>
                      <td className="p-3 text-right">
                        <Button size="sm" variant="ghost"><FileText className="h-3.5 w-3.5 mr-1" /> Lease</Button>
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
          <div className="font-semibold text-sm mb-3 flex items-center gap-2"><Landmark className="h-4 w-4 text-primary" /> Council tax band lookup</div>
          <CouncilTaxLookup />
        </CardContent>
      </Card>
    </div>
  );
}

function CouncilTaxLookup() {
  const [postcode, setPostcode] = useState("M14 5PD");
  const [result, setResult] = useState<{ band: string; annual: number; council: string } | null>({ band: "C", annual: 1842, council: "Manchester City Council" });
  const lookup = () => {
    setResult({ band: ["A","B","C","D","E","F","G","H"][Math.floor(Math.random() * 6)], annual: 1500 + Math.floor(Math.random() * 1800), council: "Manchester City Council" });
    toast.success("VOA lookup complete");
  };
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-[180px]">
        <div className="text-xs text-muted-foreground mb-1">Postcode</div>
        <Input value={postcode} onChange={(e) => setPostcode(e.target.value)} />
      </div>
      <Button onClick={lookup}><MapPin className="h-4 w-4 mr-2" /> Lookup VOA</Button>
      {result && (
        <div className="flex items-center gap-4 ml-2">
          <div><div className="text-xs text-muted-foreground">Band</div><div className="font-display text-2xl font-bold">{result.band}</div></div>
          <div><div className="text-xs text-muted-foreground">Annual</div><div className="font-semibold">£{result.annual.toLocaleString()}</div></div>
          <div><div className="text-xs text-muted-foreground">Authority</div><div className="font-medium text-sm">{result.council}</div></div>
        </div>
      )}
    </div>
  );
}
