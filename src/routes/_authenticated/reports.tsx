import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Building2, Users, PoundSterling, Clock } from "lucide-react";
import { IsoIcon } from "@/components/iso/IsoIcon";

export const Route = createFileRoute("/_authenticated/reports")({ component: ReportsPage });

const KPIS = [
  { label: "New instructions (MTD)", value: 18, change: +12, icon: <Building2 className="h-4 w-4" /> },
  { label: "Viewings booked", value: 142, change: +8, icon: <Users className="h-4 w-4" /> },
  { label: "Offers agreed", value: 9, change: -2, icon: <PoundSterling className="h-4 w-4" /> },
  { label: "Avg. stock turn (days)", value: 38, change: -5, icon: <Clock className="h-4 w-4" /> },
];

const BRANCHES = [
  { name: "London W1", stock: 64, sold_mtd: 8, let_mtd: 14, gross: 138400 },
  { name: "Manchester", stock: 41, sold_mtd: 5, let_mtd: 9, gross: 71200 },
  { name: "Bristol", stock: 28, sold_mtd: 3, let_mtd: 6, gross: 42800 },
];

const NEGOTIATORS = [
  { name: "Sarah Wells", listings: 22, deals: 7, conversion: "31%", revenue: "£48,200" },
  { name: "James O'Hara", listings: 18, deals: 5, conversion: "27%", revenue: "£34,100" },
  { name: "Priya Shah", listings: 15, deals: 4, conversion: "26%", revenue: "£28,800" },
  { name: "Tom Bauer", listings: 11, deals: 2, conversion: "18%", revenue: "£14,400" },
];

function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <IsoIcon name="chart" size={56} className="shrink-0 hidden sm:block" />
        <div>
          <h1 className="text-2xl font-bold">Reports & KPIs</h1>
          <p className="text-muted-foreground text-sm">Branch performance, negotiator league and stock turn.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {KPIS.map((k) => (
          <Card key={k.label} className="border-0 shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{k.value}</div>
                <div className="text-muted-foreground">{k.icon}</div>
              </div>
              <div className="text-xs text-muted-foreground">{k.label}</div>
              <div className={`text-xs mt-1.5 flex items-center gap-1 ${k.change >= 0 ? "text-success" : "text-destructive"}`}>
                {k.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(k.change)}% vs last month
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-card">
        <CardContent className="p-0">
          <div className="px-5 py-3 border-b font-semibold">Branch performance</div>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b">
              <tr>
                <th className="text-left px-5 py-2 font-medium">Branch</th>
                <th className="text-right px-5 py-2 font-medium">Live stock</th>
                <th className="text-right px-5 py-2 font-medium">Sold MTD</th>
                <th className="text-right px-5 py-2 font-medium">Let MTD</th>
                <th className="text-right px-5 py-2 font-medium">Gross revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {BRANCHES.map((b) => (
                <tr key={b.name}>
                  <td className="px-5 py-3 font-medium">{b.name}</td>
                  <td className="px-5 py-3 text-right">{b.stock}</td>
                  <td className="px-5 py-3 text-right">{b.sold_mtd}</td>
                  <td className="px-5 py-3 text-right">{b.let_mtd}</td>
                  <td className="px-5 py-3 text-right font-semibold">£{b.gross.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-card">
        <CardContent className="p-0">
          <div className="px-5 py-3 border-b font-semibold">Negotiator league</div>
          <div className="divide-y">
            {NEGOTIATORS.map((n, i) => (
              <div key={n.name} className="p-4 grid grid-cols-[auto_minmax(0,1fr)_repeat(3,auto)] items-center gap-4">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">{i + 1}</div>
                <div className="min-w-0">
                  <div className="font-medium truncate">{n.name}</div>
                  <div className="text-xs text-muted-foreground">{n.listings} listings · {n.deals} deals</div>
                </div>
                <Badge variant="outline">{n.conversion} conv.</Badge>
                <div className="text-sm font-semibold text-right hidden sm:block">{n.revenue}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-card">
        <CardContent className="p-5">
          <div className="font-semibold mb-3">Vendor reports sent</div>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { prop: "12 Marylebone Mews", sent: "12 Jun", opens: 4, viewings: 6 },
              { prop: "8 Chorlton Road", sent: "11 Jun", opens: 2, viewings: 3 },
              { prop: "22 Northstar Heights", sent: "09 Jun", opens: 5, viewings: 8 },
            ].map((r) => (
              <div key={r.prop} className="rounded-lg border p-3">
                <div className="font-medium text-sm truncate">{r.prop}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Sent {r.sent}</div>
                <div className="text-xs mt-2 flex justify-between">
                  <span>{r.opens} opens</span>
                  <span>{r.viewings} viewings</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
