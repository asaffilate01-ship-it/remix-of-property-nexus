import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Building2, Tag, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/for-landlords")({
  head: () => ({ meta: [{ title: "For Landlords — HMOFlow" }, { name: "description", content: "HMO compliance, tenancy and income management for landlords." }] }),
  component: ForLandlords,
});

function ForLandlords() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-1">
        <section className="brand-gradient text-white py-20">
          <div className="container mx-auto px-4 max-w-3xl text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">HMO compliance, done right.</h1>
            <p className="text-white/85 text-lg mb-8">Track HMO licences, gas, EICR, EPC, fire safety and more — with alerts before they expire.</p>
            <Button asChild size="lg" variant="secondary"><Link to="/auth">Get started</Link></Button>
          </div>
        </section>
        <section className="container mx-auto px-4 py-16 grid md:grid-cols-2 gap-8">
          {[
            { icon: ShieldCheck, title: "Full UK HMO compliance catalog", body: "Licensing, gas, electrical, fire, energy, water, deposits — with statutory frequencies." },
            { icon: Building2, title: "Property & room manager", body: "HMO-first: rooms, rents, tenants and vacancies at a glance." },
            { icon: Tag, title: "List to the marketplace", body: "Publish rooms and properties to public seekers in one click." },
            { icon: AlertTriangle, title: "Expiry alerts", body: "Renewal reminders so a missed certificate never costs you a licence." },
          ].map((f) => (
            <div key={f.title} className="flex gap-4">
              <div className="brand-gradient h-10 w-10 rounded-lg flex items-center justify-center text-white shrink-0"><f.icon className="h-5 w-5" /></div>
              <div><div className="font-semibold mb-1">{f.title}</div><p className="text-sm text-muted-foreground">{f.body}</p></div>
            </div>
          ))}
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
