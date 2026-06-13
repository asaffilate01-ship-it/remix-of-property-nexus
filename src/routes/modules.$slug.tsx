import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Home, Building2, BedDouble, Store } from "lucide-react";

type Module = {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  icon: typeof Home;
  features: string[];
  badge?: string;
};

const MODULES: Record<string, Module> = {
  sales: {
    slug: "sales",
    title: "Sales",
    tagline: "Win instructions. Close chains. Get paid.",
    description: "From valuation to completion — the modern sales workflow for residential agents.",
    icon: Home,
    features: [
      "Valuation requests & vendor onboarding",
      "Offer management with chain tracking",
      "Memorandum of sale & solicitor comms",
      "Portal feeds (Rightmove, Zoopla, OnTheMarket)",
      "AML/KYC capture",
    ],
  },
  lettings: {
    slug: "lettings",
    title: "Lettings",
    tagline: "Single-let, end-to-end.",
    description: "Applicants, viewings, references, tenancies and renewals in one tidy workflow.",
    icon: Building2,
    features: [
      "Applicant matching & viewings",
      "Referencing & Right to Rent",
      "Tenancy agreements & e-sign",
      "Deposit registration (DPS/TDS/MyDeposits)",
      "Renewals, rent reviews & arrears",
    ],
  },
  hmo: {
    slug: "hmo",
    title: "HMO",
    tagline: "Built for room-by-room operators.",
    description: "Everything in Lettings, plus deep HMO compliance, licensing and rent-to-rent tools.",
    icon: BedDouble,
    badge: "Premium add-on",
    features: [
      "Room-level rent ledgers & vacancies",
      "Council HMO licence tracker",
      "Gas, EICR, EPC, PAT, fire & emergency lighting",
      "Article 4 / planning notes",
      "Rent-to-rent guarantee tracking",
    ],
  },
  commercial: {
    slug: "commercial",
    title: "Commercial",
    tagline: "Leases without the spreadsheet.",
    description: "Track tenants, service charges, business rates and lease events for commercial property.",
    icon: Store,
    features: [
      "Lease term & break clauses",
      "Service charge & rates apportionment",
      "Rent reviews & RPI/CPI uplifts",
      "Insurance & assignment workflow",
      "Vacant possession tracking",
    ],
  },
};

export const Route = createFileRoute("/modules/$slug")({
  head: ({ params }) => {
    const m = MODULES[params.slug];
    if (!m) return { meta: [{ title: "Module — HMOFlow" }] };
    return {
      meta: [
        { title: `${m.title} module — HMOFlow` },
        { name: "description", content: m.description },
        { property: "og:title", content: `${m.title} — HMOFlow` },
        { property: "og:description", content: m.description },
      ],
    };
  },
  component: ModulePage,
  notFoundComponent: () => <div className="p-10 text-center">Module not found.</div>,
  errorComponent: ({ error }) => <div className="p-10 text-center text-destructive">{error.message}</div>,
});

function ModulePage() {
  const { slug } = useParams({ from: "/modules/$slug" });
  const m = MODULES[slug];
  if (!m) {
    return (
      <div className="min-h-screen flex flex-col">
        <PublicHeader />
        <main className="flex-1 container mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl font-bold mb-4">Module not found</h1>
          <Button asChild><Link to="/">Back home</Link></Button>
        </main>
        <PublicFooter />
      </div>
    );
  }

  const Icon = m.icon;
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 brand-gradient opacity-10" />
          <div className="container relative mx-auto px-4 py-20 grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="brand-gradient inline-flex h-12 w-12 items-center justify-center rounded-xl text-white mb-4"><Icon className="h-6 w-6" /></div>
              {m.badge && <div className="inline-block text-xs uppercase tracking-wide bg-accent/10 text-accent px-2 py-0.5 rounded-full mb-3 ml-2">{m.badge}</div>}
              <h1 className="text-4xl md:text-5xl font-bold mb-4">{m.tagline}</h1>
              <p className="text-lg text-muted-foreground mb-8">{m.description}</p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg"><Link to="/auth">Start free</Link></Button>
                <Button asChild size="lg" variant="outline"><Link to="/marketplace">See live listings</Link></Button>
              </div>
            </div>
            <Card className="shadow-card border-0">
              <CardContent className="p-8">
                <h2 className="font-semibold text-lg mb-4">What's included</h2>
                <ul className="space-y-3">
                  {m.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm">
                      <Check className="h-4 w-4 text-success mt-0.5 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12">
          <div className="text-sm text-muted-foreground mb-3">Other modules</div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.values(MODULES).filter((x) => x.slug !== m.slug).map((x) => (
              <Link key={x.slug} to="/modules/$slug" params={{ slug: x.slug }} className="rounded-xl border p-4 hover:bg-muted/40 transition">
                <x.icon className="h-5 w-5 text-accent mb-2" />
                <div className="font-medium">{x.title}</div>
                <div className="text-xs text-muted-foreground">{x.tagline}</div>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <PublicFooter />
      <Outlet />
    </div>
  );
}
