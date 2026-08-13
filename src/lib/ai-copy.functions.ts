import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { safeExternalUrl } from "@/lib/url-safety";

export const listMyListings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("listings")
      .select("id, title, city, postcode, bedrooms, bathrooms, price, listing_type, status, ai_copy_generated_at, properties(property_type)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { listings: data ?? [] };
  });

const inputSchema = z.object({
  title: z.string().max(200).optional(),
  property_type: z.string().max(40).optional(),
  beds: z.number().int().min(0).max(20).optional(),
  baths: z.number().int().min(0).max(20).optional(),
  area: z.string().max(200).optional(),
  features: z.string().max(2000).optional(),
  tone: z.enum(["professional", "warm", "luxury", "concise"]).optional(),
  listing_id: z.string().uuid().optional(),
  apply: z.boolean().optional(),
});

type AIOutput = {
  headline: string;
  short: string;
  long: string;
  bullets: string[];
  caption: string;
};

export const generateListingCopy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data, context }): Promise<AIOutput & { applied: boolean }> => {
    const { enforceRateLimit } = await import("./rate-limit.server");
    await enforceRateLimit("ai_listing_copy", 20, 3_600, context.userId);
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured.");

    const facts = {
      title: data.title || "Unnamed property",
      type: data.property_type || "property",
      beds: data.beds ?? 0,
      baths: data.baths ?? 0,
      area: data.area || "the UK",
      features: data.features || "",
      tone: data.tone || "professional",
    };

    const systemPrompt = `You are a UK estate-agent copywriter. Write compelling, Rightmove/Zoopla-ready listing copy in British English. Never invent facts. Use only what's provided. Respond with valid JSON only, no markdown.`;
    const userPrompt = `Write listing copy in a ${facts.tone} tone for this UK property:
- Title/Address: ${facts.title}
- Type: ${facts.type}
- Bedrooms: ${facts.beds}
- Bathrooms: ${facts.baths}
- Area: ${facts.area}
- Key features: ${facts.features || "(none provided)"}

Return JSON with these exact keys:
{
  "headline": "<one-line, max 90 chars>",
  "short": "<2-3 sentence summary, max 320 chars>",
  "long": "<full description, 3-4 short paragraphs separated by \\n\\n>",
  "bullets": ["<5 feature highlights>"],
  "caption": "<short social media caption with 2-3 hashtags, max 220 chars>"
}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      if (res.status === 429) throw new Error("AI rate limit. Please try again in a moment.");
      if (res.status === 402) throw new Error("AI credits exhausted. Add credits in Settings → Workspace → Usage.");
      console.error("[ai-copy] provider request failed", res.status, txt.slice(0, 300));
      throw new Error(`AI request failed (${res.status}). Please try again later.`);
    }
    const j = await res.json();
    const raw = j?.choices?.[0]?.message?.content ?? "{}";
    let parsed: AIOutput;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("AI returned malformed JSON.");
    }
    const output: AIOutput = {
      headline: String(parsed.headline ?? "").slice(0, 200),
      short: String(parsed.short ?? "").slice(0, 800),
      long: String(parsed.long ?? "").slice(0, 6_000),
      bullets: Array.isArray(parsed.bullets)
        ? parsed.bullets.map((b) => String(b).slice(0, 240)).slice(0, 10)
        : [],
      caption: String(parsed.caption ?? "").slice(0, 400),
    };

    let applied = false;
    if (data.apply && data.listing_id) {
      const { error } = await context.supabase
        .from("listings")
        .update({
          ai_copy_short: output.short,
          ai_copy_long: output.long,
          ai_copy_highlights: output.bullets as never,
          ai_copy_caption: output.caption,
          ai_copy_generated_at: new Date().toISOString(),
          description: output.long,
        })
        .eq("id", data.listing_id);
      if (error) throw new Error(error.message);
      applied = true;
    }

    return { ...output, applied };
  });

export const saveListingAssets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      listing_id: z.string().uuid(),
      floorplan_url: z.string().max(1000).refine((value) => safeExternalUrl(value) !== null, "Use a valid HTTP(S) URL").optional().nullable(),
      tour_url: z.string().max(1000).refine((value) => safeExternalUrl(value) !== null, "Use a valid HTTP(S) URL").optional().nullable(),
      tour_image_path: z.string().max(500).optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const patch: { floorplan_url?: string | null; tour_url?: string | null; tour_image_path?: string | null } = {};
    if (data.floorplan_url !== undefined) patch.floorplan_url = data.floorplan_url;
    if (data.tour_url !== undefined) patch.tour_url = data.tour_url;
    if (data.tour_image_path !== undefined) patch.tour_image_path = data.tour_image_path;
    const { error } = await context.supabase
      .from("listings")
      .update(patch)
      .eq("id", data.listing_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
