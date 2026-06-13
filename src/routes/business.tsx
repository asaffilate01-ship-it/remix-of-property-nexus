import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Check, X, ArrowRight, Sparkles, Building2, Users, Globe, Zap, ShieldCheck, BarChart3, Smartphone, Quote, Bot, Camera, MessageSquare, FileSignature, Megaphone, Languages } from "lucide-react";

export const Route = createFileRoute("/business")({
  head: () => ({
    meta: [
      { title: "Estately for agencies — the property OS for UK estate agents" },
      { name: "description", content: "One platform for sales, lettings, HMO, compliance and the portal — replacing Reapit, Alto, Dezrez and Arthur. 30 days free, then from £29.99/mo." },
      { property: "og:title", content: "Estately for agencies — the property OS" },
      { property: "og:description", content: "CRM + portal + compliance in one place. 30 days free, then from £29.99/mo." },
      { property: "og:url", content: "https://proptest.313test.co.uk/business" },
    ],
    links: [{ rel: "canonical", href: "https://proptest.313test.co.uk/business" }],
  }),
  component: BusinessPage,
});

const PLANS = [
  {
    name: "Starter",
    price: "£49",
    suffix: "/mo per branch",
    note: "Up to 50 listings",
    cta: "Start free trial",
    highlight: false,
    features: ["Sales & lettings CRM", "Public marketplace listing", "Up to 3 negotiators", "Lead inbox & viewings diary", "Email support"],
  },
  {
    name: "Growth",
    price: "£149",
    suffix: "/mo per branch",
    note: "Most popular — unlimited listings",
    cta: "Start free trial",
    highlight: true,
    features: ["Everything in Starter", "Unlimited listings & users", "HMO room manager", "Compliance hub & inspections", "Owner statements & landlord portal", "Tenant portal + repairs", "Sales chain & offers ladder", "Branch performance reports"],
  },
  {
    name: "Enterprise",
    price: "From £499",
    suffix: "/mo",
    note: "Multi-branch & franchises",
    cta: "Talk to sales",
    highlight: false,
    features: ["Everything in Growth", "Unlimited branches", "Role-based permissions", "White-label microsites", "API & Zapier", "SSO + audit logs", "Dedicated CSM"],
  },
];

const COMPARE = [
  { f: "Public marketplace included", us: true, reapit: false, alto: false, arthur: false },
  { f: "Sales + lettings + HMO in one", us: true, reapit: true, alto: true, arthur: false },
  { f: "Built-in compliance hub", us: true, reapit: false, alto: false, arthur: true },
  { f: "Tenant + landlord portals", us: true, reapit: true, alto: true, arthur: true },
  { f: "Contractor portal & work orders", us: true, reapit: false, alto: false, arthur: true },
  { f: "Sales chain tracker", us: true, reapit: true, alto: true, arthur: false },
  { f: "Modern, mobile-first UI", us: true, reapit: false, alto: true, arthur: true },
  { f: "Free portal listings (no per-lead fee)", us: true, reapit: false, alto: false, arthur: false },
  { f: "Setup in under a day", us: true, reapit: false, alto: false, arthur: true },
];

const TESTIMONIALS = [
  { quote: "We replaced three logins with one. The team migrated themselves over a weekend.", name: "Sarah Wells", role: "MD, Northstar Lettings" },
  { quote: "Sales chain visibility alone justified the move. Our fall-through rate is down 40%.", name: "James O'Hara", role: "Sales director, Beacon & Co" },
  { quote: "Our landlords finally have a portal that doesn't look like 2008. Renewals are up.", name: "Priya Shah", role: "Lettings manager, Cavendish" },
];

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
                Estately replaces your CRM, portal subscription, compliance tracker and landlord portal with a single, modern system your team will actually use.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild size="lg" className="h-12 px-6"><Link to="/auth" search={{ mode: "signup" } as never}>Start free 14-day trial <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
                <Button asChild size="lg" variant="outline" className="h-12 px-6"><a href="mailto:sales@estately.test">Book a demo</a></Button>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                {["No setup fee", "Free migration from Reapit/Alto/Arthur", "Cancel any time", "UK-hosted, GDPR-compliant"].map((f) => (
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
              { icon: <Globe className="h-5 w-5" />, t: "Public marketplace", d: "Listings auto-syndicate to the Estately portal — no per-lead fees." },
              { icon: <ShieldCheck className="h-5 w-5" />, t: "Compliance hub", d: "Gas, EICR, EPC, HMO licences, Renters' Rights readiness." },
              { icon: <Users className="h-5 w-5" />, t: "Owner & tenant portals", d: "Statements, repairs and documents — branded as you." },
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
              <p className="text-muted-foreground mt-3">No per-lead fees. No portal upsells. Cancel anytime.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
              {PLANS.map((p) => (
                <Card key={p.name} className={`border-0 shadow-card relative h-full ${p.highlight ? "ring-2 ring-primary shadow-elevated" : ""}`}>
                  {p.highlight && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">Most popular</Badge>}
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="font-semibold">{p.name}</div>
                    <div className="mt-3 flex items-baseline gap-1">
                      <div className="text-4xl font-bold font-display">{p.price}</div>
                      <div className="text-sm text-muted-foreground">{p.suffix}</div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{p.note}</div>
                    <Button className="mt-5" variant={p.highlight ? "default" : "outline"} asChild>
                      <Link to="/auth" search={{ mode: "signup" } as never}>{p.cta}</Link>
                    </Button>
                    <ul className="mt-6 space-y-2.5 text-sm">
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
          </div>
        </section>

        {/* Comparison */}
        <section className="container mx-auto px-4 py-16 md:py-20">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="font-display text-3xl md:text-4xl font-bold">How Estately compares</h2>
            <p className="text-muted-foreground mt-3">A like-for-like look at what's included out of the box.</p>
          </div>
          <Card className="border-0 shadow-card overflow-hidden max-w-4xl mx-auto">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/40">
                    <tr>
                      <th className="text-left p-4 font-medium">Feature</th>
                      <th className="p-4 font-semibold text-primary">Estately</th>
                      <th className="p-4 font-medium text-muted-foreground">Reapit</th>
                      <th className="p-4 font-medium text-muted-foreground">Alto</th>
                      <th className="p-4 font-medium text-muted-foreground">Arthur</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {COMPARE.map((row) => (
                      <tr key={row.f}>
                        <td className="p-4 font-medium">{row.f}</td>
                        <Cell on={row.us} />
                        <Cell on={row.reapit} />
                        <Cell on={row.alto} />
                        <Cell on={row.arthur} />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
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
                { v: "multi", title: "For multi-branch & franchises", points: ["Branch switcher with permission boundaries", "Cross-branch reporting & leaderboards", "Centralised compliance with branch overrides", "White-label microsites per branch"] },
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

        {/* Testimonials */}
        <section className="container mx-auto px-4 py-16 md:py-20">
          <div className="grid md:grid-cols-3 gap-4">
            {TESTIMONIALS.map((t) => (
              <Card key={t.name} className="border-0 shadow-card h-full">
                <CardContent className="p-6">
                  <Quote className="h-6 w-6 text-primary/40 mb-3" />
                  <p className="text-foreground/90 leading-relaxed">{t.quote}</p>
                  <div className="mt-4 text-sm">
                    <div className="font-semibold">{t.name}</div>
                    <div className="text-muted-foreground text-xs">{t.role}</div>
                  </div>
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
              <p className="opacity-90 mt-3 max-w-xl mx-auto">Migrate from Reapit, Alto, Dezrez or Arthur in days — not months. We'll move your data for free.</p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button asChild size="lg" variant="secondary"><Link to="/auth" search={{ mode: "signup" } as never}>Start free trial</Link></Button>
                <Button asChild size="lg" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20"><a href="mailto:sales@estately.test">Talk to sales</a></Button>
              </div>
            </div>
          </Card>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}

function Cell({ on }: { on: boolean }) {
  return (
    <td className="p-4 text-center">
      {on ? <Check className="h-5 w-5 text-success inline" /> : <X className="h-4 w-4 text-muted-foreground/50 inline" />}
    </td>
  );
}
