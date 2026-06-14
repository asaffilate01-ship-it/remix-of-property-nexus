import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Target, Heart, Users, ArrowRight } from "lucide-react";
import heroPattern from "@/assets/hero-pattern.jpg";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Estately" },
      { name: "description", content: "We're rebuilding the property stack — from the marketplace down to the back office — for the next generation of UK agencies and landlords." },
      { property: "og:title", content: "About Estately" },
      { property: "og:description", content: "Rebuilding the UK property stack, end-to-end." },
      { property: "og:url", content: "https://proptest.313test.co.uk/about" },
    ],
    links: [{ rel: "canonical", href: "https://proptest.313test.co.uk/about" }],
  }),
  component: AboutPage,
});

const values = [
  { icon: Target, title: "One workspace", body: "Marketplace, CRM, compliance and tenant portal — joined up by design, not bolted together." },
  { icon: Heart, title: "Built with operators", body: "Every screen is shaped by working agents, landlords and HMO operators. No ivory-tower software." },
  { icon: Users, title: "Fair on price", body: "Per branch, all-in. No per-seat tax. No add-on shakedown for the basics." },
];

const team = [
  { name: "The founding team", role: "Ex-Rightmove, ex-Reapit, ex-Goodlord", initial: "F" },
  { name: "Product & engineering", role: "London, Manchester, Lisbon", initial: "P" },
  { name: "Customer success", role: "UK-wide, agency operators", initial: "C" },
];

function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-1">
        <section className="relative overflow-hidden border-b">
          <div className="absolute inset-0 opacity-[0.05] bg-cover bg-center" style={{ backgroundImage: `url(${heroPattern})` }} aria-hidden />
          <div className="container mx-auto px-4 py-20 md:py-28 max-w-3xl relative">
            <div className="text-xs font-semibold tracking-widest text-accent uppercase mb-4">About Estately</div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight leading-tight">
              The UK property stack should be one workspace, not twelve subscriptions.
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              We started Estately because every agency we knew was juggling a CRM, a portal, a referencing tool, a compliance tracker, a tenant app and a spreadsheet. Different vendors, different logins, different data. The cost was real — and so was the friction. So we rebuilt the stack as one product.
            </p>
          </div>
        </section>

        <section className="border-b">
          <div className="container mx-auto px-4 py-16 md:py-24">
            <div className="grid md:grid-cols-3 gap-6">
              {values.map((v) => (
                <Card key={v.title} className="border-border/60">
                  <CardContent className="p-7">
                    <div className="h-11 w-11 rounded-xl bg-accent/10 grid place-items-center mb-5"><v.icon className="h-5 w-5 text-accent" /></div>
                    <h3 className="text-lg font-semibold mb-2">{v.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{v.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b bg-muted/30">
          <div className="container mx-auto px-4 py-16 md:py-24">
            <div className="max-w-2xl mb-10">
              <div className="text-xs font-semibold tracking-widest text-accent uppercase mb-3">The team</div>
              <h2 className="text-3xl font-bold tracking-tight">Operators, engineers and designers — building together.</h2>
            </div>
            <div className="grid sm:grid-cols-3 gap-5">
              {team.map((t) => (
                <div key={t.name} className="rounded-2xl border bg-card p-6">
                  <div className="h-12 w-12 rounded-full brand-gradient text-white grid place-items-center font-bold text-lg mb-4">{t.initial}</div>
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-sm text-muted-foreground">{t.role}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section>
          <div className="container mx-auto px-4 py-20 text-center max-w-2xl">
            <Building2 className="h-10 w-10 mx-auto mb-5 text-accent" />
            <h2 className="text-3xl font-bold tracking-tight mb-4">Come build with us.</h2>
            <p className="text-muted-foreground mb-8">We're hiring across product, engineering and customer success.</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button asChild><Link to="/contact">Get in touch <ArrowRight className="ml-1.5 h-4 w-4" /></Link></Button>
              <Button asChild variant="outline"><Link to="/pricing">See pricing</Link></Button>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
