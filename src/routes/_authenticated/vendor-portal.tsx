import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Check, Clock, FileText, MessageSquare, Home, Scale, Banknote, Key, Eye, Gavel, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/vendor-portal")({
  head: () => ({ meta: [{ title: "Vendor portal — Estately" }] }),
  component: VendorPortal,
});

const stages = [
  { key: "listed", label: "Listed", icon: Home },
  { key: "viewings", label: "Viewings", icon: Eye },
  { key: "offer", label: "Offer agreed", icon: Gavel },
  { key: "legal", label: "Legal", icon: Scale },
  { key: "exchange", label: "Exchange", icon: Banknote },
  { key: "completion", label: "Completion", icon: Key },
] as const;

const currentStage = 3;

const viewings = [
  { when: "Mon 16 Jun · 11:00", name: "Sarah & James L.", feedback: "Very positive — second viewing booked", tone: "positive" as const },
  { when: "Sat 14 Jun · 14:30", name: "Mr R. Patel", feedback: "Liked layout, concerned about parking", tone: "neutral" as const },
  { when: "Fri 13 Jun · 18:00", name: "Ms K. Owens", feedback: "Made offer £465,000 — accepted", tone: "positive" as const },
  { when: "Wed 11 Jun · 13:00", name: "The Hendersons", feedback: "Below budget", tone: "negative" as const },
];

const milestones = [
  { label: "Memorandum of sale issued", done: true, when: "13 Jun" },
  { label: "Buyer's solicitor instructed", done: true, when: "14 Jun" },
  { label: "Searches ordered", done: true, when: "15 Jun" },
  { label: "Survey booked", done: false, when: "Est. 22 Jun" },
  { label: "Enquiries raised", done: false, when: "Est. 28 Jun" },
  { label: "Exchange of contracts", done: false, when: "Est. 18 Jul" },
];

function VendorPortal() {
  const progress = ((currentStage + 1) / stages.length) * 100;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">Your sale</h1>
        <p className="text-muted-foreground mt-1">42 Oakwood Avenue, Didsbury, M20 · Listed at £475,000</p>
      </div>

      {/* Progress timeline */}
      <Card className="border-0 shadow-card">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2 text-xs text-muted-foreground">
            <span>Sale progression</span><span>{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="mb-5" />
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {stages.map((s, i) => {
              const done = i < currentStage; const active = i === currentStage;
              return (
                <div key={s.key} className="text-center">
                  <div className={`mx-auto h-10 w-10 rounded-full flex items-center justify-center mb-1 ${done ? "bg-primary text-primary-foreground" : active ? "ring-2 ring-primary bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {done ? <Check className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
                  </div>
                  <div className={`text-[11px] sm:text-xs ${active ? "font-semibold" : ""}`}>{s.label}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-4">
        <Stat label="Viewings booked" value="12" sub="3 this week" />
        <Stat label="Offers received" value="4" sub="Best: £475,000" />
        <Stat label="Days on market" value="21" sub="Avg in area: 38" />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="border-0 shadow-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Recent viewings & feedback</h2>
              <Badge variant="secondary">{viewings.length}</Badge>
            </div>
            <div className="space-y-2.5">
              {viewings.map((v, i) => (
                <div key={i} className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{v.name}</div>
                      <div className="text-xs text-muted-foreground inline-flex items-center gap-1"><Clock className="h-3 w-3" />{v.when}</div>
                    </div>
                    <Badge variant={v.tone === "positive" ? "default" : v.tone === "negative" ? "destructive" : "secondary"} className="capitalize">{v.tone}</Badge>
                  </div>
                  <p className="text-sm mt-2">{v.feedback}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card">
          <CardContent className="p-5">
            <h2 className="font-semibold mb-3">Legal milestones</h2>
            <ol className="space-y-2.5">
              {milestones.map((m, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${m.done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {m.done ? <Check className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                    <span className={`text-sm ${m.done ? "" : "text-muted-foreground"}`}>{m.label}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{m.when}</span>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-card">
        <CardContent className="p-5">
          <h2 className="font-semibold mb-3">Documents</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {["Memorandum of sale.pdf","EPC certificate.pdf","TA6 property info form.pdf","TA10 fittings & contents.pdf","Energy bills (12mo).pdf","Title deeds (TT).pdf"].map((d) => (
              <Button key={d} variant="outline" className="justify-between h-auto py-2.5 text-left">
                <span className="inline-flex items-center gap-2 truncate"><FileText className="h-4 w-4 text-muted-foreground" /><span className="truncate text-sm">{d}</span></span>
                <ChevronRight className="h-4 w-4 shrink-0" />
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-card bg-primary/5">
        <CardContent className="p-5 flex items-start gap-3">
          <MessageSquare className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-medium">Your negotiator</div>
            <div className="text-sm text-muted-foreground">Aisha Khan — direct line 0161 555 0124 · aisha@estately.co.uk</div>
          </div>
          <Button size="sm">Message</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return <Card className="border-0 shadow-card"><CardContent className="p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="text-2xl font-bold mt-0.5">{value}</div><div className="text-xs text-muted-foreground mt-0.5">{sub}</div></CardContent></Card>;
}
