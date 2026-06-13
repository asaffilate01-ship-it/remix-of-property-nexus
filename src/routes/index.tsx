import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, ShieldCheck, Kanban, Inbox, Search, Sparkles, Check, Home, Store, BedDouble, ArrowRight, Star } from "lucide-react";
import heroHome from "@/assets/hero-home.jpg";
import heroPattern from "@/assets/hero-pattern.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Estately — The complete OS for estate & letting agents" },
      { name: "description", content: "Sales, lettings, HMO and commercial in one premium workspace. Marketplace, CRM and compliance for modern agencies and landlords." },
      { property: "og:title", content: "Estately — Property OS for agents and landlords" },
      { property: "og:description", content: "Sales, lettings, HMO and commercial in one workspace." },
      { property: "og:image", content: heroHome },
    ],
  }),
  component: Landing,
});

const modules = [
  { icon: Home, title: "Sales", body: "Vendor onboarding, valuations, offers, chains and completions.", href: "/modules/sales" },
  { icon: Building2, title: "Lettings", body: "Tenancies, viewings, references, deposits and renewals.", href: "/modules/lettings" },
  { icon: BedDouble, title: "HMO", body: "Room-by-room, licensing, gas/EICR/EPC alerts and rent-to-rent.", href: "/modules/hmo", badge: "Add-on" },
  { icon: Store, title: "Commercial", body: "Leases, service charges, business rates and renewals.", href: "/modules/commercial" },
];

function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b">
          <div
            className="absolute inset-0 opacity-[0.08] pointer-events-none"
            style={{ backgroundImage: `url(${heroPattern})`, backgroundSize: "cover", backgroundPosition: "center" }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/40" />
          <div className="container relative mx-auto px-4 py-16 md:py-24 lg:py-28 grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
            <div className="lg:col-span-6">
              <div className="inline-flex items-center gap-2 rounded-full border bg-card/70 backdrop-blur px-3 py-1 text-xs font-medium mb-5 shadow-sm">
                <Sparkles className="h-3 w-3 text-accent" /> The property OS, reimagined.
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-[1.05]">
                Run your agency like
                <span className="block bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">a single, calm workspace.</span>
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground mb-8 max-w-xl">
                Sales, lettings, HMO and commercial — one CRM, one marketplace, one compliance engine. Replace Reapit, Alto and a stack of spreadsheets.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild size="lg" className="shadow-lg shadow-primary/20">
                  <Link to="/auth">Start free <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/marketplace"><Search className="mr-2 h-4 w-4" /> Browse marketplace</Link>
                </Button>
              </div>
              <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-sm text-muted-foreground">
                {["Sales pipeline", "Lettings workflow", "HMO compliance", "Commercial leases"].map((f) => (
                  <span key={f} className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-success shrink-0" />{f}</span>
                ))}
              </div>
            </div>
            <div className="lg:col-span-6 relative">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl ring-1 ring-border/50">
                <img
                  src={heroHome}
                  alt="Modern residential street at golden hour"
                  width={1536}
                  height={1024}
                  className="w-full h-[320px] sm:h-[420px] lg:h-[520px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/40 via-transparent to-transparent" />
              </div>
              {/* Floating stat card */}
              <div className="hidden sm:block absolute -bottom-6 -left-6 lg:-left-10 bg-card rounded-2xl p-5 shadow-2xl ring-1 ring-border/50 w-[260px]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="brand-gradient h-10 w-10 rounded-xl flex items-center justify-center text-white">
                    <Kanban className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">In pipeline</div>
                    <div className="text-xl font-bold">£2.4M</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-3 w-3 text-warning fill-warning" />
                  <Star className="h-3 w-3 text-warning fill-warning" />
                  <Star className="h-3 w-3 text-warning fill-warning" />
                  <Star className="h-3 w-3 text-warning fill-warning" />
                  <Star className="h-3 w-3 text-warning fill-warning" />
                  <span className="ml-1">Trusted by 200+ agencies</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Modules */}
        <section className="container mx-auto px-4 py-16 md:py-24">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="text-xs font-semibold tracking-widest text-accent uppercase mb-3">Modules</div>
            <h2 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight">One platform. Every property type.</h2>
            <p className="text-muted-foreground">Turn on the modules you need — pay for the rest only when you grow into them.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {modules.map((m) => (
              <Link key={m.title} to={m.href} className="group">
                <Card className="shadow-card border-0 h-full transition hover:shadow-xl hover:-translate-y-1">
                  <CardContent className="p-6">
                    <IsoIcon name={m.icon} size={72} className="mb-4 group-hover:scale-110 transition-transform" />
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{m.title}</h3>
                      {m.badge && <span className="text-[10px] uppercase tracking-wide bg-accent/10 text-accent px-2 py-0.5 rounded-full font-semibold">{m.badge}</span>}
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">{m.body}</p>
                    <span className="text-sm font-medium text-primary inline-flex items-center gap-1 group-hover:gap-2 transition-all">Learn more <ArrowRight className="h-3.5 w-3.5" /></span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Three pillars */}
        <section className="bg-muted/40 py-16 md:py-24 border-y">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <div className="text-xs font-semibold tracking-widest text-accent uppercase mb-3">How it works</div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Three surfaces. Zero busywork.</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {([
                { iso: "tenants" as const, icon: Search, title: "Public marketplace", body: "Publish across all property types to a fast, SEO-friendly portal. Leads flow straight into your CRM.", href: "/marketplace" },
                { iso: "agent" as const, icon: Kanban, title: "Unified CRM", body: "One pipeline for vendors, applicants, tenants and landlords. Branch and team friendly.", href: "/for-agents" },
                { iso: "shield" as const, icon: ShieldCheck, title: "Compliance engine", body: "Gas, EICR, EPC, fire, deposits — plus full HMO licensing when you switch the module on.", href: "/for-landlords" },
              ]).map((p) => (
                <Card key={p.title} className="shadow-card border-0 h-full">
                  <CardContent className="p-6">
                    <IsoIcon name={p.iso} size={72} className="mb-4" />
                    <h3 className="font-semibold text-lg mb-2">{p.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{p.body}</p>
                    <Link to={p.href} className="text-sm font-medium text-primary inline-flex items-center gap-1">Learn more <ArrowRight className="h-3.5 w-3.5" /></Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="container mx-auto px-4 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { v: "200+", l: "Agencies onboarded" },
              { v: "12k", l: "Properties managed" },
              { v: "£480M", l: "Pipeline value" },
              { v: "99.9%", l: "Uptime" },
            ].map((s) => (
              <div key={s.l}>
                <div className="text-3xl md:text-4xl font-bold tracking-tight">{s.v}</div>
                <div className="text-xs md:text-sm text-muted-foreground mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-4 pb-16 md:pb-24">
          <div className="brand-gradient rounded-3xl p-8 md:p-14 lg:p-16 text-center text-primary-foreground shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: `url(${heroPattern})`, backgroundSize: "cover" }} />
            <div className="relative">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 tracking-tight">Your whole agency. One screen.</h2>
              <p className="text-primary-foreground/80 max-w-2xl mx-auto mb-8 text-base md:text-lg">Sales, lettings, HMO, commercial — your portfolio, your team and your tenants in one workspace.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild size="lg" variant="secondary"><Link to="/auth">Create your workspace</Link></Button>
                <Button asChild size="lg" variant="outline" className="bg-transparent border-white/30 text-white hover:bg-white/10"><Link to="/marketplace"><Inbox className="mr-2 h-4 w-4" /> See it live</Link></Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
