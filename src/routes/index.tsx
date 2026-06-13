import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, ShieldCheck, Kanban, Inbox, Search, Sparkles, Check } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HMOFlow — HMO compliance, marketplace and agency CRM" },
      { name: "description", content: "The all-in-one platform for HMO landlords, letting agents and property professionals. Compliance, marketplace and CRM in one place." },
      { property: "og:title", content: "HMOFlow — All-in-one HMO platform" },
      { property: "og:description", content: "Compliance, marketplace and agency CRM, built for HMO operators." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 brand-gradient opacity-10" />
          <div className="container relative mx-auto px-4 py-20 md:py-28 grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 text-accent px-3 py-1 text-xs font-medium mb-4">
                <Sparkles className="h-3 w-3" /> Built for HMO operators
              </div>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
                The all-in-one HMO platform.
                <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Compliance, marketplace, CRM.</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl">
                List properties to the public marketplace, manage HMO licensing and gas/EICR/EPC compliance, and run your full sales & lettings pipeline — one workspace.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg"><Link to="/auth">Start free</Link></Button>
                <Button asChild size="lg" variant="outline"><Link to="/marketplace"><Search className="mr-2 h-4 w-4" /> Browse listings</Link></Button>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                {["HMO licence tracking", "Gas / EICR / EPC alerts", "Public marketplace", "Agent CRM"].map((f) => (
                  <span key={f} className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-success" />{f}</span>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="brand-gradient rounded-3xl p-1 shadow-card">
                <div className="bg-card rounded-[22px] p-6 grid grid-cols-2 gap-4">
                  {[
                    { icon: Building2, label: "Properties", value: "128" },
                    { icon: ShieldCheck, label: "Compliant", value: "94%" },
                    { icon: Inbox, label: "New leads", value: "37" },
                    { icon: Kanban, label: "In pipeline", value: "£2.4M" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl border bg-background p-4">
                      <s.icon className="h-5 w-5 text-accent mb-2" />
                      <div className="text-2xl font-bold">{s.value}</div>
                      <div className="text-xs text-muted-foreground">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Three pillars */}
        <section className="container mx-auto px-4 py-16">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Search, title: "Public marketplace", body: "Publish rooms, lets and sales to a clean, SEO-friendly portal. Lead capture wired to your CRM." , href: "/marketplace"},
              { icon: ShieldCheck, title: "Compliance engine", body: "HMO licences, gas safety, EICR, EPC, fire and more — tracked, alerted, evidenced.", href: "/for-landlords"},
              { icon: Kanban, title: "Agent CRM", body: "Leads → viewings → offers → completion. Built for sales and lettings, branch-friendly.", href: "/for-agents"},
            ].map((p) => (
              <Card key={p.title} className="shadow-card border-0">
                <CardContent className="p-6">
                  <div className="brand-gradient inline-flex h-10 w-10 items-center justify-center rounded-lg text-white mb-4"><p.icon className="h-5 w-5" /></div>
                  <h3 className="font-semibold text-lg mb-2">{p.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{p.body}</p>
                  <Link to={p.href} className="text-sm font-medium text-primary hover:underline">Learn more →</Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-4 py-16">
          <div className="brand-gradient rounded-3xl p-10 md:p-16 text-center text-primary-foreground shadow-card">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Stop juggling spreadsheets, inboxes and portals.</h2>
            <p className="text-primary-foreground/80 max-w-2xl mx-auto mb-8">Get your portfolio, your team and your tenants all in one place.</p>
            <Button asChild size="lg" variant="secondary"><Link to="/auth">Create your workspace</Link></Button>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
