import { useState } from "react";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { IsoIcon, type IsoIconName } from "@/components/iso/IsoIcon";

import heroHome from "@/assets/hero-home.jpg";
import heroPattern from "@/assets/hero-pattern.jpg";
import shotMarketplace from "@/assets/shot-marketplace.jpg";
import shotDashboard from "@/assets/shot-dashboard.jpg";
import shotHome from "@/assets/shot-home.jpg";
import shotBusiness from "@/assets/shot-business.jpg";
import { siteUrl } from "@/lib/site-url";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gabley — Where property comes together" },
      {
        name: "description",
        content:
          "Gabley joins a public property marketplace with agency CRM, compliance, tenancy, payments and portals for landlords, renters, buyers, sellers and contractors. Private preview.",
      },
      { property: "og:title", content: "Gabley — Where property comes together" },
      {
        property: "og:description",
        content:
          "Marketplace, CRM, compliance, tenancies, payments and portals — one workspace for agents, owners, renters, buyers, sellers and contractors.",
      },
      { property: "og:url", content: siteUrl("/") },
      { property: "og:type", content: "website" },
      { property: "og:image", content: siteUrl("/apple-touch-icon.png") },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Gabley — Where property comes together" },
      {
        name: "twitter:description",
        content:
          "Marketplace, CRM, compliance, tenancies, payments and portals in one premium UK property workspace.",
      },
    ],
    links: [{ rel: "canonical", href: siteUrl("/") }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],

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

const faqs = [
  {
    q: "What is Gabley?",
    a: "Gabley is a single property platform combining a public marketplace, agency CRM, compliance hub, tenancy and payment tools, plus portals for landlords, renters, buyers, sellers and contractors.",
  },
  {
    q: "Why is the site password protected?",
    a: "We are in a private promo preview while the launch rollout is finished. This page is public; the full product sits behind a preview password so early access stays invite-only.",
  },
  {
    q: "How do I get preview access?",
    a: "If you already have the preview password, use the Preview access button. Otherwise request access by email and we will send credentials with a short guided walkthrough.",
  },
  {
    q: "Which systems does Gabley replace?",
    a: "Agencies typically use it in place of a stack such as Reapit, Alto, Dezrez, Arthur, Goodlord or PayProp — listings, pipeline, tenancies, compliance, statements and payments live in one workspace.",
  },
  {
    q: "Does it handle HMOs, commercial and holiday lets?",
    a: "Yes. Room-level HMO rents, inspections and licensing, commercial stock and holiday-let scheduling are all built in alongside standard sales and lettings.",
  },
  {
    q: "How are payments and rent collection handled?",
    a: "Card rent collection, subscription billing, bank reconciliation, statements and arrears workflows are built in, with test mode available before you go live.",
  },
  {
    q: "Is my data secure and UK GDPR compliant?",
    a: "Every table is protected by row-level security with agency scoping and nine roles, MFA on sensitive admin actions, and a privacy centre for UK GDPR data requests.",
  },
  {
    q: "Can I use it on mobile?",
    a: "Yes. Gabley is an installable PWA with an offline shell and mobile capture, and native iOS and Android shells are ready for store submission.",
  },
];


const screens = [
  {
    id: "marketplace",
    label: "Marketplace",
    title: "Search that behaves like a portal, owned by you",
    body: "Split grid and map search, HMO rooms, commercial stock and verified agency badges — every listing published straight from the CRM.",
    image: shotMarketplace,
  },
  {
    id: "dashboard",
    label: "Agency CRM",
    title: "One control centre for the whole branch",
    body: "Leads, viewings, pipeline and offers with launch checklists, branch switching, command palette and role-aware navigation.",
    image: shotDashboard,
  },
  {
    id: "site",
    label: "Public site",
    title: "A marketing site that sells the platform",
    body: "Fast, SEO-tuned pages for buyers, renters, landlords and agents, with local market pages across 335 UK towns.",
    image: shotHome,
  },
  {
    id: "business",
    label: "For business",
    title: "Built to replace the legacy stack",
    body: "Plans, migration paths and the commercial story for agencies moving off Reapit, Alto, Arthur and Goodlord.",
    image: shotBusiness,
  },
] as const;

function ProductShowcase() {
  const [active, setActive] = useState<string>(screens[0].id);
  const current = screens.find((s) => s.id === active) ?? screens[0];

  return (
    <section className="border-b bg-muted/20">
      <div className="container mx-auto px-4 py-12 md:py-24">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-5 md:mb-10 md:gap-6">
          <div className="max-w-2xl">
            <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-accent">
              Real screens, not mockups
            </div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
              A look inside the platform.
            </h2>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              Screenshots taken straight from the live product behind the preview password.
            </p>
          </div>
          <div
            className="no-scrollbar -mx-1 flex w-full max-w-full gap-1.5 overflow-x-auto rounded-full border bg-card/70 p-1.5 shadow-card sm:w-auto"
            role="tablist"
            aria-label="Product screenshots"
          >
            {screens.map((screen) => (
              <button
                key={screen.id}
                type="button"
                role="tab"
                aria-selected={screen.id === active}
                onClick={() => setActive(screen.id)}
                className={`whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium transition-colors sm:px-4 ${
                  screen.id === active
                    ? "btn-prestige"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {screen.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid items-center gap-8 lg:grid-cols-[1.55fr_1fr]">

          <div className="relative">
            <div
              className="pointer-events-none absolute -inset-6 rounded-[2.5rem] bg-accent/10 blur-3xl"
              aria-hidden
            />
            <figure className="relative overflow-hidden rounded-2xl border bg-card ring-prestige">
              <div className="flex items-center gap-1.5 border-b bg-muted/50 px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" aria-hidden />
                <span className="h-2.5 w-2.5 rounded-full bg-warning/70" aria-hidden />
                <span className="h-2.5 w-2.5 rounded-full bg-success/60" aria-hidden />
                <span className="ml-3 truncate rounded-md bg-background/70 px-2.5 py-1 text-[11px] text-muted-foreground">
                  gabley.co.uk — {current.label.toLowerCase()}
                </span>
              </div>
              <img
                key={current.id}
                src={current.image}
                alt={`Gabley ${current.label} screen`}
                width={1600}
                height={1000}
                loading="lazy"
                className="w-full animate-in fade-in duration-500"
              />
            </figure>
          </div>

          <div>
            <h3 className="text-xl font-semibold sm:text-2xl">{current.title}</h3>
            <div className="divider-gold my-4 sm:my-5" />
            <p className="text-sm text-muted-foreground sm:text-base">{current.body}</p>
            <ul className="mt-5 space-y-2.5 text-sm sm:mt-6">
              {["Live data, real workflows", "Role-aware permissions throughout", "Same experience on mobile and native"].map(
                (point) => (
                  <li key={point} className="flex gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                    <span className="text-muted-foreground">{point}</span>
                  </li>
                ),
              )}
            </ul>
            <Button asChild className="btn-prestige mt-6 w-full sm:mt-7 sm:w-auto">
              <Link to="/unlock">
                Unlock the full preview
                <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>

        </div>
      </div>
    </section>
  );
}

function PromoHome() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 border-b glass">
        <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent/12 gold-hairline">
              <Building2 className="h-5 w-5 text-accent" aria-hidden="true" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="font-display text-lg font-bold tracking-tight">Gabley</span>
              <span className="hidden text-[11px] text-muted-foreground sm:block">Where property comes together</span>
            </span>

          </div>
          <Button asChild size="sm" className="btn-prestige">
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
          <div className="container relative mx-auto grid items-center gap-8 px-4 pt-12 pb-12 sm:pt-16 md:gap-10 md:pt-28 md:pb-24 lg:grid-cols-2">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-accent sm:text-xs">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Private preview
              </div>

              <h1 className="mb-4 text-[1.9rem] font-bold leading-[1.1] tracking-tight sm:text-4xl md:mb-6 md:text-6xl">
                One property platform for everyone in the deal.
              </h1>
              <p className="mb-7 max-w-xl text-base text-muted-foreground sm:text-lg md:mb-8 md:text-xl">
                Gabley brings the marketplace, agency CRM, compliance, tenancies, payments and
                every portal — agents, owners, renters, buyers, sellers and contractors — into a
                single premium workspace.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button asChild size="lg" className="btn-prestige group w-full sm:w-auto">
                  <Link to="/unlock">
                    Enter with preview password{" "}
                    <ArrowRight
                      className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </Link>
                </Button>

                <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                  <a href="mailto:hello@gabley.co.uk?subject=Gabley%20preview%20access">
                    Request access
                  </a>
                </Button>
              </div>
              <p className="mt-5 text-xs text-muted-foreground md:mt-6">
                The full product is password protected during the promo period.
              </p>
            </div>
            <div className="relative">
              <div className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-accent/10 blur-3xl" aria-hidden />
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border ring-prestige md:rounded-3xl">

                <img
                  src={heroHome}
                  alt="Gabley property workspace preview"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="border-b bg-muted/30">
          <div className="container mx-auto grid grid-cols-2 gap-y-6 overflow-hidden px-4 py-10 sm:gap-px sm:py-12 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="min-w-0 px-1 sm:border-l sm:first:border-l-0 sm:pl-6">
                <div className="font-display text-3xl font-bold tabular gold-text sm:text-4xl">
                  {stat.value}
                </div>
                <div className="mt-1.5 text-xs leading-snug text-muted-foreground sm:text-sm">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </section>


        <section className="border-b">
          <div className="container mx-auto px-4 py-12 md:py-24">
            <div className="mb-8 max-w-2xl md:mb-12">
              <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-accent">
                Built for every side of property
              </div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
                Whoever you are in the transaction, there&rsquo;s a workspace for you.
              </h2>
            </div>
            <div className="grid gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
              {audiences.map((audience) => (
                <article
                  key={audience.title}
                  className="prestige-card group relative overflow-hidden p-5 sm:p-7"
                >

                  <div
                    className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-accent/10 blur-2xl transition-opacity duration-500 group-hover:opacity-100 opacity-0"
                    aria-hidden
                  />
                  <div className="relative mb-4 flex items-center justify-between gap-4 md:mb-5">
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-accent/10 gold-hairline transition-transform duration-500 group-hover:-translate-y-0.5 sm:h-16 sm:w-16">
                      <IsoIcon name={isoFor[audience.title]} size={36} alt="" />
                    </div>
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border/70 text-accent/70 transition-colors group-hover:border-accent/40 group-hover:text-accent">
                      <audience.icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </div>

                  <h3 className="relative text-lg font-semibold sm:text-xl">{audience.title}</h3>
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

        <ProductShowcase />

        <section className="border-b bg-muted/20">
          <div className="container mx-auto px-4 py-12 md:py-24">
            <div className="mb-8 max-w-2xl md:mb-12">
              <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-accent">
                Under the hood
              </div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
                Everything already built into the platform.
              </h2>
            </div>
            <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
              {platform.map((item) => (
                <div
                  key={item.title}
                  className="group rounded-2xl border bg-card p-5 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-prestige sm:p-6"
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

        {/* FAQs */}
        <section id="faqs" className="border-b">
          <div className="container mx-auto px-4 py-12 md:py-24">
            <div className="mb-8 max-w-2xl md:mb-10">
              <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-accent">
                Questions
              </div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
                Frequently asked questions.
              </h2>
            </div>
            <Accordion type="single" collapsible className="mx-auto max-w-3xl">
              {faqs.map((faq, i) => (
                <AccordionItem key={faq.q} value={`faq-${i}`}>
                  <AccordionTrigger className="text-left text-base font-semibold">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        <section>
          <div className="container mx-auto px-4 py-14 md:py-28">
            <div className="mx-auto max-w-4xl rounded-3xl border bg-gradient-to-br from-accent/10 via-background to-accent/5 p-7 text-center sm:p-10 md:p-16">
              <Users className="mx-auto mb-5 h-9 w-9 text-accent sm:h-10 sm:w-10" aria-hidden="true" />
              <h2 className="mb-4 text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
                Want to see the whole platform?
              </h2>
              <p className="mx-auto mb-7 max-w-xl text-base text-muted-foreground sm:text-lg md:mb-8">
                Preview access is invite-only while we finish the launch rollout. Already have the
                password? Head straight in.
              </p>
              <div className="flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link to="/unlock">Enter platform</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                  <a href="mailto:hello@gabley.co.uk?subject=Gabley%20preview%20access">
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
          <span>&copy; {new Date().getFullYear()} Gabley. All rights reserved.</span>
          <Link to="/unlock" className="font-medium text-accent">
            Preview access
          </Link>
        </div>
      </footer>
    </div>
  );
}
