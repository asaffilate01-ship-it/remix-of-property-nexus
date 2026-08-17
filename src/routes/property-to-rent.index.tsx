import { createFileRoute } from "@tanstack/react-router";
import { LocationIndexPage } from "@/components/locations/LocationIndexPage";
import { LOCATIONS } from "@/content/locations";
import { siteUrl } from "@/lib/site-url";

const URL = siteUrl("/property-to-rent");

export const Route = createFileRoute("/property-to-rent/")({
  head: () => {
    const title = "Property to rent in the UK — Gabley";
    const desc = `Find flats, houses, HMO rooms and student lets to rent across ${LOCATIONS.length} UK towns and cities from verified letting agents.`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { property: "og:url", content: URL },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: URL }],
    };
  },
  component: () => <LocationIndexPage intent="rent" />,
});
