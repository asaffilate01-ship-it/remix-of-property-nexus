import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, TrendingUp, MapPin, Loader2, CheckCircle2, ShieldCheck, AlertCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { submitValuationEnquiry } from "@/lib/public.functions";
import { getPropertyValuation, type ValuationResult } from "@/lib/valuation.functions";
import { toast } from "sonner";
import { siteUrl } from "@/lib/site-url";

export const Route = createFileRoute("/valuation")({
  head: () => ({
    meta: [
      { title: "Property valuation — Estately" },
      { name: "description", content: "Request an indicative online property valuation or book a local appraisal with Estately." },
      { property: "og:title", content: "Property valuation — Estately" },
      { property: "og:description", content: "Request a UK sale or rental valuation." },
    ],
    links: [{ rel: "canonical", href: siteUrl("/valuation") }],
  }),
  component: ValuationPage,
});

function ValuationPage() {
  const [step, setStep] = useState<"form" | "result">("form");
  const [form, setForm] = useState({ postcode: "", beds: "2", type: "flat", condition: "good", purpose: "sale" });
  const [contact, setContact] = useState({ name: "", email: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [savedLead, setSavedLead] = useState(false);
  const [valuing, setValuing] = useState(false);
  const [valuation, setValuation] = useState<ValuationResult | null>(null);

  const calculate = async () => {
    if (!form.postcode.trim()) return toast.error("Enter a postcode");
    setValuing(true);
    try {
      const result = await getPropertyValuation({ data: {
        postcode: form.postcode,
        bedrooms: Number(form.beds),
        property_type: form.type as "flat" | "house" | "hmo",
        condition: form.condition as "excellent" | "good" | "fair",
        purpose: form.purpose as "sale" | "rent",
      } });
      setValuation(result);
      setStep("result");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not request valuation");
    } finally {
      setValuing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="container max-w-4xl py-12 md:py-20">
        <div className="text-center mb-10">
          <Badge variant="outline" className="mb-4"><ShieldCheck className="h-3 w-3 mr-1.5" /> Secure valuation request</Badge>
          <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">What's your home worth?</h1>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">Request an indicative provider estimate, then confirm the figure with a local appraisal before making a financial decision.</p>
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
              <Button size="lg" className="w-full h-12 text-base" disabled={valuing} onClick={calculate}>
                {valuing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {valuing ? "Checking provider…" : "Request estimate"} {!valuing && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
              <p className="text-xs text-muted-foreground text-center">No account required. Estimates are indicative, not a mortgage or regulated valuation.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card className="border-0 shadow-elevated overflow-hidden">
              <div className="brand-gradient p-6 md:p-8 text-white">
                <div className="text-sm opacity-80 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {form.postcode} · {form.beds} bed {form.type}</div>
                {valuation?.available ? (
                  <>
                    <div className="mt-2 text-xs opacity-70 uppercase tracking-wide">Provider-estimated {form.purpose === "sale" ? "value" : "rent pcm"}</div>
                    <div className="font-display text-5xl md:text-6xl font-bold mt-1">
                      £{valuation.estimate.toLocaleString()}{form.purpose === "rent" ? <span className="text-xl opacity-70"> /mo</span> : null}
                    </div>
                    <div className="mt-2 text-sm opacity-90">Range £{valuation.low.toLocaleString()} – £{valuation.high.toLocaleString()}</div>
                  </>
                ) : (
                  <>
                    <div className="mt-4 flex items-center gap-2 text-2xl md:text-3xl font-semibold"><AlertCircle className="h-6 w-6" /> Manual appraisal needed</div>
                    <p className="mt-2 max-w-2xl text-sm text-white/80">The valuation provider is unavailable, so we have not displayed a made-up figure. Book a local appraisal below.</p>
                  </>
                )}
              </div>
              <CardContent className="p-6 md:p-8 space-y-5">
                {valuation?.available && (
                  <div className="grid sm:grid-cols-3 gap-3">
                    <Metric label="Comparables found" value={valuation.comparables_count?.toLocaleString() ?? "Not supplied"} />
                    <Metric label="Avg. days on market" value={valuation.average_days_on_market?.toLocaleString() ?? "Not supplied"} />
                    <Metric label="Local demand" value={valuation.demand ?? "Not supplied"} tint={valuation.demand === "High" ? "text-success" : undefined} icon={valuation.demand === "High" ? <TrendingUp className="h-4 w-4 text-success" /> : undefined} />
                  </div>
                )}
                {savedLead ? (
                  <div className="rounded-lg border border-success/30 bg-success/5 p-4 flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold">Booked — we'll be in touch</div>
                      <p className="text-sm text-muted-foreground">A local Estately partner agent will contact you within one working day with a free in-person valuation.</p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border p-4 bg-muted/30 space-y-3">
                    <div>
                      <div className="font-semibold">Want a higher-confidence appraisal?</div>
                      <p className="text-sm text-muted-foreground">Book a free in-person valuation with a local Estately partner agent who can assess condition, finish and local demand.</p>
                    </div>
                    <div className="grid sm:grid-cols-3 gap-2">
                      <Input placeholder="Your name" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
                      <Input type="email" placeholder="Email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
                      <Input placeholder="Phone (optional)" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        disabled={saving}
                        onClick={async () => {
                          if (!contact.name.trim() || !contact.email.trim()) { toast.error("Name and email required"); return; }
                          setSaving(true);
                          try {
                            await submitValuationEnquiry({ data: {
                              name: contact.name,
                              email: contact.email,
                              phone: contact.phone || undefined,
                              postcode: form.postcode,
                              bedrooms: Number(form.beds),
                              property_type: form.type as "flat" | "house" | "hmo",
                              condition: form.condition as "excellent" | "good" | "fair",
                              purpose: form.purpose as "sale" | "rent",
                              estimate: valuation?.available ? valuation.estimate : undefined,
                            } });
                            setSavedLead(true);
                            toast.success("Valuation booked");
                          } catch (error) {
                            toast.error(error instanceof Error ? error.message : "Could not book valuation");
                          } finally {
                            setSaving(false);
                          }
                        }}
                      >
                        {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        Book free in-person valuation
                      </Button>
                      <Button variant="outline" asChild><Link to="/marketplace">Browse comparable properties</Link></Button>
                    </div>
                  </div>
                )}
                <Button variant="ghost" onClick={() => { setStep("form"); setValuation(null); }}>← Edit details</Button>
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
