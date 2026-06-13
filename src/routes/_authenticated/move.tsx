import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Key, KeyRound, ClipboardCheck, FileSignature, Camera, Droplet, Zap, Flame, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/move")({
  head: () => ({ meta: [{ title: "Move in / Move out — Estately" }] }),
  component: MovePage,
});

type Task = { label: string; done: boolean; required?: boolean; icon: typeof Key };
type Section = { title: string; tasks: Task[] };

const MOVE_IN: Section[] = [
  { title: "Pre-tenancy (5 working days before)", tasks: [
    { label: "Right to Rent check verified", done: true, required: true, icon: ClipboardCheck },
    { label: "AST signed by all parties", done: true, required: true, icon: FileSignature },
    { label: "First month's rent cleared", done: true, required: true, icon: ClipboardCheck },
    { label: "Deposit received and protected (DPS/TDS/MyDeposits)", done: true, required: true, icon: ClipboardCheck },
    { label: "How to Rent guide (England) issued", done: true, required: true, icon: ClipboardCheck },
    { label: "EPC issued", done: true, required: true, icon: ClipboardCheck },
    { label: "Gas Safety certificate (CP12) issued", done: true, required: true, icon: Flame },
    { label: "EICR issued", done: false, required: true, icon: Zap },
    { label: "Privacy notice (GDPR) issued", done: false, icon: ClipboardCheck },
  ]},
  { title: "Move-in day", tasks: [
    { label: "Check‑in inventory completed", done: false, required: true, icon: Camera },
    { label: "Meter readings — gas", done: false, icon: Flame },
    { label: "Meter readings — electric", done: false, icon: Zap },
    { label: "Meter readings — water", done: false, icon: Droplet },
    { label: "Keys handed over (sets logged)", done: false, required: true, icon: Key },
    { label: "Alarm codes / fobs issued", done: false, icon: KeyRound },
    { label: "Welcome pack delivered", done: false, icon: ClipboardCheck },
  ]},
  { title: "First week", tasks: [
    { label: "Council tax notified", done: false, icon: Send },
    { label: "Utility providers notified", done: false, icon: Send },
    { label: "Tenant satisfaction call scheduled", done: false, icon: ClipboardCheck },
  ]},
];

const MOVE_OUT: Section[] = [
  { title: "Notice period", tasks: [
    { label: "Notice acknowledged in writing", done: true, required: true, icon: FileSignature },
    { label: "Marketing relaunch — relets", done: true, icon: Send },
    { label: "Re‑let viewings booked", done: false, icon: ClipboardCheck },
  ]},
  { title: "Move-out day", tasks: [
    { label: "Check‑out inventory with comparison", done: false, required: true, icon: Camera },
    { label: "Closing meter readings", done: false, required: true, icon: Zap },
    { label: "Keys returned (all sets accounted)", done: false, required: true, icon: Key },
    { label: "Forwarding address captured", done: false, icon: Send },
  ]},
  { title: "Deposit return (within 10 days)", tasks: [
    { label: "Dilapidations schedule prepared", done: false, icon: ClipboardCheck },
    { label: "Cleaning / repair quotes obtained", done: false, icon: ClipboardCheck },
    { label: "Deposit return proposal sent to tenant", done: false, required: true, icon: Send },
    { label: "Deposit released via scheme", done: false, required: true, icon: CheckCircle2 },
  ]},
];

function MovePage() {
  const [mode, setMode] = useState<"in" | "out">("in");
  const data = mode === "in" ? MOVE_IN : MOVE_OUT;
  const [state, setState] = useState(data);

  const allTasks = state.flatMap(s => s.tasks);
  const done = allTasks.filter(t => t.done).length;
  const pct = Math.round((done / allTasks.length) * 100);
  const blockers = allTasks.filter(t => t.required && !t.done);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">Move in / Move out</h1>
          <p className="text-muted-foreground mt-1">End‑to‑end onboarding & off‑boarding checklist with UK regulatory blockers built in.</p>
        </div>
        <div className="inline-flex rounded-lg border bg-muted/40 p-1">
          {(["in","out"] as const).map((m) => (
            <button key={m} onClick={() => { setMode(m); setState(m === "in" ? MOVE_IN : MOVE_OUT); }}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${mode === m ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {m === "in" ? "Move in" : "Move out"}
            </button>
          ))}
        </div>
      </div>

      <Card className="border-0 shadow-card">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">12 Acacia Avenue, M14 · Sarah Mitchell</div>
              <div className="font-display text-2xl font-bold mt-1">{done} of {allTasks.length} complete</div>
            </div>
            <div className="text-right">
              <div className="font-display text-3xl font-bold tabular-nums">{pct}%</div>
              {blockers.length > 0 ? <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 mt-1">{blockers.length} blocker{blockers.length === 1 ? "" : "s"}</Badge> : <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 mt-1">No blockers</Badge>}
            </div>
          </div>
          <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} /></div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {state.map((section, si) => (
          <Card key={section.title} className="border-0 shadow-card">
            <CardContent className="p-5">
              <div className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">{section.title}</div>
              <div className="space-y-1.5">
                {section.tasks.map((t, ti) => (
                  <button key={t.label} onClick={() => setState(s => s.map((sec, i) => i !== si ? sec : { ...sec, tasks: sec.tasks.map((tt, j) => j === ti ? { ...tt, done: !tt.done } : tt) }))}
                    className={`w-full flex items-center gap-3 rounded-md border px-3 py-2.5 text-left transition ${t.done ? "bg-emerald-50/50 border-emerald-200" : "hover:bg-muted/50"}`}>
                    <div className={`h-5 w-5 rounded border-2 shrink-0 flex items-center justify-center ${t.done ? "bg-primary border-primary" : "border-muted-foreground/30"}`}>
                      {t.done && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
                    </div>
                    <t.icon className={`h-4 w-4 shrink-0 ${t.done ? "text-emerald-600" : "text-muted-foreground"}`} />
                    <span className={`text-sm flex-1 ${t.done ? "line-through text-muted-foreground" : ""}`}>{t.label}</span>
                    {t.required && !t.done && <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">Required</Badge>}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => toast.success("Checklist exported as PDF")}>Export PDF</Button>
        <Button onClick={() => toast.success("Marked complete")} disabled={blockers.length > 0}><CheckCircle2 className="h-4 w-4 mr-2" /> Complete {mode === "in" ? "move-in" : "move-out"}</Button>
      </div>
    </div>
  );
}
