import { createFileRoute, useSearch, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { ListingCard } from "@/components/ListingCard";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchListings } from "@/lib/public.functions";
import { useState } from "react";
import { Search } from "lucide-react";

const categories = ["all", "sale", "rent", "hmo", "commercial"] as const;
type Category = (typeof categories)[number];

const search = z.object({
  category: z.enum(categories).optional(),
  city: z.string().optional(),
  q: z.string().optional(),
});

export const Route = createFileRoute("/marketplace/")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Property Marketplace — Homes, Lets, Rooms & Commercial" },
      { name: "description", content: "Browse residential sales, lettings, HMO rooms and commercial property from verified agents and landlords." },
      { property: "og:title", content: "Property Marketplace" },
      { property: "og:description", content: "Sales, lettings, HMO rooms and commercial — all in one place." },
    ],
  }),
  component: MarketplacePage,
});

const tabs: { value: Category; label: string }[] = [
  { value: "all", label: "All" },
  { value: "sale", label: "For sale" },
  { value: "rent", label: "To let" },
  { value: "hmo", label: "HMO rooms" },
  { value: "commercial", label: "Commercial" },
];

function MarketplacePage() {
  const s = useSearch({ from: "/marketplace/" });
  const navigate = useNavigate({ from: "/marketplace/" });
  const [q, setQ] = useState(s.q ?? "");
  const [city, setCity] = useState(s.city ?? "");
  const category: Category = s.category ?? "all";

  const fn = useServerFn(fetchListings);
  const { data, isLoading } = useQuery({
    queryKey: ["listings", { q, city, category }],
    queryFn: () => fn({ data: { q: q || undefined, city: city || undefined, category } }),
  });

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-1">
        <section className="brand-gradient text-white relative overflow-hidden">
          <div className="container mx-auto px-4 py-12 md:py-16 relative">
            <h1 className="text-3xl md:text-5xl font-bold mb-3 tracking-tight max-w-3xl">Find property that fits.</h1>
            <p className="text-white/80 mb-6 md:mb-8 text-base md:text-lg max-w-2xl">Sales, lettings, HMO rooms and commercial — from verified agents and landlords across the UK.</p>
            <div className="bg-card text-foreground rounded-2xl p-3 md:p-4 grid md:grid-cols-12 gap-3 shadow-2xl ring-1 ring-border/50">
              <div className="md:col-span-7 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by title or keyword…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9 h-11" />
              </div>
              <div className="md:col-span-5">
                <Input placeholder="City or postcode" value={city} onChange={(e) => setCity(e.target.value)} className="h-11" />
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-8">
          <Tabs
            value={category}
            onValueChange={(v) => navigate({ search: (prev: z.infer<typeof search>) => ({ ...prev, category: v === "all" ? undefined : (v as Category) }) })}
          >
            <TabsList className="flex flex-wrap h-auto">
              {tabs.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </section>

        <section className="container mx-auto px-4 pb-16">
          {isLoading ? (
            <div className="text-muted-foreground">Loading…</div>
          ) : data?.listings.length ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.listings.map((l) => <ListingCard key={l.id} l={l} />)}
            </div>
          ) : (
            <div className="text-center py-20 text-muted-foreground">
              <p>No listings match your search.</p>
              <p className="mt-2 text-sm">Be the first — <a href="/auth" className="text-primary underline">create a listing</a>.</p>
            </div>
          )}
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
