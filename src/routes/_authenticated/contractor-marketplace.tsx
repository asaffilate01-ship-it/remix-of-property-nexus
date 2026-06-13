import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Hammer, MapPin, Star, Banknote, Clock, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/contractor-marketplace")({
  head: () => ({ meta: [{ title: "Contractor marketplace — Estately" }] }),
  component: MarketplacePage,
});

type Trade = "Plumbing" | "Electrics" | "Gas" | "Roofing" | "Joinery" | "Damp" | "Cleaning" | "Painting" | "Locksmith";
type Job = { id: string; title: string; property: string; trade: Trade; urgency: "Routine" | "Urgent" | "Emergency"; budgetMin: number; budgetMax: number; bids: number; topBid?: number; postedAgo: string };
type Pro = { id: string; name: string; trades: Trade[]; rating: number; reviews: number; jobs: number; area: string; gasSafe?: string; niceic?: string; insurance: string; responseHrs: number };

const JOBS: Job[] = [
  { id: "JOB-7701", title: "Boiler not firing on hot water", property: "12 Acacia Avenue, M14", trade: "Gas", urgency: "Urgent", budgetMin: 180, budgetMax: 320, bids: 5, topBid: 195, postedAgo: "2h" },
  { id: "JOB-7702", title: "Replace fuse box (consumer unit)", property: "Flat 4, Quay View, M50", trade: "Electrics", urgency: "Routine", budgetMin: 450, budgetMax: 700, bids: 8, topBid: 495, postedAgo: "1d" },
  { id: "JOB-7703", title: "Leaking flat roof — emergency cover", property: "8 Cromwell Road, M16", trade: "Roofing", urgency: "Emergency", budgetMin: 250, budgetMax: 600, bids: 3, topBid: 280, postedAgo: "20m" },
  { id: "JOB-7704", title: "Rising damp survey + treatment quote", property: "27 King's Crescent, M20", trade: "Damp", urgency: "Routine", budgetMin: 0, budgetMax: 0, bids: 2, postedAgo: "3d" },
  { id: "JOB-7705", title: "End‑of‑tenancy clean (3 bed)", property: "Apt 11, The Mill, M3", trade: "Cleaning", urgency: "Routine", budgetMin: 180, budgetMax: 260, bids: 11, topBid: 175, postedAgo: "5h" },
];

const PROS: Pro[] = [
  { id: "PRO-201", name: "Northern Gas Services", trades: ["Gas","Plumbing"], rating: 4.9, reviews: 312, jobs: 1480, area: "Greater Manchester", gasSafe: "GS-547821", insurance: "£5M PL", responseHrs: 2 },
  { id: "PRO-202", name: "Sparks & Sons Electrical", trades: ["Electrics"], rating: 4.8, reviews: 196, jobs: 720, area: "M postcodes", niceic: "NICEIC Approved", insurance: "£2M PL", responseHrs: 4 },
  { id: "PRO-203", name: "Bright Spark Cleaning Co.", trades: ["Cleaning","Painting"], rating: 4.7, reviews: 524, jobs: 2100, area: "North West", insurance: "£1M PL", responseHrs: 1 },
  { id: "PRO-204", name: "Pennine Roofing", trades: ["Roofing","Joinery"], rating: 4.9, reviews: 148, jobs: 410, area: "Manchester/Cheshire", insurance: "£5M PL", responseHrs: 3 },
];

const TONE = { Routine: "bg-muted text-foreground", Urgent: "bg-amber-50 text-amber-700 border-amber-200", Emergency: "bg-red-50 text-red-700 border-red-200" };

function MarketplacePage() {
  const [tab, setTab] = useState<"jobs" | "pros" | "post">("jobs");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">Contractor marketplace</h1>
        <p className="text-muted-foreground mt-1">Post a job, receive vetted quotes within hours. Gas Safe and NICEIC verified.</p>
      </div>

      <div className="inline-flex rounded-lg border bg-muted/40 p-1">
        {(["jobs","pros","post"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition capitalize ${tab === t ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            {t === "jobs" ? "Open jobs" : t === "pros" ? "Vetted contractors" : "Post a job"}
          </button>
        ))}
      </div>

      {tab === "jobs" && (
        <div className="grid md:grid-cols-2 gap-4">
          {JOBS.map((j) => (
            <Card key={j.id} className="border-0 shadow-card hover:shadow-md transition">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{j.title}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" /> {j.property}</div>
                  </div>
                  <Badge variant="outline" className={TONE[j.urgency]}>{j.urgency}</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="secondary">{j.trade}</Badge>
                  <span className="text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> posted {j.postedAgo} ago</span>
                  <span className="text-muted-foreground">· {j.bids} quotes</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md bg-muted/40 p-2"><div className="text-muted-foreground">Budget</div><div className="font-semibold">{j.budgetMin === 0 ? "Quote requested" : `£${j.budgetMin}–£${j.budgetMax}`}</div></div>
                  <div className="rounded-md bg-muted/40 p-2"><div className="text-muted-foreground">Best quote</div><div className="font-semibold text-emerald-700">{j.topBid ? `£${j.topBid}` : "Awaiting"}</div></div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => toast.success("Viewing bids")}>View {j.bids} quotes</Button>
                  <Button size="sm" className="flex-1" onClick={() => toast.success("Awarded")}>Award job</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {tab === "pros" && (
        <div className="grid md:grid-cols-2 gap-4">
          {PROS.map((p) => (
            <Card key={p.id} className="border-0 shadow-card">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold flex items-center gap-2">{p.name} <ShieldCheck className="h-4 w-4 text-emerald-600" /></div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><MapPin className="h-3 w-3" /> {p.area}</div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-amber-500"><Star className="h-3.5 w-3.5 fill-current" /><span className="text-sm font-semibold text-foreground">{p.rating}</span></div>
                    <div className="text-xs text-muted-foreground">{p.reviews} reviews</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {p.trades.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <Cell label="Jobs done" value={p.jobs.toLocaleString()} />
                  <Cell label="Avg response" value={`${p.responseHrs}h`} />
                  <Cell label="Insurance" value={p.insurance} />
                </div>
                <div className="text-xs text-muted-foreground">
                  {p.gasSafe && <>Gas Safe {p.gasSafe} · </>}
                  {p.niceic && <>{p.niceic} · </>}
                  DBS checked
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1">View profile</Button>
                  <Button size="sm" className="flex-1" onClick={() => toast.success("Quote request sent")}>Request quote</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {tab === "post" && <PostJobForm />}
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md bg-muted/40 p-2"><div className="text-muted-foreground">{label}</div><div className="font-semibold text-foreground">{value}</div></div>;
}

function PostJobForm() {
  const [form, setForm] = useState({ title: "", trade: "Plumbing" as Trade, urgency: "Routine", budget: "", desc: "" });
  return (
    <Card className="border-0 shadow-card max-w-2xl">
      <CardContent className="p-6 space-y-4">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Sparkles className="h-3.5 w-3.5 text-primary" /> AI will match you with up to 5 vetted pros</div>
        <Field label="Job title"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Leaking kitchen tap" /></Field>
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Trade">
            <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={form.trade} onChange={(e) => setForm({ ...form, trade: e.target.value as Trade })}>
              {(["Plumbing","Electrics","Gas","Roofing","Joinery","Damp","Cleaning","Painting","Locksmith"] as Trade[]).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Urgency">
            <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value })}>
              {["Routine","Urgent","Emergency"].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Budget (£, optional)"><Input value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} placeholder="200–400" /></Field>
        </div>
        <Field label="Description"><Textarea rows={4} value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} placeholder="Describe the issue, access details, and any photos you'll attach…" /></Field>
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><Banknote className="h-3.5 w-3.5" /> No win, no fee — pay only when you award.</div>
        <Button onClick={() => toast.success("Job posted — matching pros now")}>Post job & get quotes</Button>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label><div className="mt-1.5">{children}</div></div>;
}
