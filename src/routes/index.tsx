import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Banknote,
  Building2,
  Check,
  ClipboardCheck,
  Hammer,
  Home,
  Kanban,
  KeyRound,
  Lock,
  Mail,
  MessageSquare,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { IsoIcon, type IsoIconName } from "@/components/iso/IsoIcon";
import heroHome from "@/assets/hero-home.jpg";
import heroPattern from "@/assets/hero-pattern.jpg";
import { siteUrl } from "@/lib/site-url";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Estately — One property platform for agents, owners, renters & buyers" },
      {
        name: "description",
        content:
          "Estately joins a public property marketplace with agency CRM, compliance, tenancy, payments and portals for landlords, renters, buyers, sellers and contractors. Private preview.",
      },
      { property: "og:title", content: "Estately — One property platform for everyone in the deal" },
      {
        property: "og:description",
        content:
          "Marketplace, CRM, compliance, tenancies, payments and portals — one workspace for agents, owners, renters, buyers, sellers and contractors.",
      },
      { property: "og:url", content: siteUrl("/") },
      { property: "og:type", content: "website" },
      { property: "og:image", content: siteUrl("/apple-touch-icon.png") },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Estately — One property platform for everyone in the deal" },
      {
        name: "twitter:description",
        content:
          "Marketplace, CRM, compliance, tenancies, payments and portals in one premium UK property workspace.",
      },
    ],
    links: [{ rel: "canonical", href: siteUrl("/") }],
  }),
  component: PromoHome,
});

const audiences = [
  {
    icon: Kanban,
    title: "Estate & letting agents",
    body: "Run sales, lettings, HMO and commercial from one CRM.",
    points: [
      "Leads, viewings, offers and pipeline with branch targets",
      "Listings published to the marketplace and your own site",
      "Tenancies, renewals, arrears and client accounting",
      "Teams, roles, permissions and per-branch subscriptions",
    ],
  },
  {
    icon: Home,
    title: "Landlords & property owners",
    body: "Portfolio, compliance and money in one live view.",
    points: [
      "Gas, EICR, EPC, licences and deposits with expiry alerts",
      "HMO room-level rents, inspections and occupancy",
      "Statements, rent reconciliation and arrears tracking",
      "Owner portal with documents, work orders and reporting",
    ],
  },
  {
    icon: KeyRound,
    title: "Renters & tenants",
    body: "Everything about your home in one portal.",
    points: [
      "Search, save and enquire on verified listings",
      "Referencing, right-to-rent and e-signed tenancy packs",
      "Pay rent by card and see every statement",
      "Report repairs and track the contractor visit",
    ],
  },
  {
    icon: Search,
    title: "Buyers & sellers",
    body: "A transparent path from viewing to completion.",
    points: [
      "Map search, saved searches and instant alerts",
      "Offers, MOU and buyer status tracked end to end",
      "Vendor portal with feedback, viewings and progress",
      "Conveyancer workspace for documents and milestones",
    ],
  },
  {
    icon: Hammer,
    title: "Contractors & third parties",
    body: "Jobs, evidence and payment without the phone tag.",
    points: [
      "Work-order marketplace with quotes and scheduling",
      "Photo, geo and timestamp evidence capture on mobile",
      "Inventory clerks, surveyors and utility providers built in",
      "Compliance certificates filed straight to the property",
    ],
  },
];

const isoFor: Record<string, IsoIconName> = {
  "Estate & letting agents": "agent",
  "Landlords & property owners": "house",
  "Renters & tenants": "key",
  "Buyers & sellers": "chart",
  "Contractors & third parties": "wrench",
};



const platform = [
  { icon: ShieldCheck, title: "Security & permissions", body: "Row-level security, agency scoping, nine roles, MFA for admin actions and a UK GDPR privacy centre." },
  { icon: Banknote, title: "Payments & accounting", body: "Card rent collection, subscription billing, bank reconciliation, statements and arrears workflows." },
  { icon: ClipboardCheck, title: "Compliance engine", body: "Certificates, licences, inspections and deposits with automated reminders before anything expires." },
  { icon: MessageSquare, title: "Messaging & automations", body: "Real-time inbox, notification bell, saved-search matching and scheduled automation runs." },
  { icon: Mail, title: "Email & alerts", body: "Transactional email, delivery webhooks, digest alerts and in-app notifications across every role." },
  { icon: Smartphone, title: "PWA & native ready", body: "Installable app, offline shell, mobile inspection capture and a tab bar tuned for site visits." },
];

const stats = [
  { value: "9", label: "Roles with tailored dashboards" },
  { value: "55+", label: "Operational workspaces" },
  { value: "335", label: "UK towns with local pages" },
  { value: "1", label: "Platform replacing the stack" },
];

function PromoHome() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-accent" aria-hidden="true" />
            <span className="font-display text-lg font-bold tracking-tight">Estately</span>
          </div>
          <Button asChild size="sm">
            <Link to="/unlock">
              <Lock className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" /> Preview access
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden border-b">
          <div
            className="absolute inset-0 opacity-[0.06] bg-cover bg-center"
            style={{ backgroundImage: `url(${heroPattern})` }}
            aria-hidden
          />
          <div className="container relative mx-auto grid items-center gap-10 px-4 pt-20 pb-16 md:pt-28 md:pb-24 lg:grid-cols-2">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-accent">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Private preview
              </div>
              <h1 className="mb-6 text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
                One property platform for everyone in the deal.
              </h1>
              <p className="mb-8 max-w-xl text-lg text-muted-foreground md:text-xl">
                Estately brings the marketplace, agency CRM, compliance, tenancies, payments and
                every portal — agents, owners, renters, buyers, sellers and contractors — into a
                single premium workspace.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link to="/unlock">
                    Enter with preview password{" "}
                    <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <a href="mailto:hello@estately.co.uk?subject=Estately%20preview%20access">
                    Request access
                  </a>
                </Button>
              </div>
              <p className="mt-6 text-xs text-muted-foreground">
                The full product is password protected during the promo period.
              </p>
            </div>
            <div className="relative">
              <div className="aspect-[4/3] overflow-hidden rounded-3xl border shadow-2xl">
                <img
                  src={heroHome}
                  alt="Estately property workspace preview"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="border-b bg-muted/30">
          <div className="container mx-auto grid gap-px overflow-hidden px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="px-1 sm:border-l sm:first:border-l-0 sm:pl-6">
                <div className="font-display text-4xl font-bold tabular gold-text">
                  {stat.value}
                </div>
                <div className="mt-1.5 text-sm leading-snug text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </section>


        <section className="border-b">
          <div className="container mx-auto px-4 py-16 md:py-24">
            <div className="mb-12 max-w-2xl">
              <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-accent">
                Built for every side of property
              </div>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Whoever you are in the transaction, there&rsquo;s a workspace for you.
              </h2>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {audiences.map((audience) => (
                <article
                  key={audience.title}
                  className="prestige-card group relative overflow-hidden p-7"
                >
                  <div
                    className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-accent/10 blur-2xl transition-opacity duration-500 group-hover:opacity-100 opacity-0"
                    aria-hidden
                  />
                  <div className="relative mb-5 flex items-center gap-4">
                    <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-accent/10 gold-hairline transition-transform duration-500 group-hover:-translate-y-0.5">
                      <IsoIcon name={isoFor[audience.title]} size={40} alt="" />
                    </div>
                    <audience.icon
                      className="h-5 w-5 text-accent/70 transition-colors group-hover:text-accent"
                      aria-hidden="true"
                    />
                  </div>
                  <h3 className="relative text-xl font-semibold">{audience.title}</h3>
                  <p className="relative mt-2 text-sm text-muted-foreground">{audience.body}</p>
                  <div className="divider-gold my-5" />
                  <ul className="relative space-y-2.5 text-sm">
                    {audience.points.map((point) => (
                      <li key={point} className="flex gap-2.5">
                        <Check
                          className="mt-0.5 h-4 w-4 shrink-0 text-accent"
                          aria-hidden="true"
                        />
                        <span className="text-muted-foreground">{point}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>

          </div>
        </section>

        <section className="border-b bg-muted/20">
          <div className="container mx-auto px-4 py-16 md:py-24">
            <div className="mb-12 max-w-2xl">
              <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-accent">
                Under the hood
              </div>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Everything already built into the platform.
              </h2>
            </div>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {platform.map((item) => (
                <div
                  key={item.title}
                  className="group rounded-2xl border bg-card p-6 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-prestige"
                >
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent transition-colors group-hover:bg-accent/20">
                    <item.icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                </div>
              ))}
            </div>

          </div>
        </section>

        <section>
          <div className="container mx-auto px-4 py-20 md:py-28">
            <div className="mx-auto max-w-4xl rounded-3xl border bg-gradient-to-br from-accent/10 via-background to-accent/5 p-10 text-center md:p-16">
              <Users className="mx-auto mb-5 h-10 w-10 text-accent" aria-hidden="true" />
              <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
                Want to see the whole platform?
              </h2>
              <p className="mx-auto mb-8 max-w-xl text-lg text-muted-foreground">
                Preview access is invite-only while we finish the launch rollout. Already have the
                password? Head straight in.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button asChild size="lg">
                  <Link to="/unlock">Enter platform</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <a href="mailto:hello@estately.co.uk?subject=Estately%20preview%20access">
                    Request access
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground">
          <span>&copy; {new Date().getFullYear()} Estately. All rights reserved.</span>
          <Link to="/unlock" className="font-medium text-accent">
            Preview access
          </Link>
        </div>
      </footer>
    </div>
  );
}
