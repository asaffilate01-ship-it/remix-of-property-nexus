import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const requestSchema = z.object({
  postcode: z.string().trim().min(3).max(12),
  bedrooms: z.number().int().min(1).max(20),
  property_type: z.enum(["flat", "house", "hmo"]),
  condition: z.enum(["excellent", "good", "fair"]),
  purpose: z.enum(["sale", "rent"]),
});

const providerResponseSchema = z.object({
  estimate: z.coerce.number().positive().max(999_999_999),
  low: z.coerce.number().positive().max(999_999_999),
  high: z.coerce.number().positive().max(999_999_999),
  confidence: z.coerce.number().min(0).max(100).optional(),
  comparables_count: z.coerce.number().int().min(0).max(10_000).optional(),
  average_days_on_market: z.coerce.number().int().min(0).max(3_650).optional(),
  demand: z.enum(["Low", "Moderate", "High"]).optional(),
});

export type ValuationResult =
  | ({ available: true } & z.infer<typeof providerResponseSchema>)
  | { available: false; reason: "provider_not_configured" | "provider_unavailable" };

/**
 * Calls a server-side AVM adapter. The adapter must return the documented
 * providerResponseSchema shape. Missing or malformed provider data fails closed;
 * the UI never manufactures a price.
 */
export const getPropertyValuation = createServerFn({ method: "POST" })
  .inputValidator(requestSchema)
  .handler(async ({ data }): Promise<ValuationResult> => {
    const { enforceRateLimit } = await import("./rate-limit.server");
    await enforceRateLimit("property_valuation", 10, 3_600);
    const endpoint = process.env.VALUATION_PROVIDER_URL?.trim();
    const apiKey = process.env.VALUATION_PROVIDER_API_KEY?.trim();
    if (!endpoint || !apiKey) return { available: false, reason: "provider_not_configured" };

    let url: URL;
    try {
      url = new URL(endpoint);
      if (url.protocol !== "https:") return { available: false, reason: "provider_unavailable" };
    } catch {
      return { available: false, reason: "provider_unavailable" };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify(data),
        signal: controller.signal,
      });
      if (!response.ok) return { available: false, reason: "provider_unavailable" };
      const parsed = providerResponseSchema.safeParse(await response.json());
      if (!parsed.success || parsed.data.low > parsed.data.estimate || parsed.data.estimate > parsed.data.high) {
        return { available: false, reason: "provider_unavailable" };
      }
      return { available: true, ...parsed.data };
    } catch {
      return { available: false, reason: "provider_unavailable" };
    } finally {
      clearTimeout(timeout);
    }
  });
