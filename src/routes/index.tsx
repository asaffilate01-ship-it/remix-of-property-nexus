import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, ShieldCheck, Kanban, Inbox, Search, Sparkles, Check, Home, Store, BedDouble } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HMOFlow — The complete OS for estate & letting agents" },
      { name: "description", content: "Sales, lettings, HMO and commercial in one workspace. CRM, marketplace and compliance — built for modern agencies and landlords." },
      { property: "og:title", content: "HMOFlow — Property OS for agents and landlords" },
      { property: "og:description", content: "Sales, lettings, HMO and commercial in one workspace." },
    ],
  }),
  component: Landing,
});

const modules = [
  { icon: Home, title: "Sales", body: "Vendor onboarding, valuations, offers, chains and completion tracking.", href: "/modules/sales" },
  { icon: Building2, title: "Lettings", body: "Tenancies, viewings, references, deposits and renewals.", href: "/modules/lettings" },
  { icon: BedDouble, title: "HMO", body: "Room-by-room, licensing, gas/EICR/EPC alerts and rent-to-rent.", href: "/modules/hmo", badge: "Premium add-on" },
  { icon: Store, title: "Commercial", body: "Leases, service charges, business rates and renewals.", href: "/modules/commercial" },
];

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
                <Sparkles className="h-3 w-3" /> Built for modern agencies
              </div>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
                The complete OS for
                <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">estate & letting agents.</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl">
                Sales, lettings, HMO and commercial — one CRM, one marketplace, one compliance engine. Replace Reapit, Alto and a stack of spreadsheets.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg"><Link to="/auth">Start free</Link></Button>
                <Button asChild size="lg" variant="outline"><Link to="/marketplace"><Search className="mr-2 h-4 w-4" /> Browse marketplace</Link></Button>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                {["Sales pipeline", "Lettings workflow", "HMO compliance", "Commercial leases"].map((f) => (
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

        {/* Modules */}
        <section className="container mx-auto px-4 py-16">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">One platform. Every property type.</h2>
            <p className="text-muted-foreground">Turn on the modules you need — pay for the rest only when you grow into them.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {modules.map((m) => (
              <Card key={m.title} className="shadow-card border-0">
                <CardContent className="p-6">
                  <div className="brand-gradient inline-flex h-10 w-10 items-center justify-center rounded-lg text-white mb-4"><m.icon className="h-5 w-5" /></div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg">{m.title}</h3>
                    {m.badge && <span className="text-[10px] uppercase tracking-wide bg-accent/10 text-accent px-2 py-0.5 rounded-full">{m.badge}</span>}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{m.body}</p>
                  <Link to={m.href} className="text-sm font-medium text-primary hover:underline">Learn more →</Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Three pillars */}
        <section className="bg-muted/40 py-16">
          <div className="container mx-auto px-4 grid md:grid-cols-3 gap-6">
            {[
              { icon: Search, title: "Public marketplace", body: "Publish across all property types to a fast, SEO-friendly portal. Leads flow straight into your CRM.", href: "/marketplace" },
              { icon: Kanban, title: "Unified CRM", body: "One pipeline for vendors, applicants, tenants and landlords. Branch and team friendly.", href: "/for-agents" },
              { icon: ShieldCheck, title: "Compliance engine", body: "Gas, EICR, EPC, fire, deposits — plus full HMO licensing when you switch the module on.", href: "/for-landlords" },
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
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Run your whole agency from one screen.</h2>
            <p className="text-primary-foreground/80 max-w-2xl mx-auto mb-8">Sales, lettings, HMO, commercial — your portfolio, your team and your tenants in one workspace.</p>
            <Button asChild size="lg" variant="secondary"><Link to="/auth">Create your workspace</Link></Button>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
