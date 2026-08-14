import { Link } from "@tanstack/react-router";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Train, Building2, ArrowRight, Search } from "lucide-react";
import { LOCATIONS, type UkLocation, findLocation } from "@/content/locations";

export type LocationMarketData = {
  location: UkLocation;
  intent: "sale" | "rent";
  listings: ListingCardData[];
  stats: {
    total: number;
    shown: number;
    median: number | null;
    min: number | null;
    max: number | null;
    hmoCount: number;
    otherIntentCount: number;
    bedBuckets: { beds: number; count: number }[];
  };
};

const gbp = (n: number | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);

export function LocationMarketPage({ data }: { data: LocationMarketData }) {
  const { location: loc, intent, listings, stats } = data;
  const isSale = intent === "sale";
  const verb = isSale ? "for sale" : "to rent";
  const suffix = isSale ? "" : " pcm";
  const nearby = loc.nearby.map(findLocation).filter((x): x is UkLocation => !!x);
  const regionalLocations = LOCATIONS
    .filter((location) => location.slug !== loc.slug && location.region === loc.region)
    .slice(0, 24);

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="container mx-auto px-4 py-10 md:py-14">
        <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground mb-4">
          <Link to="/marketplace" className="hover:text-foreground">Marketplace</Link>
          <span className="mx-1.5">/</span>
          <Link to={isSale ? "/property-for-sale" : "/property-to-rent"} className="hover:text-foreground">
            Property {verb}
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-foreground">{loc.name}</span>
        </nav>

        <Badge variant="outline" className="mb-3">
          <MapPin className="h-3 w-3 mr-1.5" /> {loc.county} · {loc.region}
        </Badge>
        <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
          Property {verb} in {loc.name}
        </h1>
        <p className="text-muted-foreground mt-3 max-w-3xl">{loc.intro}</p>

        <div className="grid sm:grid-cols-4 gap-3 mt-8">
          <Stat label={`Listings ${verb}`} value={String(stats.total)} />
          <Stat label={`Recent ${isSale ? "asking price" : "rent"} midpoint`} value={stats.median ? gbp(stats.median) + suffix : "—"} />
          <Stat label="Recent price range" value={stats.min ? `${gbp(stats.min)} – ${gbp(stats.max)}` : "—"} />
          <Stat label="Postcode areas" value={loc.postcodes.join(", ")} />
        </div>

        <div className="flex flex-wrap gap-2 mt-6">
          <Button asChild size="sm">
            <Link to="/marketplace" search={{ city: loc.city, category: isSale ? "sale" : "rent" }}>
              <Search className="h-4 w-4 mr-1.5" /> Refine search in {loc.name}
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to={isSale ? "/property-to-rent/$location" : "/property-for-sale/$location"} params={{ location: loc.slug }}>
              {isSale ? "Rentals" : "Homes for sale"} in {loc.name} ({stats.otherIntentCount})
            </Link>
          </Button>
          {stats.hmoCount > 0 && (
            <Button asChild size="sm" variant="outline">
              <Link to="/marketplace" search={{ city: loc.city, category: "hmo" }}>
                HMO rooms in {loc.name} ({stats.hmoCount})
              </Link>
            </Button>
          )}
        </div>

        <section className="mt-12">
          <h2 className="text-xl font-semibold mb-4">
            {stats.total > 0 ? `${stats.total} properties ${verb} in ${loc.name}` : `No live listings ${verb} in ${loc.name} yet`}
          </h2>
          {stats.total > stats.shown && (
            <p className="-mt-2 mb-5 text-sm text-muted-foreground">
              Showing the {stats.shown} most recent listings. Use the filters to narrow the full result set.
            </p>
          )}
          {stats.total > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((l) => (
                <ListingCard key={l.id} l={l} />
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                <p>No agent has published a property {verb} in {loc.name} right now.</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Button asChild size="sm" variant="outline"><Link to="/saved-searches">Get alerted when one lands</Link></Button>
                  <Button asChild size="sm" variant="ghost"><Link to="/marketplace">Browse the whole marketplace</Link></Button>
                </div>
              </CardContent>
            </Card>
          )}
        </section>

        <section className="grid md:grid-cols-2 gap-6 mt-14">
          <Card className="border-0 shadow-card">
            <CardContent className="p-6">
              <h2 className="font-semibold flex items-center gap-2 mb-3"><Building2 className="h-4 w-4" /> Where people search in {loc.name}</h2>
              {loc.neighbourhoods.length > 0 ? (
                <ul className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                  {loc.neighbourhoods.map((n) => <li key={n}>{n}</li>)}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Buyers and renters searching {loc.name} usually start with the {loc.postcodes.join(", ")} postcode area and the surrounding {loc.county} villages.
                </p>
              )}
              {stats.bedBuckets.some((b) => b.count > 0) && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {stats.bedBuckets.filter((b) => b.count > 0).map((b) => (
                    <Link key={b.beds} to="/marketplace" search={{ city: loc.city, category: isSale ? "sale" : "rent", beds: b.beds }}>
                      <Badge variant="outline">{b.beds}+ bed · {b.count}</Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          {loc.transport.length > 0 && (
            <Card className="border-0 shadow-card">
              <CardContent className="p-6">
                <h2 className="font-semibold flex items-center gap-2 mb-3"><Train className="h-4 w-4" /> Getting around</h2>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {loc.transport.map((t) => <li key={t}>{t}</li>)}
                </ul>
              </CardContent>
            </Card>
          )}
        </section>


        {nearby.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-semibold mb-4">Nearby areas</h2>
            <div className="flex flex-wrap gap-2">
              {nearby.map((n) => (
                <Button key={n.slug} asChild variant="outline" size="sm">
                  <Link to={isSale ? "/property-for-sale/$location" : "/property-to-rent/$location"} params={{ location: n.slug }}>
                    {n.name} <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </Link>
                </Button>
              ))}
            </div>
          </section>
        )}

        <section className="mt-14">
          <h2 className="text-xl font-semibold mb-4">More places in {loc.region}</h2>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
            {regionalLocations.map((l) => (
              <Link
                key={l.slug}
                to={isSale ? "/property-for-sale/$location" : "/property-to-rent/$location"}
                params={{ location: l.slug }}
                className="hover:text-foreground"
              >
                {l.name}
              </Link>
            ))}
          </div>
          <Button asChild variant="outline" size="sm" className="mt-5">
            <Link to={isSale ? "/property-for-sale" : "/property-to-rent"}>
              Browse all UK towns and cities <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Link>
          </Button>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-0 shadow-card">
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-lg font-semibold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}
