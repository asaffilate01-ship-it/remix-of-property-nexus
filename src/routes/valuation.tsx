import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles, TrendingUp, MapPin, Loader2, CheckCircle2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/valuation")({
  head: () => ({
    meta: [
      { title: "Instant property valuation — Estately" },
      { name: "description", content: "Get an instant online valuation for your UK property in seconds. Backed by recent sold prices and live local data." },
      { property: "og:title", content: "Instant property valuation — Estately" },
      { property: "og:description", content: "Free, instant AVM valuation for any UK home — sale or rent." },
    ],
    links: [{ rel: "canonical", href: "https://proptest.313test.co.uk/valuation" }],
  }),
  component: ValuationPage,
});

function ValuationPage() {
  const [step, setStep] = useState<"form" | "result">("form");
  const [form, setForm] = useState({ postcode: "W1U 6QH", beds: "2", type: "flat", condition: "good", purpose: "sale" });
  const [contact, setContact] = useState({ name: "", email: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [savedLead, setSavedLead] = useState(false);



  const base = form.purpose === "sale" ? 720000 : 3200;
  const beds = Number(form.beds);
  const mult = form.type === "house" ? 1.35 : form.type === "flat" ? 1 : 1.6;
  const cond = form.condition === "excellent" ? 1.08 : form.condition === "fair" ? 0.92 : 1;
  const estimate = Math.round(base * (0.6 + beds * 0.2) * mult * cond);
  const low = Math.round(estimate * 0.94);
  const high = Math.round(estimate * 1.06);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="container max-w-4xl py-12 md:py-20">
        <div className="text-center mb-10">
          <Badge variant="outline" className="mb-4"><Sparkles className="h-3 w-3 mr-1.5" /> Powered by AVM + live local data</Badge>
          <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">What's your home worth?</h1>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">An instant estimate from sold-price comparables, EPC records and live local supply — no agent required.</p>
        </div>

        {step === "form" ? (
          <Card className="border-0 shadow-elevated">
            <CardContent className="p-6 md:p-8 space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Postcode</Label>
                  <Input value={form.postcode} onChange={(e) => setForm({ ...form, postcode: e.target.value.toUpperCase() })} className="h-12 text-lg" />
                </div>
                <div>
                  <Label>Looking to</Label>
                  <Select value={form.purpose} onValueChange={(v) => setForm({ ...form, purpose: v })}>
                    <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sale">Sell</SelectItem>
                      <SelectItem value="rent">Let</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <Label>Property type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flat">Flat / apartment</SelectItem>
                      <SelectItem value="house">House</SelectItem>
                      <SelectItem value="hmo">HMO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Bedrooms</Label>
                  <Select value={form.beds} onValueChange={(v) => setForm({ ...form, beds: v })}>
                    <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Condition</Label>
                  <Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v })}>
                    <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excellent">Excellent</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="fair">Needs work</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button size="lg" className="w-full h-12 text-base" onClick={() => setStep("result")}>
                Get instant estimate <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <p className="text-xs text-muted-foreground text-center">Anonymous · No account required for the estimate.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card className="border-0 shadow-elevated overflow-hidden">
              <div className="brand-gradient p-6 md:p-8 text-white">
                <div className="text-sm opacity-80 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {form.postcode} · {form.beds} bed {form.type}</div>
                <div className="mt-2 text-xs opacity-70 uppercase tracking-wide">Estimated {form.purpose === "sale" ? "value" : "rent pcm"}</div>
                <div className="font-display text-5xl md:text-6xl font-bold mt-1">
                  £{estimate.toLocaleString()}{form.purpose === "rent" ? <span className="text-xl opacity-70"> /mo</span> : null}
                </div>
                <div className="mt-2 text-sm opacity-90">Range £{low.toLocaleString()} – £{high.toLocaleString()}</div>
              </div>
              <CardContent className="p-6 md:p-8 space-y-5">
                <div className="grid sm:grid-cols-3 gap-3">
                  <Metric label="Comparables found" value="24" />
                  <Metric label="Avg. days on market" value="42" />
                  <Metric label="Local demand" value="High" tint="text-success" icon={<TrendingUp className="h-4 w-4 text-success" />} />
                </div>
                <div className="rounded-lg border p-4 bg-muted/30">
                  <div className="font-semibold mb-1">Want a guaranteed sale price?</div>
                  <p className="text-sm text-muted-foreground mb-3">Book a free in-person valuation with a local Estately partner agent — typically more accurate by 4–7%.</p>
                  <div className="flex flex-wrap gap-2">
                    <Button>Book free in-person valuation</Button>
                    <Button variant="outline" asChild><Link to="/marketplace">Browse comparable properties</Link></Button>
                  </div>
                </div>
                <Button variant="ghost" onClick={() => setStep("form")}>← Edit details</Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, tint, icon }: { label: string; value: string; tint?: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <div className={`text-xl font-bold ${tint ?? ""}`}>{value}</div>
        {icon}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
