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

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { fetchListings, fetchMarketplaceMeta } from "@/lib/public.functions";
import { saveSearch as saveSearchRemoteFn } from "@/lib/saved-searches.functions";
import { supabase } from "@/integrations/supabase/client";
import { useCallback, useEffect, useState } from "react";
import {
  Search,
  SlidersHorizontal,
  MapPin,
  Building2,
  Sparkles,
  X,
  ArrowUpDown,
  Bookmark,
  LayoutGrid,
  Map as MapIcon,
  ChevronRight,
  Columns2,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  GoogleListingsMap,
  type MapBounds,
  type MapPoint,
} from "@/components/GoogleListingsMap";
import { aiParseSearch, type AiSearchFilters } from "@/lib/ai-search.functions";
import { toast } from "sonner";

const categories = ["all", "sale", "rent", "hmo", "commercial"] as const;
type Category = (typeof categories)[number];
const sorts = ["newest", "distance", "price_asc", "price_desc", "beds_desc"] as const;
type SortKey = (typeof sorts)[number];
const propertyTypes = [
  "any",
  "house",
  "flat",
  "bungalow",
  "studio",
  "room",
  "commercial",
  "land",
] as const;
type PropertyType = (typeof propertyTypes)[number];
const FEATURE_OPTIONS = [
  "Garden",
  "Parking",
  "Garage",
  "Balcony",
  "Lift",
  "Gym",
  "Concierge",
  "Pets allowed",
  "Students welcome",
  "New build",
  "Wheelchair access",
  "Conservatory",
  "EV charging",
] as const;

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
  available_from: z.string().optional(),
  sort: z.enum(sorts).optional(),
});

type SearchParams = z.infer<typeof search>;

export const Route = createFileRoute("/marketplace/")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Property Marketplace — Sales, Lettings, HMO & Commercial | Gabley" },
      {
        name: "description",
        content:
          "The smarter UK property marketplace. Browse verified sales, lettings, HMO rooms and commercial property direct from trusted agents and landlords.",
      },
      { property: "og:title", content: "Gabley — Property Marketplace" },
      {
        property: "og:description",
        content:
          "Sales, lettings, HMO rooms and commercial — direct from verified agents and landlords.",
      },
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
  const isMobile = useIsMobile();
  const [view, setView] = useState<"grid" | "map" | "split">("grid");
  useEffect(() => {
    setView(isMobile ? "grid" : "split");
  }, [isMobile]);

  const setSearch = (patch: Partial<SearchParams>) =>
    navigate({ search: (prev: SearchParams) => ({ ...prev, ...patch }) });

  const meta = useQuery({ queryKey: ["mp-meta"], queryFn: useServerFn(fetchMarketplaceMeta) });

  // Detect postcode-ish input vs town name
  const isPostcode = (v: string) => /^[A-Z]{1,2}\d[A-Z\d]?( ?\d[A-Z]{2})?$/i.test(v.trim());
  const onSubmitWhere = () => {
    const v = where.trim();
    if (!v) {
      setSearch({ postcode: undefined, city: undefined });
      return;
    }
    if (isPostcode(v)) setSearch({ postcode: v.toUpperCase(), city: undefined });
    else setSearch({ city: v, postcode: undefined });
  };

  // Map-driven refinements (viewport + draw-a-search)
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [bbox, setBbox] = useState<MapBounds | null>(null);
  const [polygon, setPolygon] = useState<MapPoint[] | null>(null);
  const controls: MapControls = {
    hoverId,
    setHoverId,
    polygon,
    setPolygon: (p) => {
      setPolygon(p);
      if (p) {
        setBbox(null);
        toast.success("Custom map area applied");
      }
    },
    onSearchArea: (b) => {
      setPolygon(null);
      setBbox(b);
    },
  };

  const fn = useServerFn(fetchListings);
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["listings", s, q, bbox, polygon],
    queryFn: () =>
      fn({
        data: {
          bbox: bbox ?? undefined,
          polygon: polygon ?? undefined,
          q: q || undefined,
          city: s.city || undefined,
          postcode: s.postcode || undefined,
          radius_miles: s.radius,
          property_type: s.property_type,
          features: s.features,
          epc_min: s.epc_min,
          tenure: s.tenure,
          category,
          min_price: s.min_price,
          max_price: s.max_price,
          beds: s.beds,
          baths: s.baths,
          receptions: s.receptions,
          min_sqft: s.min_sqft,
          bills_included: s.bills_included,
          furnished: s.furnished,
          available_from: s.available_from,
          sort,
        },
      }),
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
  if (s.features?.length) s.features.forEach((f: string) => activeFilters.push(f));
  if (s.bills_included) activeFilters.push("bills included");
  if (s.furnished) activeFilters.push(s.furnished);
  if (s.available_from)
    activeFilters.push(`from ${new Date(s.available_from).toLocaleDateString("en-GB")}`);

  const saveSearchRemote = useServerFn(saveSearchRemoteFn);
  const saveSearch = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await saveSearchRemote({
          data: {
            name: q || where || undefined,
            criteria: { ...s, q, city: where || s.city } as Record<string, unknown>,
            alert_email: true,
            alert_push: false,
            frequency: "daily",
          },
        });
        toast.success("Search saved to your account");
        return;
      }
    } catch {
      /* fall through to local */
    }
    try {
      const saved = JSON.parse(localStorage.getItem("gabley:saved-searches") ?? "[]");
      saved.unshift({ when: new Date().toISOString(), search: s, q, where });
      localStorage.setItem("gabley:saved-searches", JSON.stringify(saved.slice(0, 20)));
      toast.success("Search saved on this device — sign in to sync");
    } catch {
      toast.error("Could not save");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-1">
        <section className="brand-gradient relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_60%)]" />
          <div className="container mx-auto px-4 py-8 sm:py-12 md:py-16 relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 text-white text-[11px] sm:text-xs font-medium px-3 py-1 backdrop-blur mb-4">
              <Sparkles className="h-3 w-3" /> Smarter than the portals
            </div>
            <h1 className="font-display text-[26px] leading-[1.1] sm:text-4xl md:text-5xl font-bold mb-2 tracking-tight max-w-3xl text-white">
              Find your next home, room or investment.
            </h1>
            <p className="text-white/85 mb-5 md:mb-6 text-sm sm:text-base md:text-lg max-w-2xl">
              Direct from verified UK agents and landlords. Zero spam, zero phantom listings.
            </p>

            {/* Bayut-style purpose pills */}
            <div className="inline-flex rounded-full bg-white/15 backdrop-blur p-1 mb-3 ring-1 ring-white/20">
              {tabs.map((t) => {
                const active = category === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() =>
                      setSearch({ category: t.value === "all" ? undefined : (t.value as Category) })
                    }
                    className={`px-3 sm:px-4 h-9 text-xs sm:text-sm font-semibold rounded-full transition-colors ${active ? "bg-white text-primary shadow-sm" : "text-white/90 hover:text-white"}`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            <SearchBar
              q={q}
              setQ={setQ}
              where={where}
              setWhere={setWhere}
              radius={s.radius ?? 0}
              setRadius={(r) => setSearch({ radius: r || undefined })}
              onSubmit={() => {
                setSearch({ q: q || undefined });
                onSubmitWhere();
              }}
            />

            <AiSearchBar
              onApply={(filters, summary) => {
                if (filters.city) setWhere(filters.city);
                else if (filters.postcode) setWhere(filters.postcode);
                if (filters.q !== undefined) setQ(filters.q ?? "");
                setBbox(null);
                setPolygon(null);
                navigate({
                  search: {
                    category: filters.category,
                    city: filters.city,
                    postcode: filters.postcode,
                    property_type: filters.property_type,
                    min_price: filters.min_price,
                    max_price: filters.max_price,
                    beds: filters.beds,
                    baths: filters.baths,
                    features: filters.features,
                    furnished: filters.furnished,
                    bills_included: filters.bills_included,
                    radius: filters.radius,
                    q: filters.q,
                  },
                });
                toast.success(summary);
              }}
            />

            {/* Quick chips: property type + beds */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] uppercase tracking-wide text-white/70 font-semibold mr-1">
                Type
              </span>
              {(["any", "house", "flat", "studio", "room", "commercial"] as PropertyType[]).map(
                (t) => {
                  const active = (s.property_type ?? "any") === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSearch({ property_type: t === "any" ? undefined : t })}
                      className={`h-7 px-2.5 rounded-full text-[11px] sm:text-xs font-medium capitalize border transition-colors ${active ? "bg-white text-primary border-white" : "bg-white/10 text-white border-white/30 hover:bg-white/20"}`}
                    >
                      {t === "any" ? "Any" : t}
                    </button>
                  );
                },
              )}
              <span className="text-[11px] uppercase tracking-wide text-white/70 font-semibold ml-2 mr-1">
                Beds
              </span>
              {[0, 1, 2, 3, 4, 5].map((n) => {
                const active = (s.beds ?? 0) === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setSearch({ beds: n === 0 ? undefined : n })}
                    className={`h-7 min-w-[2rem] px-2 rounded-full text-[11px] sm:text-xs font-semibold border transition-colors ${active ? "bg-white text-primary border-white" : "bg-white/10 text-white border-white/30 hover:bg-white/20"}`}
                  >
                    {n === 0 ? "Any" : `${n}+`}
                  </button>
                );
              })}
            </div>

            {data?.centroid && s.radius ? (
              <div className="mt-3 text-xs text-white/80">
                Showing properties within {s.radius} miles of <strong>{data.centroid.label}</strong>
              </div>
            ) : null}

            {meta.data && (
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs sm:text-sm text-white/90">
                <div className="inline-flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" /> {meta.data.total.toLocaleString()} listings
                </div>
                <div className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" /> {meta.data.cityCount} towns & cities
                </div>
                <div className="hidden sm:block">{meta.data.agencyCount} verified agencies</div>
              </div>
            )}
          </div>
        </section>

        {meta.data && meta.data.featured.length > 0 && (
          <section className="border-b bg-muted/30">
            <div className="container mx-auto px-4 py-4 flex items-center gap-3 overflow-x-auto no-scrollbar">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold shrink-0">
                Featured
              </span>
              {meta.data.featured.map((a) => (
                <Link
                  key={a.id}
                  to="/agencies/$slug"
                  params={{ slug: a.slug }}
                  className="shrink-0 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 hover:bg-accent/10 transition-colors"
                >
                  <div className="h-6 w-6 rounded-full bg-muted overflow-hidden shrink-0">
                    {a.logo_url && (
                      <img src={a.logo_url} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <span className="text-sm font-medium truncate max-w-[140px] sm:max-w-[160px]">
                    {a.name}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Popular areas — Bayut-style recommended carousel */}
        {meta.data &&
          meta.data.topCities &&
          meta.data.topCities.length > 0 &&
          !s.city &&
          !s.postcode && (
            <section className="container mx-auto px-4 pt-6 sm:pt-8">
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="font-display text-lg sm:text-xl font-semibold tracking-tight">
                  Popular areas in the UK
                </h2>
                <Link
                  to="/area-guides"
                  className="text-xs sm:text-sm text-primary inline-flex items-center gap-1 hover:underline"
                >
                  All areas <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 pb-2 snap-x snap-mandatory">
                {meta.data.topCities.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => {
                      setWhere(c.name);
                      setSearch({ city: c.name, postcode: undefined });
                    }}
                    className="snap-start group relative shrink-0 w-[180px] sm:w-[220px] aspect-[4/3] rounded-2xl overflow-hidden border bg-muted text-left hover:shadow-xl transition-all"
                  >
                    {c.cover ? (
                      <img
                        src={c.cover}
                        alt={c.name}
                        className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="absolute inset-0 brand-gradient opacity-40" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 inset-x-0 p-3 text-white">
                      <div className="font-display font-semibold text-base sm:text-lg leading-tight">
                        {c.name}
                      </div>
                      <div className="text-[11px] sm:text-xs opacity-90">
                        {c.count} listing{c.count === 1 ? "" : "s"}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

        <section className="container mx-auto px-4 py-5 sm:py-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-xs sm:text-sm text-muted-foreground">
              {data?.listings.length ?? 0} listing{(data?.listings.length ?? 0) === 1 ? "" : "s"}
              {isFetching ? " · updating…" : ""}
              {(s.city || s.postcode) && (
                <span className="ml-1">
                  in <strong className="text-foreground">{s.postcode ?? s.city}</strong>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden sm:inline-flex rounded-md border bg-card p-0.5">
                {(
                  [
                    { v: "grid", label: "Grid", icon: LayoutGrid },
                    { v: "split", label: "Split", icon: Columns2 },
                    { v: "map", label: "Map", icon: MapIcon },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => setView(opt.v)}
                    className={`h-8 px-2.5 rounded inline-flex items-center text-xs font-medium transition-colors ${view === opt.v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    aria-label={`${opt.label} view`}
                  >
                    <opt.icon className="h-3.5 w-3.5 sm:mr-1" />
                    <span className="hidden lg:inline">{opt.label}</span>
                  </button>
                ))}
              </div>
              <FiltersSheet s={s} setSearch={setSearch} category={category} />
              <Select value={sort} onValueChange={(v) => setSearch({ sort: v as SortKey })}>
                <SelectTrigger className="h-9 w-auto min-w-0 px-3 sm:w-[180px]">
                  <ArrowUpDown className="h-3.5 w-3.5 mr-1 shrink-0" />
                  <span className="hidden sm:inline truncate">
                    <SelectValue />
                  </span>
                  <span className="sm:hidden">Sort</span>
                </SelectTrigger>
                <SelectContent>
                  {sorts.map((k) => (
                    <SelectItem key={k} value={k}>
                      {SORT_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" onClick={saveSearch} className="shrink-0">
                <Bookmark className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Save</span>
              </Button>
            </div>
          </div>

          {(activeFilters.length > 0 || bbox || polygon) && (
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {activeFilters.map((f, i) => (
                <Badge key={i} variant="secondary" className="capitalize">
                  {f}
                </Badge>
              ))}
              {bbox && <Badge variant="secondary">map area</Badge>}
              {polygon && <Badge variant="secondary">drawn area</Badge>}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setBbox(null);
                  setPolygon(null);
                  navigate({ search: { category: category === "all" ? undefined : category } });
                }}
              >
                <X className="h-3 w-3 mr-1" /> Clear filters
              </Button>
            </div>
          )}
        </section>

        <section className={view === "split" ? "px-4 pb-16" : "container mx-auto px-4 pb-16"}>
          {isLoading ? (
            <div className="container mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
            view === "map" ? (
              <div className="container mx-auto">
                <MapView listings={data.listings} controls={controls} />
              </div>
            ) : view === "split" ? (
              <SplitView listings={data.listings} controls={controls} />
            ) : (
              <div className="container mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {data.listings.map((l) => (
                  <ListingCard key={l.id} l={l} />
                ))}
              </div>
            )
          ) : (
            <div className="text-center py-16 sm:py-20">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
                <Search className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-medium">No listings match your search</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try widening your filters or browsing all categories.
              </p>
              <Button variant="outline" className="mt-4" onClick={() => navigate({ search: {} })}>
                Reset search
              </Button>
            </div>
          )}
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}

function SplitView({ listings, controls }: { listings: MapListing[]; controls: MapControls }) {
  return (
    <div className="mx-auto max-w-[1600px] grid lg:grid-cols-[minmax(0,1fr)_minmax(420px,46%)] gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:max-h-[calc(100vh-180px)] lg:overflow-y-auto pr-1">
        {listings.map((l) => (
          <div
            key={l.id}
            onMouseEnter={() => controls.setHoverId(l.id)}
            onMouseLeave={() => controls.setHoverId(null)}
            className={`rounded-xl transition-shadow ${controls.hoverId === l.id ? "ring-2 ring-accent" : ""}`}
          >
            <ListingCard l={l as never} />
          </div>
        ))}
      </div>
      <div className="hidden lg:block lg:sticky lg:top-20 lg:self-start lg:h-[calc(100vh-180px)] rounded-2xl overflow-hidden border bg-muted">
        <GoogleListingsMap
          listings={listings}
          activeId={controls.hoverId}
          onHoverListing={controls.setHoverId}
          onSearchArea={controls.onSearchArea}
          polygon={controls.polygon}
          onPolygonChange={controls.setPolygon}
        />
      </div>
    </div>
  );
}

const AI_EXAMPLES = [
  "2 bed flat in Manchester under £1,200 with parking",
  "Family house to buy near Leeds, 4 beds, garden, under £450k",
  "HMO room in Birmingham with bills included",
];

function AiSearchBar({
  onApply,
}: {
  onApply: (filters: AiSearchFilters, summary: string) => void;
}) {
  const parse = useServerFn(aiParseSearch);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (text: string) => {
    const query = text.trim();
    if (query.length < 3 || busy) return;
    setBusy(true);
    try {
      const res = await parse({ data: { query } });
      onApply(res.filters, res.summary);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI search failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(value);
        }}
        className="flex items-center gap-2 rounded-2xl bg-white/12 p-1.5 ring-1 ring-white/25 backdrop-blur"
      >
        <Sparkles className="ml-2 h-4 w-4 shrink-0 text-white/80" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Describe your ideal home — AI will set the filters"
          aria-label="AI property search"
          className="h-10 min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/60 focus:outline-none"
        />
        <Button type="submit" size="sm" disabled={busy} className="h-9 shrink-0">
          {busy ? "Thinking…" : "Ask AI"}
        </Button>
      </form>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {AI_EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => {
              setValue(ex);
              void run(ex);
            }}
            className="rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-[11px] text-white/85 transition-colors hover:bg-white/20"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}

function SearchBar({
  q,
  setQ,
  where,
  setWhere,
  radius,
  setRadius,
  onSubmit,
}: {
  q: string;
  setQ: (v: string) => void;
  where: string;
  setWhere: (v: string) => void;
  radius: number;
  setRadius: (r: number) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="bg-card text-foreground rounded-2xl p-2 shadow-2xl ring-1 ring-border/50">
      <form
        className="grid grid-cols-1 md:grid-cols-12 gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <div className="md:col-span-5 relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Postcode or town (e.g. SW1A 1AA, Manchester)"
            value={where}
            onChange={(e) => setWhere(e.target.value)}
            className="pl-9 h-11 md:h-12 border-0 focus-visible:ring-0"
            autoComplete="postal-code"
          />
        </div>
        <div className="md:col-span-3">
          <Select value={String(radius)} onValueChange={(v) => setRadius(Number(v))}>
            <SelectTrigger className="h-11 md:h-12 border-0 focus:ring-0">
              <SelectValue placeholder="Within…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">This area only</SelectItem>
              <SelectItem value="0.25">Within ¼ mile</SelectItem>
              <SelectItem value="0.5">Within ½ mile</SelectItem>
              <SelectItem value="1">Within 1 mile</SelectItem>
              <SelectItem value="3">Within 3 miles</SelectItem>
              <SelectItem value="5">Within 5 miles</SelectItem>
              <SelectItem value="10">Within 10 miles</SelectItem>
              <SelectItem value="15">Within 15 miles</SelectItem>
              <SelectItem value="25">Within 25 miles</SelectItem>
              <SelectItem value="40">Within 40 miles</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Keyword"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9 h-11 md:h-12 border-0 focus-visible:ring-0"
          />
        </div>
        <Button type="submit" className="md:col-span-2 h-11 md:h-12 w-full">
          <Search className="h-4 w-4 mr-2 md:hidden" />
          Search
        </Button>
      </form>
    </div>
  );
}

function FiltersSheet({
  s,
  setSearch,
  category,
}: {
  s: SearchParams;
  setSearch: (patch: Partial<SearchParams>) => void;
  category: Category;
}) {
  const [open, setOpen] = useState(false);
  const initial = useCallback(
    () => ({
      min_price: s.min_price?.toString() ?? "",
      max_price: s.max_price?.toString() ?? "",
      beds: s.beds?.toString() ?? "any",
      baths: s.baths?.toString() ?? "any",
      receptions: s.receptions?.toString() ?? "any",
      min_sqft: s.min_sqft?.toString() ?? "",
      bills_included: s.bills_included ?? false,
      furnished: s.furnished ?? "any",
      property_type: (s.property_type ?? "any") as PropertyType,
      epc_min: s.epc_min ?? "any",
      tenure: s.tenure ?? "any",
      features: s.features ?? [],
      available_from: s.available_from ?? "",
    }),
    [s],
  );

  const [local, setLocal] = useState(initial);
  useEffect(() => {
    setLocal(initial());
  }, [initial]);

  const toggleFeature = (f: string) =>
    setLocal((p) => ({
      ...p,
      features: p.features.includes(f) ? p.features.filter((x) => x !== f) : [...p.features, f],
    }));

  const apply = () => {
    setSearch({
      min_price: local.min_price ? Number(local.min_price) : undefined,
      max_price: local.max_price ? Number(local.max_price) : undefined,
      beds: local.beds !== "any" ? Number(local.beds) : undefined,
      baths: local.baths !== "any" ? Number(local.baths) : undefined,
      receptions: local.receptions !== "any" ? Number(local.receptions) : undefined,
      min_sqft: local.min_sqft ? Number(local.min_sqft) : undefined,
      bills_included: local.bills_included || undefined,
      furnished: local.furnished !== "any" ? local.furnished : undefined,
      property_type: local.property_type !== "any" ? local.property_type : undefined,
      epc_min: local.epc_min !== "any" ? (local.epc_min as "A" | "B" | "C" | "D" | "E") : undefined,
      tenure:
        local.tenure !== "any"
          ? (local.tenure as "freehold" | "leasehold" | "share_of_freehold")
          : undefined,
      features: local.features.length ? local.features : undefined,
      available_from: local.available_from || undefined,
    });

    setOpen(false);
  };

  const activeCount = [
    s.min_price,
    s.max_price,
    s.beds,
    s.baths,
    s.receptions,
    s.min_sqft,
    s.bills_included,
    s.furnished,
    s.property_type !== undefined && s.property_type !== "any" ? 1 : undefined,
    s.epc_min,
    s.tenure,
    s.features?.length,
  ].filter(Boolean).length;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="h-9">
          <SlidersHorizontal className="h-4 w-4 mr-1" /> Filters
          {activeCount > 0 && (
            <Badge className="ml-1.5 h-5 px-1.5 text-[10px]">{activeCount}</Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Refine your search</SheetTitle>
        </SheetHeader>
        <div className="space-y-5 mt-6">
          <div>
            <Label>Property type</Label>
            <div className="grid grid-cols-4 gap-1.5 mt-2">
              {propertyTypes.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setLocal({ ...local, property_type: t })}
                  className={`h-9 rounded-md border text-xs font-medium capitalize transition-colors ${local.property_type === t ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-accent/10"}`}
                >
                  {t === "any" ? "Any" : t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Price range (£)</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Input
                placeholder="Min"
                inputMode="numeric"
                value={local.min_price}
                onChange={(e) =>
                  setLocal({ ...local, min_price: e.target.value.replace(/[^0-9]/g, "") })
                }
              />
              <Input
                placeholder="Max"
                inputMode="numeric"
                value={local.max_price}
                onChange={(e) =>
                  setLocal({ ...local, max_price: e.target.value.replace(/[^0-9]/g, "") })
                }
              />
            </div>
          </div>

          {category !== "commercial" && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>{category === "hmo" ? "Rooms" : "Bedrooms"}</Label>
                <Select value={local.beds} onValueChange={(v) => setLocal({ ...local, beds: v })}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}+
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Bathrooms</Label>
                <Select value={local.baths} onValueChange={(v) => setLocal({ ...local, baths: v })}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    {[1, 2, 3, 4].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}+
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {category !== "hmo" && (
                <div>
                  <Label>Reception</Label>
                  <Select
                    value={local.receptions}
                    onValueChange={(v) => setLocal({ ...local, receptions: v })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      {[1, 2, 3, 4].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}+
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Min floor area (sq ft)</Label>
              <Input
                className="mt-2"
                placeholder="e.g. 600"
                inputMode="numeric"
                value={local.min_sqft}
                onChange={(e) =>
                  setLocal({ ...local, min_sqft: e.target.value.replace(/[^0-9]/g, "") })
                }
              />
            </div>
            <div>
              <Label>EPC rating (min)</Label>
              <Select
                value={local.epc_min}
                onValueChange={(v) => setLocal({ ...local, epc_min: v })}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  {["A", "B", "C", "D", "E"].map((b) => (
                    <SelectItem key={b} value={b}>
                      {b} or better
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {(category === "all" || category === "sale") && (
            <div>
              <Label>Tenure</Label>
              <Select value={local.tenure} onValueChange={(v) => setLocal({ ...local, tenure: v })}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="freehold">Freehold</SelectItem>
                  <SelectItem value="leasehold">Leasehold</SelectItem>
                  <SelectItem value="share_of_freehold">Share of freehold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Features &amp; must-haves</Label>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {FEATURE_OPTIONS.map((f) => {
                const on = local.features.includes(f);
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => toggleFeature(f)}
                    className={`h-8 px-3 rounded-full border text-xs font-medium transition-colors ${on ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-accent/10"}`}
                  >
                    {f}
                  </button>
                );
              })}
            </div>
          </div>
          {(category === "rent" || category === "hmo" || category === "all") && (
            <>
              <div>
                <Label>Furnished</Label>
                <Select
                  value={local.furnished}
                  onValueChange={(v) => setLocal({ ...local, furnished: v })}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="furnished">Furnished</SelectItem>
                    <SelectItem value="part_furnished">Part furnished</SelectItem>
                    <SelectItem value="unfurnished">Unfurnished</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label htmlFor="bills" className="cursor-pointer">
                  Bills included
                </Label>
                <Switch
                  id="bills"
                  checked={local.bills_included}
                  onCheckedChange={(v) => setLocal({ ...local, bills_included: v })}
                />
              </div>
            </>
          )}
          {category !== "sale" && (
            <div>
              <Label>Available from</Label>
              <Input
                type="date"
                className="mt-2"
                value={local.available_from}
                onChange={(e) => setLocal({ ...local, available_from: e.target.value })}
              />
            </div>
          )}
        </div>
        <SheetFooter className="mt-6 flex-row gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              setLocal({
                min_price: "",
                max_price: "",
                beds: "any",
                baths: "any",
                receptions: "any",
                min_sqft: "",
                bills_included: false,
                furnished: "any",
                property_type: "any",
                epc_min: "any",
                tenure: "any",
                features: [],
                available_from: "",
              });
            }}
          >
            Reset
          </Button>
          <Button className="flex-1" onClick={apply}>
            Apply filters
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

type MapListing = {
  id: string;
  slug: string;
  title: string;
  city: string | null;
  price: number | null;
  currency: string;
  listing_type: string;
  latitude?: number | null;
  longitude?: number | null;
  postcode?: string | null;
};

type MapControls = {
  hoverId: string | null;
  setHoverId: (id: string | null) => void;
  onSearchArea: (b: MapBounds) => void;
  polygon: MapPoint[] | null;
  setPolygon: (p: MapPoint[] | null) => void;
};

function MapView({ listings, controls }: { listings: MapListing[]; controls: MapControls }) {
  const withGeo = listings.filter((l) => l.latitude != null && l.longitude != null);

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-4">
      <div className="relative rounded-2xl overflow-hidden border aspect-[4/3] lg:aspect-auto lg:h-[600px] bg-muted">
        <GoogleListingsMap
          listings={listings}
          activeId={controls.hoverId}
          onHoverListing={controls.setHoverId}
          onSearchArea={controls.onSearchArea}
          polygon={controls.polygon}
          onPolygonChange={controls.setPolygon}
        />
      </div>
      <div className="space-y-2 lg:max-h-[600px] lg:overflow-y-auto pr-1">
        {withGeo.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="p-4 text-sm text-muted-foreground">
              No precise locations on these listings yet. Agents will see their pins here once
              coordinates or postcodes are added.
            </CardContent>
          </Card>
        )}
        {listings.map((l) => (
          <Link
            key={l.id}
            to="/marketplace/$slug"
            params={{ slug: l.slug }}
            className="block"
            onMouseEnter={() => controls.setHoverId(l.id)}
            onMouseLeave={() => controls.setHoverId(null)}
          >
            <Card
              className={`border transition-shadow ${controls.hoverId === l.id ? "shadow-xl ring-2 ring-accent" : "hover:shadow-card"}`}
            >
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{l.title}</div>
                  <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {l.city ?? "—"}
                  </div>
                </div>
                <div className="text-sm font-bold text-primary shrink-0">
                  {l.price
                    ? new Intl.NumberFormat("en-GB", {
                        style: "currency",
                        currency: l.currency || "GBP",
                        maximumFractionDigits: 0,
                      }).format(Number(l.price))
                    : "POA"}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
