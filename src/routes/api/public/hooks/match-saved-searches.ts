import { createFileRoute } from "@tanstack/react-router";
import { authorizeCronRequest } from "@/lib/security.server";

// Scheduled by pg_cron. Finds new listings that match each saved_search criteria
// and inserts saved_search_matches rows (idempotent on the unique pair).
// Real email/push send would slot in here behind frequency gating.

type Criteria = {
  category?: "all" | "sale" | "rent" | "hmo" | "commercial";
  city?: string;
  postcode?: string;
  property_type?: string;
  min_price?: number;
  max_price?: number;
  beds?: number;
  baths?: number;
};

function matches(l: Record<string, unknown>, c: Criteria): boolean {
  if (c.category && c.category !== "all") {
    if (c.category === "sale" && l.purpose !== "sale") return false;
    if (c.category === "rent" && l.purpose !== "rent") return false;
    if (c.category === "hmo" && !l.is_hmo) return false;
    if (c.category === "commercial" && l.listing_type !== "commercial") return false;
  }
  if (c.city && (l.city ?? "").toString().toLowerCase() !== c.city.toLowerCase()) return false;
  if (c.postcode && !(l.postcode ?? "").toString().toUpperCase().startsWith(c.postcode.toUpperCase().slice(0, 3))) return false;
  if (c.property_type && c.property_type !== "any") {
    const t = (l as { properties?: { property_type?: string } }).properties?.property_type;
    if (t && t !== c.property_type) return false;
  }
  const price = Number(l.price ?? 0);
  if (c.min_price && price < c.min_price) return false;
  if (c.max_price && price > c.max_price) return false;
  if (c.beds && Number(l.bedrooms ?? 0) < c.beds) return false;
  if (c.baths && Number(l.bathrooms ?? 0) < c.baths) return false;
  return true;
}

export const Route = createFileRoute("/api/public/hooks/match-saved-searches")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauthorized = authorizeCronRequest(request);
        if (unauthorized) return unauthorized;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Saved searches that have ever been checked use last_notified_at as a watermark.
        const { data: searches } = await supabaseAdmin
          .from("saved_searches")
          .select("id, user_id, criteria, last_notified_at, frequency, alert_email, alert_push");

        if (!searches || searches.length === 0) {
          return Response.json({ ok: true, searches: 0, inserted: 0 });
        }

        // Pull recent published listings once; cheap for moderate volumes.
        const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
        const { data: listings } = await supabaseAdmin
          .from("listings")
          .select("id, slug, title, price, city, postcode, listing_type, purpose, bedrooms, bathrooms, is_hmo, created_at, properties(property_type)")
          .eq("marketplace_publish", true)
          .eq("status", "published")
          .gte("created_at", since)
          .limit(500);

        const inserts: Array<{ saved_search_id: string; listing_id: string; notified_at: string }> = [];
        const now = new Date().toISOString();

        for (const s of searches) {
          const watermark = s.last_notified_at ?? "1970-01-01T00:00:00Z";
          const crit = (s.criteria ?? {}) as Criteria;
          for (const l of listings ?? []) {
            if ((l.created_at ?? "") <= watermark) continue;
            if (!matches(l as Record<string, unknown>, crit)) continue;
            inserts.push({ saved_search_id: s.id, listing_id: l.id, notified_at: now });
          }
        }

        let inserted = 0;
        if (inserts.length > 0) {
          // upsert avoids dupes on (saved_search_id, listing_id)
          const { error, count } = await supabaseAdmin
            .from("saved_search_matches")
            .upsert(inserts, { onConflict: "saved_search_id,listing_id", ignoreDuplicates: true, count: "exact" });
          if (error) {
            return Response.json({ ok: false, error: error.message }, { status: 500 });
          }
          inserted = count ?? inserts.length;

          // Move watermarks forward per search.
          const ids = Array.from(new Set(inserts.map((i) => i.saved_search_id)));
          if (ids.length > 0) {
            await supabaseAdmin
              .from("saved_searches")
              .update({ last_notified_at: now })
              .in("id", ids);
          }
        }

        return Response.json({ ok: true, searches: searches.length, candidates: listings?.length ?? 0, inserted });
      },
    },
  },
});
