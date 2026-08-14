import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { fetchLocationMarket } from "@/lib/locations.functions";
import { LocationMarketPage, type LocationMarketData } from "@/components/locations/LocationMarketPage";

const SITE = "https://estate-elevate-hq.lovable.app";

export const Route = createFileRoute("/property-to-rent/$location")({
  loader: async ({ params }) => {
    const data = await fetchLocationMarket({ data: { slug: params.location, intent: "rent" } });
    if (!data) throw notFound();
    return data;
  },
  head: ({ params, loaderData }) => {
    const url = `${SITE}/property-to-rent/${params.location}`;
    if (!loaderData) {
      return { meta: [{ title: "Area unavailable — Estately" }, { name: "robots", content: "noindex" }] };
    }
    const { location: loc, stats } = loaderData;
    const title = `Property to rent in ${loc.name} (${stats.total} homes) — Estately`;
    const desc = `Find ${stats.total} properties to rent in ${loc.name}, ${loc.county}. Flats, houses, HMO rooms and student lets from verified UK letting agents.`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Property to rent", item: `${SITE}/property-to-rent` },
              { "@type": "ListItem", position: 2, name: loc.name, item: url },
            ],
          }),
        },
      ],
    };
  },
  component: RentPage,
  notFoundComponent: () => (
    <div className="container max-w-2xl py-20 text-center">
      <h1 className="text-2xl font-bold">Area not found</h1>
      <Button asChild className="mt-4"><Link to="/property-to-rent">Browse all areas</Link></Button>
    </div>
  ),
});

function RentPage() {
  return <LocationMarketPage data={Route.useLoaderData() as unknown as LocationMarketData} />;
}
