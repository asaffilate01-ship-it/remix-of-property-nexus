import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { ListingCard } from "@/components/ListingCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, MapPin, Phone, Mail, Globe, ChevronLeft } from "lucide-react";
import { fetchAgency } from "@/lib/public.functions";

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
  component: AgencyPage,
});

type Filter = "all" | "sale" | "rent" | "hmo";

function AgencyPage() {
  const { slug } = useParams({ from: "/agencies/$slug" });
  const fn = useServerFn(fetchAgency);
  const { data, isLoading } = useQuery({ queryKey: ["agency", slug], queryFn: () => fn({ data: { slug } }) });
  const [tab, setTab] = useState<Filter>("all");

  if (isLoading) return <Shell><div className="container mx-auto p-8">Loading…</div></Shell>;
  if (!data?.agency) return <Shell><div className="container mx-auto p-8 text-center"><p>Agency not found.</p><Button asChild className="mt-4"><Link to="/agencies">All agencies</Link></Button></div></Shell>;

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
              {a.phone && <Button variant="outline" size="sm" asChild><a href={`tel:${a.phone}`}><Phone className="h-3 w-3 mr-1" /> Call</a></Button>}
              {a.email && <Button variant="outline" size="sm" asChild><a href={`mailto:${a.email}`}><Mail className="h-3 w-3 mr-1" /> Email</a></Button>}
              {a.website && <Button variant="outline" size="sm" asChild><a href={a.website} target="_blank" rel="noreferrer"><Globe className="h-3 w-3 mr-1" /> Website</a></Button>}
            </div>
          </div>
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
