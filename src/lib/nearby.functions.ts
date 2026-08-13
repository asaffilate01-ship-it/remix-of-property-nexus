import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

type Place = {
  id: string;
  name: string;
  address: string;
  distance_m: number;
  rating?: number;
  category: "school" | "transit" | "supermarket" | "restaurant" | "park" | "gym";
};

const CATEGORIES: { key: Place["category"]; types: string[] }[] = [
  { key: "school", types: ["primary_school", "secondary_school", "school"] },
  { key: "transit", types: ["train_station", "subway_station", "transit_station", "bus_station"] },
  { key: "supermarket", types: ["supermarket", "grocery_store"] },
  { key: "restaurant", types: ["restaurant", "cafe"] },
  { key: "park", types: ["park"] },
  { key: "gym", types: ["gym"] },
];

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export const fetchNearby = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      radius_m: z.number().int().min(100).max(5000).default(1500),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { enforceRateLimit } = await import("./rate-limit.server");
    await enforceRateLimit("nearby_places", 30, 600);
    const apiKey = process.env.LOVABLE_API_KEY;
    const connKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey || !connKey) return { places: [] as Place[] };

    const headers = {
      Authorization: `Bearer ${apiKey}`,
      "X-Connection-Api-Key": connKey,
      "Content-Type": "application/json",
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.types",
    };

    const out: Place[] = [];
    await Promise.all(CATEGORIES.map(async (cat) => {
      try {
        const res = await fetch(`${GATEWAY_URL}/places/v1/places:searchNearby`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            includedTypes: cat.types,
            maxResultCount: 5,
            locationRestriction: { circle: { center: { latitude: data.lat, longitude: data.lng }, radius: data.radius_m } },
            rankPreference: "DISTANCE",
          }),
        });
        if (!res.ok) return;
        const j = await res.json() as { places?: Array<{ id: string; displayName?: { text?: string }; formattedAddress?: string; location?: { latitude: number; longitude: number }; rating?: number }> };
        for (const p of j.places ?? []) {
          if (!p.location) continue;
          out.push({
            id: p.id,
            name: p.displayName?.text ?? "Unknown",
            address: p.formattedAddress ?? "",
            distance_m: Math.round(haversine(data.lat, data.lng, p.location.latitude, p.location.longitude)),
            rating: p.rating,
            category: cat.key,
          });
        }
      } catch { /* swallow per-category */ }
    }));

    out.sort((a, b) => a.distance_m - b.distance_m);
    return { places: out };
  });
