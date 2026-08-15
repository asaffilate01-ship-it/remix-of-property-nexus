import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const fetchLocationMarket = createServerFn({ method: "GET" })
  .validator(z.object({ slug: z.string().max(80), intent: z.enum(["sale", "rent"]) }))
  .handler(async ({ data }) => {
    const { loadLocationMarket } = await import("@/lib/locations.server");
    return loadLocationMarket(data.slug, data.intent);
  });
