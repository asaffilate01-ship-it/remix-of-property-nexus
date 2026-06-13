import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { Button } from "@/components/ui/button";
import { Kanban, Inbox, Users, Tag, ArrowRight, Check } from "lucide-react";
import heroAgents from "@/assets/hero-agents.jpg";

export const Route = createFileRoute("/for-agents")({
  head: () => ({
    meta: [
      { title: "For Agents — Estately" },
      { name: "description", content: "Agency CRM for sales and lettings — leads, pipeline, listings and branches in one place." },
      { property: "og:title", content: "Estately for Agents" },
      { property: "og:image", content: heroAgents },
    ],
  }),
  component: ForAgents,
});

function ForAgents() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-1">
        <section className="relative overflow-hidden border-b">
          <div className="container mx-auto px-4 py-16 md:py-24 grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="text-xs font-semibold tracking-widest text-accent uppercase mb-3">For agencies</div>
              <h1 className="text-4xl md:text-5xl font-bold mb-5 tracking-tight">A CRM that finally fits how agents actually work.</h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl">Capture marketplace leads, run viewings, push offers through to completion — branch, team and target friendly.</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild size="lg"><Link to="/auth">Start free <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
                <Button asChild size="lg" variant="outline"><Link to="/marketplace">See the marketplace</Link></Button>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                {["No setup fee", "Free for 14 days", "Migrate from Reapit/Alto"].map((f) => (
                  <span key={f} className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-success" />{f}</span>
                ))}
              </div>
            </div>
            <div className="relative rounded-3xl overflow-hidden shadow-2xl ring-1 ring-border/50">
              <img src={heroAgents} alt="Estate agent at desk using Estately CRM" width={1536} height={1024} className="w-full h-[340px] md:h-[460px] object-cover" />
            </div>
          </div>
        </section>
        <section className="container mx-auto px-4 py-16 md:py-20 grid sm:grid-cols-2 gap-x-8 gap-y-10">
          {[
            { icon: Inbox, title: "Unified inbox", body: "Every enquiry from the marketplace lands in your team's inbox — assigned, tagged and ready." },
            { icon: Kanban, title: "Sales & lettings pipeline", body: "Drag deals through stages — viewing, offer, negotiation, agreed, completed." },
            { icon: Tag, title: "Listings management", body: "Publish to the Estately marketplace and your own portals. Manage photos, status and pricing." },
            { icon: Users, title: "Branded agency page", body: "Public profile with logo, team, contact, reviews and active listings." },
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
