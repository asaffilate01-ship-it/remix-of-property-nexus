import { createFileRoute, useSearch } from "@tanstack/react-router";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { ListingCard } from "@/components/ListingCard";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { fetchListings } from "@/lib/public.functions";
import { useState } from "react";
import { Search } from "lucide-react";

const search = z.object({
  type: z.enum(["all", "sale", "rent", "room"]).optional(),
  city: z.string().optional(),
  q: z.string().optional(),
});

export const Route = createFileRoute("/marketplace/")({
  validateSearch: search,
  head: () => ({ meta: [{ title: "Marketplace — HMOFlow" }, { name: "description", content: "Rooms, lettings and homes for sale from HMOFlow agents and landlords." }] }),
  component: MarketplacePage,
});

function MarketplacePage() {
  const s = useSearch({ from: "/marketplace/" });
  const [q, setQ] = useState(s.q ?? "");
  const [city, setCity] = useState(s.city ?? "");
  const [type, setType] = useState<"all" | "sale" | "rent" | "room">(s.type ?? "all");

  const fn = useServerFn(fetchListings);
  const { data, isLoading } = useQuery({
    queryKey: ["listings", { q, city, type }],
    queryFn: () => fn({ data: { q: q || undefined, city: city || undefined, type } }),
  });

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-1">
        <section className="brand-gradient text-white">
          <div className="container mx-auto px-4 py-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-6">Find your next place</h1>
            <div className="bg-card text-foreground rounded-2xl p-4 grid md:grid-cols-12 gap-3 shadow-card">
              <div className="md:col-span-5 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by title…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
              </div>
              <div className="md:col-span-4">
                <Input placeholder="City / postcode" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div className="md:col-span-3">
                <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="sale">For sale</SelectItem>
                    <SelectItem value="rent">To let</SelectItem>
                    <SelectItem value="room">HMO rooms</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-10">
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
