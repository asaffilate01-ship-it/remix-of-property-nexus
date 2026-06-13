import { createFileRoute, useSearch, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { ListingCard } from "@/components/ListingCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { fetchListings } from "@/lib/public.functions";
import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";

const categories = ["all", "sale", "rent", "hmo", "commercial"] as const;
type Category = (typeof categories)[number];

const search = z.object({
  category: z.enum(categories).optional(),
  city: z.string().optional(),
  q: z.string().optional(),
  min_price: z.number().optional(),
  max_price: z.number().optional(),
  beds: z.number().optional(),
});

export const Route = createFileRoute("/marketplace/")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Property Marketplace — Homes, Lets, Rooms & Commercial" },
      { name: "description", content: "Browse residential sales, lettings, HMO rooms and commercial property from verified UK agents and landlords." },
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
  const [minPrice, setMinPrice] = useState(s.min_price?.toString() ?? "");
  const [maxPrice, setMaxPrice] = useState(s.max_price?.toString() ?? "");
  const [beds, setBeds] = useState(s.beds?.toString() ?? "");
  const category: Category = s.category ?? "all";

  const fn = useServerFn(fetchListings);
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["listings", { q, city, category, minPrice, maxPrice, beds }],
    queryFn: () => fn({ data: {
      q: q || undefined,
      city: city || undefined,
      category,
      min_price: minPrice ? Number(minPrice) : undefined,
      max_price: maxPrice ? Number(maxPrice) : undefined,
      beds: beds ? Number(beds) : undefined,
    } }),
  });

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-1">
        <section className="brand-gradient text-white relative overflow-hidden">
          <div className="container mx-auto px-4 py-12 md:py-16 relative">
            <h1 className="text-3xl md:text-5xl font-bold mb-3 tracking-tight max-w-3xl">Find property that fits.</h1>
            <p className="text-white/80 mb-6 md:mb-8 text-base md:text-lg max-w-2xl">Sales, lettings, HMO rooms and commercial — from verified agents and landlords across the UK.</p>

            <div className="bg-card text-foreground rounded-2xl p-3 md:p-4 shadow-2xl ring-1 ring-border/50 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-6 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search by title or keyword…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9 h-11" />
                </div>
                <div className="md:col-span-4">
                  <Input placeholder="City or postcode" value={city} onChange={(e) => setCity(e.target.value)} className="h-11" />
                </div>
                <div className="md:col-span-2">
                  <Select value={beds || "any"} onValueChange={(v) => setBeds(v === "any" ? "" : v)}>
                    <SelectTrigger className="h-11"><SelectValue placeholder="Beds" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any beds</SelectItem>
                      {[1,2,3,4,5].map((n) => <SelectItem key={n} value={String(n)}>{n}+ beds</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-12 gap-3 items-center">
                <div className="md:col-span-3"><Input placeholder="Min price" inputMode="numeric" value={minPrice} onChange={(e) => setMinPrice(e.target.value.replace(/[^0-9]/g, ""))} /></div>
                <div className="md:col-span-3"><Input placeholder="Max price" inputMode="numeric" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value.replace(/[^0-9]/g, ""))} /></div>
                <div className="md:col-span-6 flex items-center justify-between gap-2 col-span-2">
                  <div className="text-xs text-muted-foreground inline-flex items-center gap-1.5"><SlidersHorizontal className="h-3.5 w-3.5" />Filters apply instantly</div>
                  <Button variant="ghost" size="sm" onClick={() => { setQ(""); setCity(""); setMinPrice(""); setMaxPrice(""); setBeds(""); }}>Reset</Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-6">
          <Tabs
            value={category}
            onValueChange={(v) => navigate({ search: (prev) => ({ ...prev, category: v === "all" ? undefined : (v as Category) }) })}
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
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="border-0 shadow-card overflow-hidden animate-pulse">
                  <div className="aspect-[4/3] bg-muted" />
                  <CardContent className="p-4 space-y-2">
                    <div className="h-5 w-24 bg-muted rounded" />
                    <div className="h-4 w-3/4 bg-muted rounded" />
                    <div className="h-3 w-1/2 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : data?.listings.length ? (
            <>
              <div className="text-sm text-muted-foreground mb-4">
                {data.listings.length} listing{data.listings.length === 1 ? "" : "s"}{isFetching ? " · updating…" : ""}
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.listings.map((l) => <ListingCard key={l.id} l={l} />)}
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-muted-foreground">
              <p>No listings match your search.</p>
              <p className="mt-2 text-sm">Try widening your filters or <a href="/auth" className="text-primary underline">list a property</a>.</p>
            </div>
          )}
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
