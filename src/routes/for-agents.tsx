import { createFileRoute } from "@tanstack/react-router";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { Kanban, Inbox, Users, Tag } from "lucide-react";

export const Route = createFileRoute("/for-agents")({
  head: () => ({ meta: [{ title: "For Agents — HMOFlow" }, { name: "description", content: "Agency CRM for sales and lettings — leads, pipeline, listings and branches in one place." }] }),
  component: ForAgents,
});

function ForAgents() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-1">
        <section className="brand-gradient text-white py-20">
          <div className="container mx-auto px-4 max-w-3xl text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">A CRM built for letting & sales agents.</h1>
            <p className="text-white/85 text-lg mb-8">Capture marketplace leads, run viewings, track offers through to completion — branch-friendly.</p>
            <Button asChild size="lg" variant="secondary"><Link to="/auth">Start free</Link></Button>
          </div>
        </section>
        <section className="container mx-auto px-4 py-16 grid md:grid-cols-2 gap-8">
          {[
            { icon: Inbox, title: "Unified inbox", body: "Every enquiry from the marketplace lands in your team's inbox." },
            { icon: Kanban, title: "Sales & lettings pipeline", body: "Drag deals through stages — viewing, offer, negotiation, agreed, completed." },
            { icon: Tag, title: "Listings management", body: "Publish to the HMOFlow marketplace, manage photos, status and pricing." },
            { icon: Users, title: "Branded agency page", body: "Public profile with logo, team and active listings." },
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
