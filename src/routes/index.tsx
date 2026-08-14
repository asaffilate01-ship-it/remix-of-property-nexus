import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Building2, Kanban, ShieldCheck, Search, Sparkles, Check, Star, Globe, Users } from "lucide-react";
import heroHome from "@/assets/hero-home.jpg";
import heroPattern from "@/assets/hero-pattern.jpg";
import { siteUrl } from "@/lib/site-url";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Estately — The property OS for modern UK agencies & landlords" },
      { name: "description", content: "Estately combines a public property marketplace with a complete CRM, compliance hub and tenant portal. One workspace for sales, lettings, HMO and commercial." },
      { property: "og:title", content: "Estately — The property OS" },
      { property: "og:description", content: "Marketplace + CRM + compliance in one premium workspace." },
      { property: "og:url", content: siteUrl("/") },
      { property: "og:type", content: "website" },
      { property: "og:image", content: heroHome },
    ],
    links: [{ rel: "canonical", href: siteUrl("/") }],
  }),
  component: HomePage,
});

const pillars = [
  {
    icon: Search,
    title: "Public marketplace",
    body: "List sales, lettings, HMO rooms and commercial direct to buyers and renters. Map search, saved searches and verified leads.",
    href: "/marketplace",
    cta: "Browse the marketplace",
  },
  {
    icon: Kanban,
    title: "Agency CRM",
    body: "Pipeline, viewings, offers, tenancies and renewals — built for how UK agents actually work, with branch and target support.",
    href: "/products/agents",
    cta: "See agency tools",
  },
  {
    icon: ShieldCheck,
    title: "Compliance & portfolio",
    body: "Gas, EICR, EPC, licences, deposits and HMO room-level operations — with alerts long before they expire.",
    href: "/products/landlords",
    cta: "See landlord tools",
  },
];

const replaces = ["Reapit", "Alto", "Dezrez", "Arthur", "Goodlord", "Apex27", "Rentman", "PayProp"];

const featured = [
  { quote: "Estately replaced three tools for us. Lettings, compliance and the portal — all in one workspace.", who: "Maya R.", role: "Lettings director, Manchester" },
  { quote: "We moved 14 branches in a weekend. Onboarding was honestly painless.", who: "Daniel K.", role: "Operations, national agency" },
  { quote: "The HMO module pays for itself. Room-level rent and inspections are night-and-day better.", who: "Priya S.", role: "Portfolio landlord" },
];

function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b">
          <div
            className="absolute inset-0 opacity-[0.06] bg-cover bg-center"
            style={{ backgroundImage: `url(${heroPattern})` }}
            aria-hidden
          />
          <div className="container mx-auto px-4 pt-20 pb-16 md:pt-28 md:pb-24 grid lg:grid-cols-2 gap-10 items-center relative">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest text-accent uppercase mb-4">
                <Sparkles className="h-3.5 w-3.5" /> The complete property OS
              </div>
              <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight leading-[1.05]">
                One platform for every<br className="hidden md:block" /> property in your portfolio.
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl">
                Estately is a public marketplace, a full agency CRM, a compliance hub and a tenant portal — joined up, branded and built for modern UK agencies and landlords.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link to="/pricing">Start 30-day free trial <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/marketplace">Browse marketplace</Link>
                </Button>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-accent" /> 30 days free, no card</span>
                <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-accent" /> Migrate from any CRM</span>
                <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-accent" /> Cancel anytime</span>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-[4/3] rounded-3xl overflow-hidden border shadow-2xl">
                <img src={heroHome} alt="UK property dashboard" className="w-full h-full object-cover" />
              </div>
              <div className="absolute -bottom-5 -left-5 rounded-2xl border bg-card/95 backdrop-blur px-4 py-3 shadow-xl hidden md:block">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Replaces</div>
                <div className="text-sm font-semibold">Reapit · Alto · Arthur · Goodlord</div>
              </div>
            </div>
          </div>
        </section>

        {/* Pillars */}
        <section className="border-b">
          <div className="container mx-auto px-4 py-16 md:py-24">
            <div className="max-w-2xl mb-12">
              <div className="text-xs font-semibold tracking-widest text-accent uppercase mb-3">What you get</div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Marketplace, CRM and compliance — finally in one place.</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {pillars.map((p) => (
                <Card key={p.title} className="group hover:shadow-lg transition-all border-border/60">
                  <CardContent className="p-7">
                    <div className="h-11 w-11 rounded-xl bg-accent/10 grid place-items-center mb-5">
                      <p.icon className="h-5 w-5 text-accent" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{p.title}</h3>
                    <p className="text-muted-foreground mb-5 text-sm leading-relaxed">{p.body}</p>
                    <Link to={p.href} className="text-sm font-medium text-accent inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                      {p.cta} <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Replaces */}
        <section className="border-b bg-muted/30">
          <div className="container mx-auto px-4 py-12 text-center">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-5">Used to replace</p>
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-base md:text-lg font-semibold text-muted-foreground/70">
              {replaces.map((r) => <span key={r} className="hover:text-foreground transition">{r}</span>)}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="border-b">
          <div className="container mx-auto px-4 py-16 md:py-24">
            <div className="max-w-2xl mb-12">
              <div className="text-xs font-semibold tracking-widest text-accent uppercase mb-3">What customers say</div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Built with agencies, not for them.</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {featured.map((t) => (
                <Card key={t.who} className="border-border/60">
                  <CardContent className="p-7">
                    <div className="flex gap-0.5 mb-4">
                      {[0,1,2,3,4].map((i) => <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />)}
                    </div>
                    <p className="text-foreground leading-relaxed mb-5">&ldquo;{t.quote}&rdquo;</p>
                    <div className="text-sm">
                      <div className="font-semibold">{t.who}</div>
                      <div className="text-muted-foreground">{t.role}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section>
          <div className="container mx-auto px-4 py-20 md:py-28">
            <div className="rounded-3xl border bg-gradient-to-br from-accent/10 via-background to-accent/5 p-10 md:p-16 text-center max-w-4xl mx-auto">
              <Building2 className="h-10 w-10 mx-auto mb-5 text-accent" />
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Switch on a smarter way to run property.</h2>
              <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">30 days free. Migrate from any CRM. Cancel any time. From £29.99 per branch.</p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Button asChild size="lg"><Link to="/pricing">See pricing</Link></Button>
                <Button asChild size="lg" variant="outline"><Link to="/contact">Talk to sales</Link></Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
