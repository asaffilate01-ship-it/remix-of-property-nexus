import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, TrendingDown, Link2, Check, X } from "lucide-react";
import { IsoIcon } from "@/components/iso/IsoIcon";

export const Route = createFileRoute("/_authenticated/offers")({ component: OffersPage });

type Offer = { id: string; buyer: string; amount: number; submitted: string; status: "pending" | "accepted" | "rejected" | "countered"; financing: string };
type Chain = { position: number; party: string; status: "secured" | "pending" | "broken"; note: string };

const PROPERTIES = [
  {
    id: "p1",
    title: "12 Marylebone Mews, W1",
    asking: 1850000,
    vendor: "M. Henderson",
    offers: [
      { id: "o1", buyer: "Mr & Mrs Patel", amount: 1850000, submitted: "2026-06-11", status: "accepted", financing: "Cash" },
      { id: "o2", buyer: "Cavendish Holdings", amount: 1820000, submitted: "2026-06-10", status: "rejected", financing: "75% LTV" },
      { id: "o3", buyer: "S. Renton", amount: 1780000, submitted: "2026-06-08", status: "rejected", financing: "AIP" },
    ] as Offer[],
    chain: [
      { position: 1, party: "Mr & Mrs Patel (buyer)", status: "secured", note: "Cash buyer — no chain below" },
      { position: 2, party: "M. Henderson (vendor)", status: "secured", note: "Onward purchase — TR1 exchanged" },
      { position: 3, party: "Vendor's vendor", status: "pending", note: "Probate clearance awaited" },
    ] as Chain[],
  },
  {
    id: "p2",
    title: "8 Chorlton Road, M16",
    asking: 485000,
    vendor: "R. Forbes",
    offers: [
      { id: "o4", buyer: "L. Whitcombe", amount: 470000, submitted: "2026-06-12", status: "countered", financing: "85% LTV" },
      { id: "o5", buyer: "Northstar Lettings", amount: 455000, submitted: "2026-06-09", status: "pending", financing: "BTL" },
    ] as Offer[],
    chain: [
      { position: 1, party: "L. Whitcombe (buyer)", status: "pending", note: "Selling flat in Didsbury" },
      { position: 2, party: "R. Forbes (vendor)", status: "secured", note: "Moving to rental" },
    ] as Chain[],
  },
];

const STATUS_BADGE: Record<Offer["status"], string> = {
  pending: "bg-muted text-muted-foreground",
  accepted: "bg-success text-success-foreground",
  rejected: "bg-destructive/15 text-destructive",
  countered: "bg-warning text-warning-foreground",
};

const CHAIN_BADGE: Record<Chain["status"], string> = {
  secured: "bg-success text-success-foreground",
  pending: "bg-warning text-warning-foreground",
  broken: "bg-destructive text-destructive-foreground",
};

function OffersPage() {
  const [activeId, setActiveId] = useState(PROPERTIES[0].id);
  const active = PROPERTIES.find((p) => p.id === activeId)!;
  const topOffer = active.offers.reduce((max, o) => (o.amount > max.amount ? o : max), active.offers[0]);
  const delta = topOffer.amount - active.asking;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <IsoIcon name="key" size={56} className="shrink-0 hidden sm:block" />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold truncate">Offers & chains</h1>
            <p className="text-muted-foreground text-sm">Bidding ladder, vendor reports and chain progression.</p>
          </div>
        </div>
        <Button><Plus className="mr-2 h-4 w-4" /> Log offer</Button>
      </div>

      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        <Card className="border-0 shadow-card h-fit">
          <CardContent className="p-0 divide-y">
            {PROPERTIES.map((p) => {
              const top = p.offers.reduce((max, o) => (o.amount > max.amount ? o : max), p.offers[0]);
              return (
                <button
                  key={p.id}
                  onClick={() => setActiveId(p.id)}
                  className={`w-full text-left p-4 transition-colors ${p.id === activeId ? "bg-primary/5" : "hover:bg-muted/40"}`}
                >
                  <div className="font-medium truncate">{p.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Asking £{p.asking.toLocaleString()}</div>
                  <div className="text-xs mt-1">
                    Top offer <span className="font-semibold">£{top.amount.toLocaleString()}</span> · {p.offers.length} bids
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-6 min-w-0">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Asking" value={`£${active.asking.toLocaleString()}`} />
            <Stat label="Top offer" value={`£${topOffer.amount.toLocaleString()}`} />
            <Stat
              label="vs asking"
              value={`${delta >= 0 ? "+" : ""}£${Math.abs(delta).toLocaleString()}`}
              tint={delta >= 0 ? "text-success" : "text-destructive"}
              icon={delta >= 0 ? <TrendingUp className="h-4 w-4 text-success" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
            />
          </div>

          <Card className="border-0 shadow-card">
            <CardContent className="p-5">
              <div className="font-semibold mb-3">Offer ladder</div>
              <div className="divide-y">
                {[...active.offers].sort((a, b) => b.amount - a.amount).map((o) => (
                  <div key={o.id} className="py-3 grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{o.buyer}</div>
                      <div className="text-xs text-muted-foreground">{o.financing} · {new Date(o.submitted).toLocaleDateString("en-GB")}</div>
                    </div>
                    <div className="font-semibold">£{o.amount.toLocaleString()}</div>
                    <Badge className={STATUS_BADGE[o.status]}>{o.status}</Badge>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <Button size="sm" variant="outline"><Check className="h-3 w-3 mr-1.5" /> Accept top</Button>
                <Button size="sm" variant="outline"><X className="h-3 w-3 mr-1.5" /> Counter</Button>
                <Button size="sm" variant="ghost">Notify vendor</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-card">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3"><Link2 className="h-4 w-4" /><div className="font-semibold">Sales chain</div></div>
              <ol className="space-y-3">
                {active.chain.map((c) => (
                  <li key={c.position} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                    <div className="h-7 w-7 shrink-0 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">{c.position}</div>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{c.party}</div>
                      <div className="text-xs text-muted-foreground truncate">{c.note}</div>
                    </div>
                    <Badge className={CHAIN_BADGE[c.status]}>{c.status}</Badge>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tint, icon }: { label: string; value: string; tint?: string; icon?: React.ReactNode }) {
  return (
    <Card className="border-0 shadow-card">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className={`text-xl font-bold ${tint ?? ""}`}>{value}</div>
          {icon}
        </div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}
