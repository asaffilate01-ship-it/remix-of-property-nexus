import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Natural-language property search. Turns "2 bed flat in Manchester under £1200
 * with parking" into structured marketplace filters using the Lovable AI gateway.
 * Public (no auth) but rate limited per IP.
 */
const inputSchema = z.object({ query: z.string().min(3).max(300) });

export type AiSearchFilters = {
  category?: "sale" | "rent" | "hmo" | "commercial";
  city?: string;
  postcode?: string;
  property_type?: "house" | "flat" | "bungalow" | "studio" | "room" | "commercial" | "land";
  min_price?: number;
  max_price?: number;
  beds?: number;
  baths?: number;
  features?: string[];
  furnished?: string;
  bills_included?: boolean;
  radius?: number;
  q?: string;
};

const filterSchema = z
  .object({
    category: z.enum(["sale", "rent", "hmo", "commercial"]).optional(),
    city: z.string().max(80).optional(),
    postcode: z.string().max(12).optional(),
    property_type: z
      .enum(["house", "flat", "bungalow", "studio", "room", "commercial", "land"])
      .optional(),
    min_price: z.number().int().min(0).max(50_000_000).optional(),
    max_price: z.number().int().min(0).max(50_000_000).optional(),
    beds: z.number().int().min(0).max(20).optional(),
    baths: z.number().int().min(0).max(20).optional(),
    features: z.array(z.string().max(40)).max(8).optional(),
    furnished: z.string().max(30).optional(),
    bills_included: z.boolean().optional(),
    radius: z.number().min(0).max(40).optional(),
    q: z.string().max(120).optional(),
    summary: z.string().max(200).optional(),
  })
  .partial();

export const aiParseSearch = createServerFn({ method: "POST" })
  .validator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data }): Promise<{ filters: AiSearchFilters; summary: string }> => {
    const { enforceRateLimit } = await import("./rate-limit.server");
    await enforceRateLimit("ai_property_search", 20, 600);

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI search is not configured.");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You convert UK property search phrases into structured filters. Prices are GBP: for rentals treat them as monthly (pcm). 'category' is sale, rent, hmo or commercial. Use city for towns/cities, postcode only for real UK postcodes or outcodes. Put anything you cannot map (e.g. 'near the station') into q. Never invent a location that was not mentioned. Always call the tool.",
          },
          { role: "user", content: data.query },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "apply_filters",
              description: "Apply structured property search filters",
              parameters: {
                type: "object",
                properties: {
                  category: { type: "string", enum: ["sale", "rent", "hmo", "commercial"] },
                  city: { type: "string" },
                  postcode: { type: "string" },
                  property_type: {
                    type: "string",
                    enum: ["house", "flat", "bungalow", "studio", "room", "commercial", "land"],
                  },
                  min_price: { type: "number" },
                  max_price: { type: "number" },
                  beds: { type: "number" },
                  baths: { type: "number" },
                  features: { type: "array", items: { type: "string" } },
                  furnished: { type: "string" },
                  bills_included: { type: "boolean" },
                  radius: { type: "number" },
                  q: { type: "string" },
                  summary: { type: "string", description: "One short sentence describing the search" },
                },
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "apply_filters" } },
      }),
    });

    if (res.status === 429) throw new Error("AI search is busy right now — please try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits to continue.");
    if (!res.ok) {
      const body = await res.text();
      console.error(`AI search failed [${res.status}]: ${body}`);
      throw new Error("AI search failed. Try a normal search instead.");
    }

    const json = (await res.json()) as {
      choices?: Array<{
        message?: { tool_calls?: Array<{ function?: { arguments?: string } }> };
      }>;
    };
    const raw = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!raw) return { filters: { q: data.query }, summary: data.query };

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { filters: { q: data.query }, summary: data.query };
    }
    const safe = filterSchema.safeParse(parsed);
    if (!safe.success) return { filters: { q: data.query }, summary: data.query };

    const { summary, ...filters } = safe.data;
    return { filters: filters as AiSearchFilters, summary: summary ?? data.query };
  });
