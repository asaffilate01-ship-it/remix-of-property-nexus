import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calculator } from "lucide-react";
import { siteUrl } from "@/lib/site-url";

export const Route = createFileRoute("/mortgage")({
  head: () => ({
    meta: [
      { title: "Mortgage calculator — Gabley" },
      { name: "description", content: "Calculate your monthly mortgage repayments, stamp duty and affordability for any UK property." },
      { property: "og:title", content: "Mortgage calculator — Gabley" },
      { property: "og:description", content: "Monthly repayments, stamp duty and affordability — instantly." },
    ],
    links: [{ rel: "canonical", href: siteUrl("/mortgage") }],
  }),
  component: MortgagePage,
});

function MortgagePage() {
  const [price, setPrice] = useState(450000);
  const [deposit, setDeposit] = useState(90000);
  const [years, setYears] = useState(25);
  const [rate, setRate] = useState(4.75);

  const loan = Math.max(0, price - deposit);
  const monthly = useMemo(() => {
    const r = rate / 100 / 12;
    const n = years * 12;
    if (r === 0) return loan / n;
    return (loan * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  }, [loan, years, rate]);

  const total = monthly * years * 12;
  const interest = total - loan;
  const ltv = loan / price;

  // SDLT (England, primary residence, 2025 thresholds)
  const sdlt = useMemo(() => {
    const bands = [
      [125000, 0],
      [250000, 0.02],
      [925000, 0.05],
      [1500000, 0.1],
      [Infinity, 0.12],
    ] as const;
    const remaining = price;
    let prev = 0;
    let tax = 0;
    for (const [cap, r] of bands) {
      const slice = Math.max(0, Math.min(remaining, cap) - prev);
      tax += slice * r;
      prev = cap;
      if (price <= cap) break;
    }
    return Math.round(tax);
  }, [price]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="container max-w-5xl py-12 md:py-20">
        <div className="text-center mb-10">
          <Badge variant="outline" className="mb-4"><Calculator className="h-3 w-3 mr-1.5" /> Updated for 2026 rates</Badge>
          <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">Mortgage calculator</h1>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">Estimate monthly repayments, total interest and stamp duty for any UK property.</p>
        </div>

        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-6">
          <Card className="border-0 shadow-elevated">
            <CardContent className="p-6 space-y-6">
              <NumField label="Property price" value={price} setValue={setPrice} prefix="£" step={5000} />
              <NumField label="Deposit" value={deposit} setValue={setDeposit} prefix="£" step={1000} note={`${Math.round((deposit / price) * 100)}% deposit`} />
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <Label>Term</Label>
                  <span className="font-semibold">{years} years</span>
                </div>
                <Slider value={[years]} min={5} max={40} step={1} onValueChange={([v]) => setYears(v)} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <Label>Interest rate</Label>
                  <span className="font-semibold">{rate.toFixed(2)}%</span>
                </div>
                <Slider value={[rate]} min={1} max={9} step={0.05} onValueChange={([v]) => setRate(v)} />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="border-0 shadow-elevated overflow-hidden">
              <div className="brand-gradient p-6 text-white">
                <div className="text-xs uppercase tracking-wide opacity-80">Monthly repayment</div>
                <div className="font-display text-5xl font-bold mt-1">£{Math.round(monthly).toLocaleString()}</div>
                <div className="text-sm opacity-80 mt-1">LTV {Math.round(ltv * 100)}% · {years}yr · {rate.toFixed(2)}%</div>
              </div>
              <CardContent className="p-5 grid grid-cols-2 gap-3">
                <Stat label="Loan amount" value={`£${loan.toLocaleString()}`} />
                <Stat label="Total interest" value={`£${Math.round(interest).toLocaleString()}`} tint="text-warning" />
                <Stat label="Total repayable" value={`£${Math.round(total).toLocaleString()}`} />
                <Stat label="Stamp duty (Eng.)" value={`£${sdlt.toLocaleString()}`} tint="text-destructive" />
              </CardContent>
            </Card>

            <Tabs defaultValue="afford">
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="afford">Affordability</TabsTrigger>
                <TabsTrigger value="btl">Buy-to-let</TabsTrigger>
              </TabsList>
              <TabsContent value="afford">
                <Card className="border-0 shadow-card">
                  <CardContent className="p-5 text-sm space-y-2">
                    <Row label="Required gross income (4.5×)" value={`£${Math.round(loan / 4.5).toLocaleString()}`} />
                    <Row label="Required gross income (5×)" value={`£${Math.round(loan / 5).toLocaleString()}`} />
                    <Row label="Estimated payment / income" value="~28%" />
                    <p className="text-xs text-muted-foreground pt-2">Lenders typically cap at 4.5–5× household income, subject to stress testing.</p>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="btl">
                <Card className="border-0 shadow-card">
                  <CardContent className="p-5 text-sm space-y-2">
                    <Row label="Required monthly rent (125%)" value={`£${Math.round(monthly * 1.25).toLocaleString()}`} />
                    <Row label="Required monthly rent (145%)" value={`£${Math.round(monthly * 1.45).toLocaleString()}`} />
                    <Row label="Gross yield @ rent above" value={`${((monthly * 1.45 * 12 / price) * 100).toFixed(1)}%`} />
                    <p className="text-xs text-muted-foreground pt-2">BTL lenders typically require rent ≥ 125–145% of mortgage interest, stress tested at 5.5%.</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

function NumField({ label, value, setValue, prefix, step, note }: { label: string; value: number; setValue: (n: number) => void; prefix?: string; step?: number; note?: string }) {
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <Label>{label}</Label>
        {note && <span className="text-xs text-muted-foreground">{note}</span>}
      </div>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{prefix}</span>}
        <Input
          type="number"
          value={value}
          step={step}
          onChange={(e) => setValue(Number(e.target.value) || 0)}
          className={`h-12 text-lg ${prefix ? "pl-7" : ""}`}
        />
      </div>
    </div>
  );
}

function Stat({ label, value, tint }: { label: string; value: string; tint?: string }) {
  return (
    <div>
      <div className={`text-lg font-bold ${tint ?? ""}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
