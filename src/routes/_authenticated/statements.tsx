import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Download, Send, FileText } from "lucide-react";
import { IsoIcon } from "@/components/iso/IsoIcon";

export const Route = createFileRoute("/_authenticated/statements")({ component: StatementsPage });

type Line = { date: string; description: string; in?: number; out?: number };

const LANDLORDS = [
  { id: "l1", name: "M. Henderson", properties: 3 },
  { id: "l2", name: "Bayswater Holdings Ltd", properties: 7 },
  { id: "l3", name: "R. Forbes", properties: 1 },
];

const LINES: Line[] = [
  { date: "2026-06-01", description: "Rent received — 12 Marylebone Mews", in: 4200 },
  { date: "2026-06-01", description: "Rent received — Flat 4, Beacon Court", in: 1850 },
  { date: "2026-06-02", description: "Rent received — 8 Chorlton Road", in: 2100 },
  { date: "2026-06-03", description: "Management fee (10%)", out: 815 },
  { date: "2026-06-05", description: "Gas safety certificate — Marylebone", out: 95 },
  { date: "2026-06-08", description: "Leak repair — Beacon Court", out: 240 },
  { date: "2026-06-12", description: "Renewal fee — Chorlton tenancy", out: 150 },
  { date: "2026-06-13", description: "EICR — Marylebone", out: 280 },
];

function StatementsPage() {
  const [landlord, setLandlord] = useState(LANDLORDS[0].id);
  const [period, setPeriod] = useState("2026-06");

  const totalIn = LINES.reduce((s, l) => s + (l.in ?? 0), 0);
  const totalOut = LINES.reduce((s, l) => s + (l.out ?? 0), 0);
  const net = totalIn - totalOut;

  const current = LANDLORDS.find((l) => l.id === landlord)!;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <IsoIcon name="chart" size={56} className="shrink-0 hidden sm:block" />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold truncate">Owner statements</h1>
            <p className="text-muted-foreground text-sm">Monthly landlord remittance, fees and P&L summary.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Download className="mr-2 h-4 w-4" /> PDF</Button>
          <Button><Send className="mr-2 h-4 w-4" /> Send to landlord</Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
        <div>
          <div className="text-xs text-muted-foreground mb-1.5">Landlord</div>
          <Select value={landlord} onValueChange={setLandlord}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LANDLORDS.map((l) => <SelectItem key={l.id} value={l.id}>{l.name} ({l.properties})</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1.5">Period</div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="2026-06">June 2026</SelectItem>
              <SelectItem value="2026-05">May 2026</SelectItem>
              <SelectItem value="2026-04">April 2026</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Badge variant="outline" className="h-10 px-3 justify-center">Draft</Badge>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Income" value={`£${totalIn.toLocaleString()}`} tint="text-success" />
        <Stat label="Expenses" value={`£${totalOut.toLocaleString()}`} tint="text-destructive" />
        <Stat label="Net to landlord" value={`£${net.toLocaleString()}`} tint="text-primary" />
      </div>

      <Card className="border-0 shadow-card">
        <CardContent className="p-0">
          <div className="px-5 py-3 border-b flex items-center justify-between">
            <div className="font-semibold">{current.name} · {period}</div>
            <div className="text-xs text-muted-foreground">{LINES.length} transactions</div>
          </div>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b">
              <tr>
                <th className="text-left px-5 py-2 font-medium">Date</th>
                <th className="text-left px-5 py-2 font-medium">Description</th>
                <th className="text-right px-5 py-2 font-medium">In</th>
                <th className="text-right px-5 py-2 font-medium">Out</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {LINES.map((l, i) => (
                <tr key={i}>
                  <td className="px-5 py-2.5 text-muted-foreground whitespace-nowrap">{new Date(l.date).toLocaleDateString("en-GB")}</td>
                  <td className="px-5 py-2.5">{l.description}</td>
                  <td className="px-5 py-2.5 text-right text-success">{l.in ? `£${l.in.toLocaleString()}` : ""}</td>
                  <td className="px-5 py-2.5 text-right text-destructive">{l.out ? `£${l.out.toLocaleString()}` : ""}</td>
                </tr>
              ))}
              <tr className="bg-muted/40 font-semibold">
                <td className="px-5 py-3" colSpan={2}>Net remittance</td>
                <td className="px-5 py-3 text-right" colSpan={2}>£{net.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-card">
        <CardContent className="p-5">
          <div className="font-semibold mb-2 flex items-center gap-2"><FileText className="h-4 w-4" /> Year-to-date P&L</div>
          <div className="grid sm:grid-cols-4 gap-3">
            {[
              { label: "Gross rent", value: "£48,200" },
              { label: "Management fees", value: "£4,820" },
              { label: "Repairs & compliance", value: "£3,140" },
              { label: "Net income", value: "£40,240", tint: "text-success" },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border p-3">
                <div className={`text-lg font-bold ${s.tint ?? ""}`}>{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, tint }: { label: string; value: string; tint?: string }) {
  return (
    <Card className="border-0 shadow-card">
      <CardContent className="p-4">
        <div className={`text-xl font-bold ${tint ?? ""}`}>{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}
