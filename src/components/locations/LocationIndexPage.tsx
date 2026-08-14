import { Link } from "@tanstack/react-router";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";
import { LOCATIONS_BY_REGION } from "@/content/locations";

export function LocationIndexPage({ intent }: { intent: "sale" | "rent" }) {
  const isSale = intent === "sale";
  const verb = isSale ? "for sale" : "to rent";
  const regions = Object.keys(LOCATIONS_BY_REGION).sort();

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="container mx-auto px-4 py-10 md:py-14">
        <Badge variant="outline" className="mb-3"><MapPin className="h-3 w-3 mr-1.5" /> UK coverage</Badge>
        <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">Property {verb} across the UK</h1>
        <p className="text-muted-foreground mt-3 max-w-2xl">
          {isSale
            ? "Houses, flats and land for sale from verified estate agents. Pick a town or city to see every live listing, price range and local area detail."
            : "Flats, houses, HMO rooms and student lets from verified letting agents. Pick a town or city to see every live rental and what the area is like."}
        </p>

        <div className="mt-10 space-y-10">
          {regions.map((region) => (
            <section key={region}>
              <h2 className="text-lg font-semibold mb-3">{region}</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {LOCATIONS_BY_REGION[region].map((l) => (
                  <Link
                    key={l.slug}
                    to={isSale ? "/property-for-sale/$location" : "/property-to-rent/$location"}
                    params={{ location: l.slug }}
                  >
                    <Card className="border-0 shadow-card hover:shadow-lg transition-shadow h-full">
                      <CardContent className="p-4">
                        <div className="font-medium">Property {verb} in {l.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">{l.county} · {l.postcodes.join(", ")}</div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="text-sm text-muted-foreground mt-12">
          Looking the other way?{" "}
          <Link to={isSale ? "/property-to-rent" : "/property-for-sale"} className="underline hover:text-foreground">
            Browse property {isSale ? "to rent" : "for sale"}
          </Link>{" "}
          or <Link to="/marketplace" className="underline hover:text-foreground">search the full marketplace</Link>.
        </p>
      </main>
      <PublicFooter />
    </div>
  );
}
