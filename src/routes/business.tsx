import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Check, ArrowRight, Sparkles, Building2, Users, Globe, Zap, ShieldCheck, BarChart3, Smartphone, Bot, Camera, MessageSquare, FileSignature, Megaphone, Languages, Info, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createSubscriptionCheckout } from "@/lib/billing.functions";
import { PLANS, formatPlanPrice, type PlanCode } from "@/lib/plans";
import { toast } from "sonner";
import { siteUrl } from "@/lib/site-url";

export const Route = createFileRoute("/business")({
  head: () => ({
    meta: [
      { title: "Gabley for agencies — the property OS for UK estate agents" },
      { name: "description", content: "One platform for sales, lettings, HMO, compliance and role-specific portals. 30 days free, then from £29.99/mo per branch." },
      { property: "og:title", content: "Gabley for agencies — the property OS" },
      { property: "og:description", content: "CRM + portal + compliance in one place. 30 days free, then from £29.99/mo per branch." },
      { property: "og:url", content: siteUrl("/business") },
    ],
    links: [{ rel: "canonical", href: siteUrl("/business") }],
  }),
  component: BusinessPage,
});

const ADDONS = [
  { icon: <Bot className="h-5 w-5" />, name: "AI Copilot", price: "£19.99/mo", desc: "Smart property descriptions, auto-replies to enquiries, tenancy summaries and lease abstraction." },
  { icon: <Camera className="h-5 w-5" />, name: "AI Photo & Floorplan", price: "£14.99/mo", desc: "Auto-enhance listing photos, virtual staging and AI-generated floorplans from a quick scan." },
  { icon: <MessageSquare className="h-5 w-5" />, name: "WhatsApp & SMS", price: "£9.99/mo", desc: "Two-way WhatsApp, SMS reminders for viewings, rent and inspections." },
  { icon: <FileSignature className="h-5 w-5" />, name: "Advanced e-sign", price: "£12.99/mo", desc: "eIDAS Advanced Electronic Signatures, RFC 3161 timestamps, 12-yr audit trail." },
  { icon: <Megaphone className="h-5 w-5" />, name: "Portal syndication+", price: "£24.99/mo", desc: "Push to Rightmove, Zoopla, OnTheMarket and PrimeLocation with one click." },
  { icon: <Languages className="h-5 w-5" />, name: "Multi-language", price: "£7.99/mo", desc: "Auto-translate listings and tenant comms into 12 languages." },
];

function PlanCheckoutButton({ planCode, popular }: { planCode: PlanCode; popular?: boolean }) {
  const checkout = useServerFn(createSubscriptionCheckout);
  const [busy, setBusy] = useState(false);

  const start = async () => {
    setBusy(true);
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        const redirect = `/settings?tab=billing&plan=${planCode}`;
        window.location.assign(`/auth?mode=signup&redirect=${encodeURIComponent(redirect)}`);
        return;
      }
      const result = await checkout({ data: { planCode } });
      if ("error" in result) throw new Error(result.error);
      window.location.assign(result.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to start checkout");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      className="mt-5"
      variant={popular ? "default" : "outline"}
      onClick={start}
      disabled={busy}
    >
      {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Start 30-day free trial
    </Button>
  );
}

function BusinessPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.12),transparent_60%)]" />
          <div className="container mx-auto px-4 py-16 md:py-24 relative">
            <div className="max-w-3xl">
              <Badge variant="outline" className="mb-4"><Sparkles className="h-3 w-3 mr-1.5" /> The property OS for UK agencies</Badge>
              <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight mb-5">
                One platform. Sales, lettings, HMO, compliance — and the portal.
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl">
                Bring CRM, marketplace, compliance and client portal workflows into one modern system for your whole agency.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild size="lg" className="h-12 px-6"><Link to="/auth" search={{ mode: "signup" } as never}>Start 30-day free trial <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
                <Button asChild size="lg" variant="outline" className="h-12 px-6"><Link to="/contact">Book a demo</Link></Button>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                {["30 days free, no card required", "Migration planning available", "Cancel any time", "Role-based access controls"].map((f) => (
                  <span key={f} className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-success" />{f}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* What you get */}
        <section className="container mx-auto px-4 py-16 md:py-20">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="font-display text-3xl md:text-4xl font-bold">Everything an agency needs — in one login</h2>
            <p className="text-muted-foreground mt-3">Stop stitching together five tools. Each module is included with every plan.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: <Building2 className="h-5 w-5" />, t: "Sales & lettings CRM", d: "Leads, viewings, offers, deals — branch and team friendly." },
              { icon: <Globe className="h-5 w-5" />, t: "Public marketplace", d: "Listings auto-syndicate to the Gabley portal — no per-lead fees." },
              { icon: <ShieldCheck className="h-5 w-5" />, t: "Compliance hub", d: "Gas, EICR, EPC, HMO licences, Renters' Rights readiness." },
              { icon: <Users className="h-5 w-5" />, t: "Owner & tenant portals", d: "Statements, repairs and documents with role-specific views." },
              { icon: <BarChart3 className="h-5 w-5" />, t: "Reports & KPIs", d: "Branch performance, negotiator league, stock turn." },
              { icon: <Smartphone className="h-5 w-5" />, t: "Mobile-first inspections", d: "Inventories, mid-terms and check-outs from any phone." },
            ].map((b) => (
              <Card key={b.t} className="border-0 shadow-card h-full">
                <CardContent className="p-6">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">{b.icon}</div>
                  <div className="font-semibold">{b.t}</div>
                  <div className="text-sm text-muted-foreground mt-1.5">{b.d}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section className="border-y bg-muted/30">
          <div className="container mx-auto px-4 py-16 md:py-20">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <h2 className="font-display text-3xl md:text-4xl font-bold">Honest pricing</h2>
              <p className="text-muted-foreground mt-3">Pricing is per branch. Start with 30 days free. No per-lead fees. No portal upsells. Cancel anytime.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
              {Object.values(PLANS).map((p) => (
                <Card key={p.code} className={`border-0 shadow-card relative h-full ${p.popular ? "ring-2 ring-primary shadow-elevated" : ""}`}>
                  {p.popular && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">Most popular</Badge>}
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="font-semibold">{p.name}</div>
                    <div className="mt-3 flex items-baseline gap-1">
                      <div className="text-4xl font-bold font-display">{formatPlanPrice(p)}</div>
                      <div className="text-sm text-muted-foreground">/mo per branch</div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{p.description}</div>
                    <PlanCheckoutButton planCode={p.code} popular={p.popular} />
                    <ul className="mt-6 space-y-2.5 text-sm">
                      <li className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                        <span>30 days free — no card required</span>
                      </li>
                      {p.features.map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Multi-branch note */}
            <div className="mt-8 max-w-5xl mx-auto">
              <div className="flex items-start gap-3 rounded-xl border bg-card p-4 text-sm">
                <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Running multiple branches?</p>
                  <p className="text-muted-foreground mt-1">One agency plan applies to every branch. Billing quantity updates when branches are added or removed, and each branch receives the plan's listing allowance.</p>
                </div>
              </div>
            </div>

            {/* Add-ons */}
            <div className="mt-14 max-w-5xl mx-auto">
              <div className="text-center max-w-2xl mx-auto mb-8">
                <Badge variant="outline" className="mb-3"><Sparkles className="h-3 w-3 mr-1.5" /> Planned add-ons</Badge>
                <h3 className="font-display text-2xl md:text-3xl font-bold">AI & power features on the roadmap</h3>
                <p className="text-muted-foreground mt-3 text-sm">These add-ons are not available for purchase yet. Pricing is indicative and will be confirmed before launch.</p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {ADDONS.map((a) => (
                  <Card key={a.name} className="border-0 shadow-card h-full">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">{a.icon}</div>
                        <div className="text-sm font-semibold text-primary whitespace-nowrap">Indicative {a.price}</div>
                      </div>
                      <div className="font-semibold mt-3">{a.name}</div>
                      <div className="text-sm text-muted-foreground mt-1.5">{a.desc}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Product foundations */}
        <section className="container mx-auto px-4 py-16 md:py-20">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="font-display text-3xl md:text-4xl font-bold">One platform, fewer handoffs</h2>
            <p className="text-muted-foreground mt-3">Bring the workflows your team uses every day into a shared property record.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3 max-w-5xl mx-auto">
            {[
              { title: "Run operations", body: "Manage listings, leads, viewings, offers, tenancies, compliance and work orders from one workspace." },
              { title: "Keep people informed", body: "Give tenants, landlords, vendors, contractors and conveyancers focused portal views." },
              { title: "Publish and measure", body: "Publish to the Gabley marketplace and track agency and branch performance without per-lead fees." },
            ].map((item) => (
              <Card key={item.title} className="border-0 shadow-card h-full">
                <CardContent className="p-6">
                  <Check className="h-5 w-5 text-success mb-4" />
                  <div className="font-semibold">{item.title}</div>
                  <p className="text-sm text-muted-foreground mt-2">{item.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Audience tabs */}
        <section className="border-y bg-muted/30">
          <div className="container mx-auto px-4 py-16 md:py-20">
            <div className="text-center max-w-2xl mx-auto mb-8">
              <h2 className="font-display text-3xl md:text-4xl font-bold">Built for every kind of agency</h2>
            </div>
            <Tabs defaultValue="sales" className="max-w-4xl mx-auto">
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="sales">Sales</TabsTrigger>
                <TabsTrigger value="lettings">Lettings</TabsTrigger>
                <TabsTrigger value="hmo">HMO</TabsTrigger>
                <TabsTrigger value="multi">Multi-branch</TabsTrigger>
              </TabsList>
              {[
                { v: "sales", title: "For sales-led agencies", points: ["Offers ladder & sales chain tracker", "Vendor reports with open/click tracking", "Stamp duty & affordability built into listings", "Conveyancer portal for solicitors"] },
                { v: "lettings", title: "For lettings agencies", points: ["Tenancy lifecycle from offer to renewal", "Auto rent schedules & arrears", "Inspection app with photo evidence", "Renters' Rights readiness tracker"] },
                { v: "hmo", title: "For HMO specialists", points: ["Per-room rent & availability", "Licence tracker with council deadlines", "Bills-included accounting", "Communal-area inspections"] },
                { v: "multi", title: "For multi-branch agencies", points: ["Branch directory and agency-wide oversight", "Branch-linked listings and teams", "Per-branch listing allowances", "Billing quantity updates when branches change"] },
              ].map((b) => (
                <TabsContent key={b.v} value={b.v}>
                  <Card className="border-0 shadow-card mt-6">
                    <CardContent className="p-6 md:p-8">
                      <div className="font-semibold text-lg mb-4">{b.title}</div>
                      <ul className="grid sm:grid-cols-2 gap-3">
                        {b.points.map((p) => (
                          <li key={p} className="flex items-start gap-2 text-sm">
                            <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />{p}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </section>

        {/* Outcomes */}
        <section className="container mx-auto px-4 py-16 md:py-20">
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { title: "Consolidate daily work", body: "Keep property, applicant, tenancy and maintenance context connected instead of spread across separate tools." },
              { title: "Give clients clarity", body: "Use focused portals so each person can see the updates and documents relevant to their role." },
              { title: "Scale deliberately", body: "Add branches under one agency plan with server-enforced listing and team allowances." },
            ].map((item) => (
              <Card key={item.title} className="border-0 shadow-card h-full">
                <CardContent className="p-6">
                  <Check className="h-5 w-5 text-success mb-4" />
                  <div className="font-semibold">{item.title}</div>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{item.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-4 pb-20">
          <Card className="border-0 shadow-elevated overflow-hidden">
            <div className="brand-gradient p-10 md:p-14 text-white text-center">
              <Zap className="h-8 w-8 mx-auto mb-3 opacity-90" />
              <h2 className="font-display text-3xl md:text-4xl font-bold">Ready to consolidate your stack?</h2>
              <p className="opacity-90 mt-3 max-w-xl mx-auto">Talk through your current stack, migration needs and rollout plan with the team.</p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button asChild size="lg" variant="secondary"><Link to="/auth" search={{ mode: "signup" } as never}>Start free trial</Link></Button>
                <Button asChild size="lg" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20"><Link to="/contact">Talk to sales</Link></Button>
              </div>
            </div>
          </Card>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
