import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { fetchLocationMarket } from "@/lib/locations.functions";
import { LocationMarketPage, type LocationMarketData } from "@/components/locations/LocationMarketPage";

const SITE = "https://estate-elevate-hq.lovable.app";

export const Route = createFileRoute("/property-for-sale/$location")({
  loader: async ({ params }) => {
    const data = await fetchLocationMarket({ data: { slug: params.location, intent: "sale" } });
    if (!data) throw notFound();
    return data;
  },
  head: ({ params, loaderData }) => {
    const url = `${SITE}/property-for-sale/${params.location}`;
    if (!loaderData) {
      return { meta: [{ title: "Area unavailable — Estately" }, { name: "robots", content: "noindex" }] };
    }
    const { location: loc, stats } = loaderData;
    const title = stats.total
      ? `Property for sale in ${loc.name} — ${stats.total} homes | Estately`
      : `Property for sale in ${loc.name}, ${loc.county} | Estately`;
    const desc = stats.total
      ? `Browse ${stats.total} properties for sale in ${loc.name}, ${loc.county} from verified UK estate agents. Covering ${loc.postcodes.join(", ")} postcodes.`
      : `Houses and flats for sale in ${loc.name}, ${loc.county}. Set an alert and be first to see new listings across ${loc.postcodes.join(", ")} postcodes.`;
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
              { "@type": "ListItem", position: 1, name: "Property for sale", item: `${SITE}/property-for-sale` },
              { "@type": "ListItem", position: 2, name: loc.name, item: url },
            ],
          }),
        },
      ],
    };
  },
  component: SalePage,
  notFoundComponent: () => (
    <div className="container max-w-2xl py-20 text-center">
      <h1 className="text-2xl font-bold">Area not found</h1>
      <Button asChild className="mt-4"><Link to="/property-for-sale">Browse all areas</Link></Button>
    </div>
  ),
});

function SalePage() {
  return <LocationMarketPage data={Route.useLoaderData() as unknown as LocationMarketData} />;
}
