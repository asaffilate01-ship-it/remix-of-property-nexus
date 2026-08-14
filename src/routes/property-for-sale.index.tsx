import { createFileRoute } from "@tanstack/react-router";
import { LocationIndexPage } from "@/components/locations/LocationIndexPage";
import { LOCATIONS } from "@/content/locations";

const SITE = "https://estate-elevate-hq.lovable.app";
const URL = `${SITE}/property-for-sale`;

export const Route = createFileRoute("/property-for-sale/")({
  head: () => {
    const title = "Property for sale in the UK — Estately";
    const desc = `Browse houses, flats and land for sale across ${LOCATIONS.length} UK towns and cities, listed by verified estate agents.`;
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
  component: () => <LocationIndexPage intent="sale" />,
});
