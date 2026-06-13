import { createFileRoute, useParams, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { ListingCard } from "@/components/ListingCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, MapPin, Mail, Globe, ChevronLeft, ShieldCheck, Wrench, Home, Users, ArrowRight, Star } from "lucide-react";
import { PhoneReveal } from "@/components/PhoneReveal";
import { fetchAgency } from "@/lib/public.functions";

function AgencyError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <Shell>
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-xl font-semibold tracking-tight">This agency page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">Something went wrong. Try refreshing or browse other agencies.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }} className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">Try again</button>
          <Link to="/agencies" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent">All agencies</Link>
        </div>
      </div>
    </Shell>
  );
}

function AgencyNotFound() {
  return (
    <Shell>
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Agency not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">We couldn't find that agency. It may have been removed or the link might be incorrect.</p>
        <div className="mt-6">
          <Link to="/agencies" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">All agencies</Link>
        </div>
      </div>
    </Shell>
  );
}

function AgencySkeleton() {
  return (
    <Shell>
      <section className="relative">
        <div className="h-48 md:h-72 brand-gradient opacity-30 animate-pulse" />
      </section>
      <div className="container mx-auto px-4">
        <div className="-mt-16 md:-mt-20 flex flex-wrap items-end gap-5 pb-6">
          <div className="h-24 w-24 md:h-32 md:w-32 rounded-2xl bg-muted animate-pulse shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
            <div className="h-8 w-64 bg-muted rounded animate-pulse" />
            <div className="h-4 w-40 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 pb-16 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-4 space-y-2">
              <div className="h-8 w-12 bg-muted rounded animate-pulse" />
              <div className="h-3 w-20 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card overflow-hidden">
              <div className="aspect-[4/3] bg-muted animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-5 w-24 bg-muted rounded animate-pulse" />
                <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}

export const Route = createFileRoute("/agencies/$slug")({
  loader: async ({ params }) => {
    try { return await fetchAgency({ data: { slug: params.slug } }); }
    catch { return { agency: null, listings: [], stats: { total: 0, sale: 0, rent: 0, hmo: 0 } }; }
  },
  head: ({ params, loaderData }) => {
    const a = (loaderData as { agency?: { name?: string; description?: string; logo_url?: string; cover_image?: string; city?: string } } | undefined)?.agency;
    const url = `https://proptest.313test.co.uk/agencies/${params.slug}`;
    const title = a?.name ? `${a.name}${a.city ? ` — ${a.city}` : ""} | Estately` : "Agency — Estately";
    const desc = a?.description?.slice(0, 155) ?? `Browse properties from ${a?.name ?? "this agency"} on Estately.`;
    const img = a?.cover_image || a?.logo_url;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:type", content: "profile" },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        ...(img ? [{ property: "og:image", content: img }, { name: "twitter:image", content: img }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  errorComponent: AgencyError,
  notFoundComponent: AgencyNotFound,
  component: AgencyPage,
});

type Filter = "all" | "sale" | "rent" | "hmo";

function AgencyPage() {
  const { slug } = useParams({ from: "/agencies/$slug" });
  const fn = useServerFn(fetchAgency);
  const { data, isLoading } = useQuery({ queryKey: ["agency", slug], queryFn: () => fn({ data: { slug } }) });
  const [tab, setTab] = useState<Filter>("all");

  if (isLoading) return <AgencySkeleton />;
  if (!data?.agency) return <AgencyNotFound />;

  const a = data.agency;
  const filtered = data.listings.filter((l) => {
    if (tab === "all") return true;
    if (tab === "sale") return l.purpose === "sale";
    if (tab === "rent") return l.purpose === "rent" && !l.is_hmo;
    if (tab === "hmo") return l.is_hmo;
    return true;
  });

  return (
    <Shell>
      <section className="relative">
        <div className="h-48 md:h-72 brand-gradient relative overflow-hidden">
          {a.cover_image && <img src={a.cover_image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
        </div>
        <div className="container mx-auto px-4">
          <div className="-mt-16 md:-mt-20 flex flex-wrap items-end gap-5 pb-6">
            <div className="h-24 w-24 md:h-32 md:w-32 rounded-2xl bg-card border shadow-xl overflow-hidden shrink-0">
              {a.logo_url ? <img src={a.logo_url} alt={a.name} className="h-full w-full object-cover" /> : <div className="h-full w-full bg-muted flex items-center justify-center"><Building2 className="h-10 w-10 text-muted-foreground" /></div>}
            </div>
            <div className="flex-1 min-w-0">
              <Link to="/agencies" className="text-xs text-muted-foreground inline-flex items-center hover:text-foreground mb-1"><ChevronLeft className="h-3 w-3" /> All agencies</Link>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{a.name}</h1>
              {a.city && <div className="text-muted-foreground inline-flex items-center gap-1.5 mt-1"><MapPin className="h-4 w-4" />{a.city}</div>}
            </div>
            <div className="flex flex-wrap gap-2">
              {a.email && <Button variant="outline" size="sm" asChild><a href={`mailto:${a.email}`}><Mail className="h-3 w-3 mr-1" /> Email</a></Button>}
              {a.website && <Button variant="outline" size="sm" asChild><a href={a.website} target="_blank" rel="noreferrer"><Globe className="h-3 w-3 mr-1" /> Website</a></Button>}
            </div>
          </div>
        </div>
      </section>

      {/* Phone + portal logins */}
      <section className="container mx-auto px-4 pb-2">
        <div className="grid lg:grid-cols-[1fr_2fr] gap-6">
          <Card className="border-0 shadow-card">
            <CardContent className="p-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Get in touch</div>
              <PhoneReveal phone={a.phone} email={a.email} whatsapp={a.phone} agencyName={a.name} context={`Enquiry via ${a.name}'s Estately page.`} />
            </CardContent>
          </Card>
          <Card className="border-0 shadow-card">
            <CardContent className="p-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Customer portals</div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
                <PortalLink to="/auth" icon={<Home className="h-4 w-4" />} label="Tenant login" sub="Pay rent, repairs, documents" />
                <PortalLink to="/auth" icon={<Building2 className="h-4 w-4" />} label="Landlord login" sub="Statements & performance" />
                <PortalLink to="/auth" icon={<Wrench className="h-4 w-4" />} label="Contractor login" sub="Work orders & invoices" />
                <PortalLink to="/auth" icon={<ShieldCheck className="h-4 w-4" />} label="Third-party login" sub="Solicitors, surveyors, utilities" />
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="container mx-auto px-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total listings", value: data.stats.total },
            { label: "For sale", value: data.stats.sale },
            { label: "To let", value: data.stats.rent },
            { label: "HMO rooms", value: data.stats.hmo },
          ].map((s) => (
            <Card key={s.label} className="border-0 shadow-card">
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {a.description && (
        <section className="container mx-auto px-4 py-8">
          <p className="max-w-3xl text-foreground/90 leading-relaxed">{a.description}</p>
        </section>
      )}

      {/* Why choose + team */}
      <section className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-4">
          {[
            { icon: <Star className="h-5 w-5" />, t: "Local experts", d: `${a.city ?? "Local"} sales & lettings team with deep area knowledge.` },
            { icon: <ShieldCheck className="h-5 w-5" />, t: "Regulated & insured", d: "ARLA Propertymark, redress scheme, CMP protected." },
            { icon: <Users className="h-5 w-5" />, t: "Dedicated negotiators", d: "One point of contact from instruction to completion." },
          ].map((b) => (
            <Card key={b.t} className="border-0 shadow-card">
              <CardContent className="p-5">
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">{b.icon}</div>
                <div className="font-semibold">{b.t}</div>
                <div className="text-sm text-muted-foreground mt-1">{b.d}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 pb-16">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Properties</h2>
          <Tabs value={tab} onValueChange={(v) => setTab(v as Filter)}>
            <TabsList>
              <TabsTrigger value="all">All ({data.stats.total})</TabsTrigger>
              <TabsTrigger value="sale">Sale ({data.stats.sale})</TabsTrigger>
              <TabsTrigger value="rent">Let ({data.stats.rent})</TabsTrigger>
              <TabsTrigger value="hmo">HMO ({data.stats.hmo})</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        {filtered.length ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((l) => <ListingCard key={l.id} l={l as never} />)}
          </div>
        ) : <div className="text-muted-foreground text-center py-12">No listings in this category.</div>}
      </section>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex flex-col"><PublicHeader /><main className="flex-1">{children}</main><PublicFooter /></div>;
}

function PortalLink({ to, icon, label, sub }: { to: string; icon: React.ReactNode; label: string; sub: string }) {
  return (
    <Link to={to} className="rounded-lg border p-3 hover:border-primary/40 hover:bg-primary/5 transition-colors group">
      <div className="flex items-center justify-between">
        <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">{icon}</div>
        <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
      <div className="font-medium text-sm mt-2">{label}</div>
      <div className="text-xs text-muted-foreground line-clamp-1">{sub}</div>
    </Link>
  );
}
