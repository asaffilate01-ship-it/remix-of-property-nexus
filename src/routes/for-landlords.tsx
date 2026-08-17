import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Building2, Tag, AlertTriangle, ArrowRight, Check } from "lucide-react";
import heroLandlords from "@/assets/hero-landlords.jpg";

export const Route = createFileRoute("/for-landlords")({
  head: () => ({
    meta: [
      { title: "For Landlords — Gabley" },
      { name: "description", content: "Compliance, tenancy and income management for portfolio landlords. Sales, lettings, HMO and commercial — one workspace." },
      { property: "og:title", content: "Gabley for Landlords" },
      { property: "og:image", content: heroLandlords },
    ],
  }),
  component: ForLandlords,
});

function ForLandlords() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-1">
        <section className="relative overflow-hidden border-b">
          <div className="container mx-auto px-4 py-16 md:py-24 grid lg:grid-cols-2 gap-10 items-center">
            <div className="lg:order-2">
              <div className="text-xs font-semibold tracking-widest text-accent uppercase mb-3">For landlords</div>
              <h1 className="text-4xl md:text-5xl font-bold mb-5 tracking-tight">Compliance, done right. Income, on autopilot.</h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl">Track licences, gas, EICR, EPC, fire safety and deposits — with smart alerts long before they expire. Switch on the HMO module for room-level operations.</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild size="lg"><Link to="/auth">Get started <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
                <Button asChild size="lg" variant="outline"><Link to="/modules/$slug" params={{ slug: "hmo" }}>Explore HMO module</Link></Button>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                {["No bank integration needed", "Multi-property", "Audit-ready reports"].map((f) => (
                  <span key={f} className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-success" />{f}</span>
                ))}
              </div>
            </div>
            <div className="relative rounded-3xl overflow-hidden shadow-2xl ring-1 ring-border/50 lg:order-1">
              <img src={heroLandlords} alt="Modern terraced house at dusk" width={1536} height={1024} className="w-full h-[340px] md:h-[460px] object-cover" />
            </div>
          </div>
        </section>
        <section className="container mx-auto px-4 py-16 md:py-20 grid sm:grid-cols-2 gap-x-8 gap-y-10">
          {[
            { icon: ShieldCheck, title: "Full UK compliance catalogue", body: "Licensing, gas, electrical, fire, energy, water, deposits — with statutory frequencies built in." },
            { icon: Building2, title: "Property & room manager", body: "From single-lets to large HMOs: properties, rooms, rents, tenants and vacancies at a glance." },
            { icon: Tag, title: "List to the marketplace", body: "Publish rooms and properties to public seekers in one click. Direct enquiries, no portal fees." },
            { icon: AlertTriangle, title: "Expiry alerts", body: "Renewal reminders so a missed certificate never costs you a licence or a deposit dispute." },
          ].map((f) => (
            <div key={f.title} className="flex gap-4">
              <div className="brand-gradient h-11 w-11 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md"><f.icon className="h-5 w-5" /></div>
              <div><div className="font-semibold mb-1 text-lg">{f.title}</div><p className="text-sm text-muted-foreground">{f.body}</p></div>
            </div>
          ))}
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
