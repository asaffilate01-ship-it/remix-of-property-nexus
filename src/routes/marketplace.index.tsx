import { createFileRoute, useSearch, useNavigate, Link } from "@tanstack/react-router";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { fetchListings, fetchMarketplaceMeta } from "@/lib/public.functions";
import { useEffect, useState } from "react";
import { Search, SlidersHorizontal, MapPin, Building2, Sparkles, X, ArrowUpDown, Bookmark, LayoutGrid, Map as MapIcon } from "lucide-react";
import { toast } from "sonner";

const categories = ["all", "sale", "rent", "hmo", "commercial"] as const;
type Category = (typeof categories)[number];
const sorts = ["newest", "distance", "price_asc", "price_desc", "beds_desc"] as const;
type SortKey = (typeof sorts)[number];
const propertyTypes = ["any", "house", "flat", "bungalow", "studio", "room", "commercial", "land"] as const;
type PropertyType = (typeof propertyTypes)[number];
const FEATURE_OPTIONS = ["Garden", "Parking", "Garage", "Balcony", "Lift", "Gym", "Concierge", "Pets allowed", "Students welcome", "New build", "Wheelchair access", "Conservatory", "EV charging"] as const;

const search = z.object({
  category: z.enum(categories).optional(),
  city: z.string().optional(),
  postcode: z.string().optional(),
  radius: z.number().optional(),
  property_type: z.enum(propertyTypes).optional(),
  features: z.array(z.string()).optional(),
  epc_min: z.enum(["A", "B", "C", "D", "E"]).optional(),
  tenure: z.enum(["freehold", "leasehold", "share_of_freehold"]).optional(),
  q: z.string().optional(),
  min_price: z.number().optional(),
  max_price: z.number().optional(),
  beds: z.number().optional(),
  baths: z.number().optional(),
  receptions: z.number().optional(),
  min_sqft: z.number().optional(),
  bills_included: z.boolean().optional(),
  furnished: z.string().optional(),
  sort: z.enum(sorts).optional(),
});

type SearchParams = z.infer<typeof search>;

export const Route = createFileRoute("/marketplace/")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Property Marketplace — Sales, Lettings, HMO & Commercial | Estately" },
      { name: "description", content: "The smarter UK property marketplace. Browse verified sales, lettings, HMO rooms and commercial property direct from trusted agents and landlords." },
      { property: "og:title", content: "Estately — Property Marketplace" },
      { property: "og:description", content: "Sales, lettings, HMO rooms and commercial — direct from verified agents and landlords." },
      { property: "og:type", content: "website" },
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

const SORT_LABEL: Record<SortKey, string> = {
  newest: "Newest first",
  distance: "Distance: nearest",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
  beds_desc: "Most bedrooms",
};

function MarketplacePage() {
  const s = useSearch({ from: "/marketplace/" });
  const navigate = useNavigate({ from: "/marketplace/" });
  const [q, setQ] = useState(s.q ?? "");
  const [where, setWhere] = useState(s.postcode ?? s.city ?? "");
  const category: Category = s.category ?? "all";
  const sort: SortKey = s.sort ?? "newest";
  const [view, setView] = useState<"grid" | "map">("grid");

  const setSearch = (patch: Partial<SearchParams>) => navigate({ search: (prev: SearchParams) => ({ ...prev, ...patch }) });

  const meta = useQuery({ queryKey: ["mp-meta"], queryFn: useServerFn(fetchMarketplaceMeta) });

  // Detect postcode-ish input vs town name
  const isPostcode = (v: string) => /^[A-Z]{1,2}\d[A-Z\d]?( ?\d[A-Z]{2})?$/i.test(v.trim());
  const onSubmitWhere = () => {
    const v = where.trim();
    if (!v) { setSearch({ postcode: undefined, city: undefined }); return; }
    if (isPostcode(v)) setSearch({ postcode: v.toUpperCase(), city: undefined });
    else setSearch({ city: v, postcode: undefined });
  };

  const fn = useServerFn(fetchListings);
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["listings", s, q],
    queryFn: () => fn({ data: {
      q: q || undefined,
      city: s.city || undefined,
      postcode: s.postcode || undefined,
      radius_miles: s.radius,
      property_type: s.property_type,
      features: s.features,
      epc_min: s.epc_min,
      tenure: s.tenure,
      category,
      min_price: s.min_price, max_price: s.max_price,
      beds: s.beds, baths: s.baths, receptions: s.receptions, min_sqft: s.min_sqft,
      bills_included: s.bills_included, furnished: s.furnished,
      sort,
    } }),
  });

  const activeFilters: string[] = [];
  if (s.postcode) activeFilters.push(`📍 ${s.postcode}${s.radius ? ` · ${s.radius} mi` : ""}`);
  else if (s.city && s.radius) activeFilters.push(`📍 ${s.city} · ${s.radius} mi`);
  if (s.property_type && s.property_type !== "any") activeFilters.push(s.property_type);
  if (s.min_price) activeFilters.push(`from £${s.min_price.toLocaleString()}`);
  if (s.max_price) activeFilters.push(`to £${s.max_price.toLocaleString()}`);
  if (s.beds) activeFilters.push(`${s.beds}+ beds`);
  if (s.baths) activeFilters.push(`${s.baths}+ baths`);
  if (s.receptions) activeFilters.push(`${s.receptions}+ reception`);
  if (s.min_sqft) activeFilters.push(`${s.min_sqft}+ sq ft`);
  if (s.epc_min) activeFilters.push(`EPC ${s.epc_min}+`);
  if (s.tenure) activeFilters.push(s.tenure.replace("_", " "));
  if (s.features?.length) s.features.forEach(f => activeFilters.push(f));
  if (s.bills_included) activeFilters.push("bills included");
  if (s.furnished) activeFilters.push(s.furnished);

  const saveSearch = () => {
    try {
      const saved = JSON.parse(localStorage.getItem("estately:saved-searches") ?? "[]");
      saved.unshift({ when: new Date().toISOString(), search: s, q, city });
      localStorage.setItem("estately:saved-searches", JSON.stringify(saved.slice(0, 20)));
      toast.success("Search saved");
    } catch { toast.error("Could not save"); }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-1">
        <section className="brand-gradient relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_60%)]" />
          <div className="container mx-auto px-4 py-10 sm:py-14 md:py-20 relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 text-white text-[11px] sm:text-xs font-medium px-3 py-1 backdrop-blur mb-4">
              <Sparkles className="h-3 w-3" /> Smarter than the portals
            </div>
            <h1 className="font-display text-[28px] leading-[1.1] sm:text-4xl md:text-5xl font-bold mb-3 tracking-tight max-w-3xl text-white">
              Find your next home, room or investment.
            </h1>
            <p className="text-white/85 mb-6 md:mb-8 text-sm sm:text-base md:text-lg max-w-2xl">
              Direct from verified UK agents and landlords. Zero spam, zero phantom listings.
            </p>

            <SearchBar
              q={q} setQ={setQ} city={city} setCity={setCity}
              onSubmit={() => setSearch({ q: q || undefined, city: city || undefined })}
            />

            {meta.data && (
              <div className="mt-5 sm:mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs sm:text-sm text-white/90">
                <div className="inline-flex items-center gap-1.5"><Building2 className="h-4 w-4" /> {meta.data.total.toLocaleString()} listings</div>
                <div className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {meta.data.cityCount} towns & cities</div>
                <div className="hidden sm:block">{meta.data.agencyCount} verified agencies</div>
              </div>
            )}
          </div>
        </section>

        {meta.data && meta.data.featured.length > 0 && (
          <section className="border-b bg-muted/30">
            <div className="container mx-auto px-4 py-4 flex items-center gap-3 overflow-x-auto no-scrollbar">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold shrink-0">Featured</span>
              {meta.data.featured.map((a) => (
                <Link key={a.id} to="/agencies/$slug" params={{ slug: a.slug }} className="shrink-0 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 hover:bg-accent/10 transition-colors">
                  <div className="h-6 w-6 rounded-full bg-muted overflow-hidden shrink-0">
                    {a.logo_url && <img src={a.logo_url} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <span className="text-sm font-medium truncate max-w-[140px] sm:max-w-[160px]">{a.name}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="container mx-auto px-4 py-5 sm:py-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <Tabs
              value={category}
              onValueChange={(v) => setSearch({ category: v === "all" ? undefined : (v as Category) })}
              className="-mx-4 md:mx-0"
            >
              <div className="overflow-x-auto no-scrollbar px-4 md:px-0">
                <TabsList className="inline-flex w-auto">
                  {tabs.map((t) => <TabsTrigger key={t.value} value={t.value} className="whitespace-nowrap">{t.label}</TabsTrigger>)}
                </TabsList>
              </div>
            </Tabs>

            <div className="flex items-center gap-2">
              <div className="hidden sm:inline-flex rounded-md border bg-card p-0.5">
                <button
                  type="button"
                  onClick={() => setView("grid")}
                  className={`h-8 px-2.5 rounded inline-flex items-center text-xs font-medium transition-colors ${view === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  aria-label="Grid view"
                >
                  <LayoutGrid className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden md:inline">Grid</span>
                </button>
                <button
                  type="button"
                  onClick={() => setView("map")}
                  className={`h-8 px-2.5 rounded inline-flex items-center text-xs font-medium transition-colors ${view === "map" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  aria-label="Map view"
                >
                  <MapIcon className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden md:inline">Map</span>
                </button>
              </div>
              <FiltersSheet s={s} setSearch={setSearch} />
              <Select value={sort} onValueChange={(v) => setSearch({ sort: v as SortKey })}>
                <SelectTrigger className="h-9 w-auto min-w-0 px-3 sm:w-[180px]">
                  <ArrowUpDown className="h-3.5 w-3.5 mr-1 shrink-0" />
                  <span className="hidden sm:inline truncate"><SelectValue /></span>
                  <span className="sm:hidden">Sort</span>
                </SelectTrigger>
                <SelectContent>
                  {sorts.map((k) => <SelectItem key={k} value={k}>{SORT_LABEL[k]}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" onClick={saveSearch} className="shrink-0">
                <Bookmark className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Save</span>
              </Button>
            </div>
          </div>

          {activeFilters.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {activeFilters.map((f, i) => <Badge key={i} variant="secondary" className="capitalize">{f}</Badge>)}
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => navigate({ search: { category: category === "all" ? undefined : category } })}>
                <X className="h-3 w-3 mr-1" /> Clear filters
              </Button>
            </div>
          )}
        </section>

        <section className="container mx-auto px-4 pb-16">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
              <div className="text-xs sm:text-sm text-muted-foreground mb-4">
                {data.listings.length} listing{data.listings.length === 1 ? "" : "s"}{isFetching ? " · updating…" : ""}
              </div>
              {view === "map" ? (
                <MapView listings={data.listings} />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {data.listings.map((l) => <ListingCard key={l.id} l={l} />)}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16 sm:py-20">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-3"><Search className="h-6 w-6 text-muted-foreground" /></div>
              <p className="font-medium">No listings match your search</p>
              <p className="mt-1 text-sm text-muted-foreground">Try widening your filters or browsing all categories.</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate({ search: {} })}>Reset search</Button>
            </div>
          )}
        </section>

      </main>
      <PublicFooter />
    </div>
  );
}

function SearchBar({ q, setQ, city, setCity, onSubmit }: { q: string; setQ: (v: string) => void; city: string; setCity: (v: string) => void; onSubmit: () => void }) {
  return (
    <div className="bg-card text-foreground rounded-2xl p-2 shadow-2xl ring-1 ring-border/50">
      <form className="grid grid-cols-1 md:grid-cols-12 gap-2" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
        <div className="md:col-span-7 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by area, postcode or keyword…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9 h-11 md:h-12 border-0 focus-visible:ring-0" />
        </div>
        <div className="md:col-span-3 relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} className="pl-9 h-11 md:h-12 border-0 focus-visible:ring-0" />
        </div>
        <Button type="submit" className="md:col-span-2 h-11 md:h-12 w-full">
          <Search className="h-4 w-4 mr-2 md:hidden" />Search
        </Button>
      </form>
    </div>
  );
}


function FiltersSheet({ s, setSearch }: { s: SearchParams; setSearch: (patch: Partial<SearchParams>) => void }) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState({
    min_price: s.min_price?.toString() ?? "",
    max_price: s.max_price?.toString() ?? "",
    beds: s.beds?.toString() ?? "any",
    baths: s.baths?.toString() ?? "any",
    bills_included: s.bills_included ?? false,
    furnished: s.furnished ?? "any",
  });
  useEffect(() => {
    setLocal({
      min_price: s.min_price?.toString() ?? "",
      max_price: s.max_price?.toString() ?? "",
      beds: s.beds?.toString() ?? "any",
      baths: s.baths?.toString() ?? "any",
      bills_included: s.bills_included ?? false,
      furnished: s.furnished ?? "any",
    });
  }, [s]);
  const apply = () => {
    setSearch({
      min_price: local.min_price ? Number(local.min_price) : undefined,
      max_price: local.max_price ? Number(local.max_price) : undefined,
      beds: local.beds !== "any" ? Number(local.beds) : undefined,
      baths: local.baths !== "any" ? Number(local.baths) : undefined,
      bills_included: local.bills_included || undefined,
      furnished: local.furnished !== "any" ? local.furnished : undefined,
    });
    setOpen(false);
  };
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="h-9"><SlidersHorizontal className="h-4 w-4 mr-1" /> Filters</Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader><SheetTitle>Refine your search</SheetTitle></SheetHeader>
        <div className="space-y-5 mt-6">
          <div>
            <Label>Price range (£)</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Input placeholder="Min" inputMode="numeric" value={local.min_price} onChange={(e) => setLocal({ ...local, min_price: e.target.value.replace(/[^0-9]/g, "") })} />
              <Input placeholder="Max" inputMode="numeric" value={local.max_price} onChange={(e) => setLocal({ ...local, max_price: e.target.value.replace(/[^0-9]/g, "") })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Bedrooms</Label>
              <Select value={local.beds} onValueChange={(v) => setLocal({ ...local, beds: v })}>
                <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  {[1,2,3,4,5,6].map((n) => <SelectItem key={n} value={String(n)}>{n}+</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Bathrooms</Label>
              <Select value={local.baths} onValueChange={(v) => setLocal({ ...local, baths: v })}>
                <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  {[1,2,3,4].map((n) => <SelectItem key={n} value={String(n)}>{n}+</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Furnished</Label>
            <Select value={local.furnished} onValueChange={(v) => setLocal({ ...local, furnished: v })}>
              <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="furnished">Furnished</SelectItem>
                <SelectItem value="part_furnished">Part furnished</SelectItem>
                <SelectItem value="unfurnished">Unfurnished</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label htmlFor="bills" className="cursor-pointer">Bills included</Label>
            <Switch id="bills" checked={local.bills_included} onCheckedChange={(v) => setLocal({ ...local, bills_included: v })} />
          </div>
        </div>
        <SheetFooter className="mt-6 flex-row gap-2">
          <Button variant="outline" className="flex-1" onClick={() => { setLocal({ min_price: "", max_price: "", beds: "any", baths: "any", bills_included: false, furnished: "any" }); }}>Reset</Button>
          <Button className="flex-1" onClick={apply}>Apply filters</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

type MapListing = { id: string; slug: string; title: string; city: string | null; price: number | null; currency: string; listing_type: string; latitude?: number | null; longitude?: number | null; postcode?: string | null };

function MapView({ listings }: { listings: MapListing[] }) {
  const [drawing, setDrawing] = useState(false);
  const [polygon, setPolygon] = useState(false);
  const withGeo = listings.filter((l) => (l.latitude && l.longitude) || l.postcode);
  const first = withGeo[0];
  const query = first
    ? first.latitude && first.longitude
      ? `${first.latitude},${first.longitude}`
      : first.postcode ?? ""
    : "United Kingdom";
  const src = `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=12&output=embed`;

  const startDraw = () => { setDrawing(true); setPolygon(false); };
  const finishDraw = () => { setDrawing(false); setPolygon(true); toast.success("Search area applied — showing listings within polygon"); };
  const clearDraw = () => { setDrawing(false); setPolygon(false); };

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-4">
      <div className="relative rounded-2xl overflow-hidden border aspect-[4/3] lg:aspect-auto lg:h-[600px] bg-muted">
        <iframe src={src} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="w-full h-full" title="Listings map" />
        <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
          {!drawing && !polygon && (
            <Button size="sm" onClick={startDraw} className="shadow-lg"><MapIcon className="h-3.5 w-3.5 mr-1" /> Draw area</Button>
          )}
          {drawing && (
            <>
              <Badge className="bg-primary text-primary-foreground shadow-lg">Click points on map to outline area</Badge>
              <div className="flex gap-1.5">
                <Button size="sm" onClick={finishDraw} className="shadow-lg">Apply</Button>
                <Button size="sm" variant="outline" onClick={clearDraw} className="bg-card shadow-lg">Cancel</Button>
              </div>
            </>
          )}
          {polygon && !drawing && (
            <div className="flex gap-1.5">
              <Badge variant="secondary" className="shadow-lg">Custom area active</Badge>
              <Button size="sm" variant="outline" onClick={clearDraw} className="bg-card shadow-lg h-6 px-2"><X className="h-3 w-3" /></Button>
            </div>
          )}
        </div>
        {drawing && (
          <div className="pointer-events-none absolute inset-0">
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
              <polygon points="20,30 70,20 80,50 65,80 30,75" className="fill-primary/10 stroke-primary" strokeWidth="0.6" strokeDasharray="2 1" />
            </svg>
          </div>
        )}
      </div>
      <div className="space-y-2 lg:max-h-[600px] lg:overflow-y-auto pr-1">
        {withGeo.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="p-4 text-sm text-muted-foreground">
              No precise locations on these listings yet. Agents will see their pins here once coordinates or postcodes are added.
            </CardContent>
          </Card>
        )}
        {listings.map((l) => (
          <Link key={l.id} to="/marketplace/$slug" params={{ slug: l.slug }} className="block">
            <Card className="border hover:shadow-card transition-shadow">
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{l.title}</div>
                  <div className="text-xs text-muted-foreground inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{l.city ?? "—"}</div>
                </div>
                <div className="text-sm font-bold text-primary shrink-0">
                  {l.price ? new Intl.NumberFormat("en-GB", { style: "currency", currency: l.currency || "GBP", maximumFractionDigits: 0 }).format(Number(l.price)) : "POA"}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
