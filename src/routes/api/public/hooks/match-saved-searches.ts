import { createFileRoute } from "@tanstack/react-router";
import { authorizeCronRequest } from "@/lib/security.server";

// Scheduled worker: records newly published matches and queues a frequency-gated
// email digest. Web Push remains disabled until subscription/VAPID support exists.

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

type ListingRow = {
  id: string;
  slug: string;
  title: string;
  price: number;
  city: string;
  postcode: string;
  listing_type: string;
  purpose: string;
  bedrooms: number | null;
  bathrooms: number | null;
  is_hmo: boolean;
  created_at: string;
  properties: { property_type?: string } | Array<{ property_type?: string }> | null;
};

function matches(listing: Record<string, unknown>, criteria: Criteria): boolean {
  if (criteria.category && criteria.category !== "all") {
    if (criteria.category === "sale" && listing.purpose !== "sale") return false;
    if (criteria.category === "rent" && listing.purpose !== "rent") return false;
    if (criteria.category === "hmo" && !listing.is_hmo) return false;
    if (criteria.category === "commercial" && listing.listing_type !== "commercial") return false;
  }
  if (criteria.city && (listing.city ?? "").toString().toLowerCase() !== criteria.city.toLowerCase()) return false;
  if (criteria.postcode && !(listing.postcode ?? "").toString().toUpperCase().startsWith(criteria.postcode.toUpperCase().slice(0, 3))) return false;
  if (criteria.property_type && criteria.property_type !== "any") {
    const relation = listing.properties as { property_type?: string } | Array<{ property_type?: string }> | null;
    const propertyType = Array.isArray(relation) ? relation[0]?.property_type : relation?.property_type;
    if (propertyType && propertyType !== criteria.property_type) return false;
  }
  const price = Number(listing.price ?? 0);
  if (criteria.min_price && price < criteria.min_price) return false;
  if (criteria.max_price && price > criteria.max_price) return false;
  if (criteria.beds && Number(listing.bedrooms ?? 0) < criteria.beds) return false;
  if (criteria.baths && Number(listing.bathrooms ?? 0) < criteria.baths) return false;
  return true;
}

export function savedSearchIsDue(frequency: string, lastNotifiedAt: string | null, now = Date.now()): boolean {
  if (!lastNotifiedAt || frequency === "instant") return true;
  const elapsed = now - new Date(lastNotifiedAt).getTime();
  if (!Number.isFinite(elapsed)) return true;
  if (frequency === "weekly") return elapsed >= 7 * 24 * 60 * 60 * 1_000;
  return elapsed >= 24 * 60 * 60 * 1_000;
}

export const Route = createFileRoute("/api/public/hooks/match-saved-searches")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauthorized = authorizeCronRequest(request);
        if (unauthorized) return unauthorized;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: searches, error: searchError } = await supabaseAdmin
          .from("saved_searches")
          .select("id, user_id, name, criteria, last_notified_at, frequency, alert_email, alert_push");

        if (searchError) {
          console.error("Saved-search worker could not load searches", searchError.message);
          return Response.json({ ok: false, error: "Saved searches are unavailable" }, { status: 500 });
        }
        if (!searches?.length) {
          return Response.json({ ok: true, searches: 0, due: 0, inserted: 0, emails_queued: 0 });
        }

        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1_000).toISOString();
        const listings: ListingRow[] = [];
        let listingErrorMessage: string | null = null;
        let truncated = false;
        const pageSize = 500;
        for (let page = 0; page < 20; page += 1) {
          const { data: batch, error } = await supabaseAdmin
            .from("listings")
            .select("id, slug, title, price, city, postcode, listing_type, purpose, bedrooms, bathrooms, is_hmo, created_at, properties(property_type)")
            .eq("marketplace_publish", true)
            .eq("status", "published")
            .gte("created_at", since)
            .order("created_at", { ascending: true })
            .range(page * pageSize, (page + 1) * pageSize - 1);
          if (error) {
            listingErrorMessage = error.message;
            break;
          }
          const pageRows = (batch ?? []) as unknown as ListingRow[];
          listings.push(...pageRows);
          if (pageRows.length < pageSize) break;
          if (page === 19) truncated = true;
        }

        if (listingErrorMessage) {
          console.error("Saved-search worker could not load listings", listingErrorMessage);
          return Response.json({ ok: false, error: "Listings are unavailable" }, { status: 500 });
        }
        if (truncated) {
          console.error("Saved-search candidate limit reached; refusing to advance watermarks");
          return Response.json({ ok: false, error: "Saved-search batch is too large" }, { status: 503 });
        }

        const now = new Date();
        const notifiedAt = now.toISOString();
        let due = 0;
        let inserted = 0;
        let emailsQueued = 0;
        let emailFailures = 0;
        let pushSkipped = 0;
        const userEmailCache = new Map<string, string | null>();

        for (const search of searches) {
          if (!savedSearchIsDue(search.frequency, search.last_notified_at, now.getTime())) continue;
          due += 1;

          const watermark = search.last_notified_at ?? "1970-01-01T00:00:00Z";
          const criteria = (search.criteria ?? {}) as Criteria;
          const found = listings.filter((listing) =>
            (listing.created_at ?? "") > watermark
            && matches(listing as unknown as Record<string, unknown>, criteria));
          if (!found.length) continue;

          const matchRows = found.map((listing) => ({
            saved_search_id: search.id,
            listing_id: listing.id,
            notified_at: notifiedAt,
          }));
          const { error: matchError, count } = await supabaseAdmin
            .from("saved_search_matches")
            .upsert(matchRows, {
              onConflict: "saved_search_id,listing_id",
              ignoreDuplicates: true,
              count: "exact",
            });
          if (matchError) {
            console.error("Saved-search worker could not record matches", { searchId: search.id, error: matchError.message });
            continue;
          }
          inserted += count ?? matchRows.length;

          let canAdvanceWatermark = true;
          if (search.alert_email) {
            if (!userEmailCache.has(search.user_id)) {
              const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(search.user_id);
              userEmailCache.set(search.user_id, userError ? null : userData.user?.email ?? null);
            }
            const email = userEmailCache.get(search.user_id);
            if (!email) {
              console.error("Saved-search email recipient unavailable", { searchId: search.id });
              emailFailures += 1;
            } else {
              const newest = found[found.length - 1];
              const { error: queueError } = await supabaseAdmin.rpc("enqueue_email", {
                queue_name: "transactional_emails",
                template_name: "saved-search-matches",
                recipient_email: email,
                template_data: {
                  search_name: search.name || "your saved search",
                  listing_count: found.length,
                  listings: found.slice(0, 20).map((listing) => ({
                    title: listing.title,
                    city: listing.city,
                    price: listing.price,
                    path: `/marketplace/${encodeURIComponent(listing.slug)}`,
                  })),
                },
                idempotency_key: `saved-search:${search.id}:${newest.id}`,
              });
              if (queueError) {
                console.error("Saved-search email could not be queued", { searchId: search.id, error: queueError.message });
                emailFailures += 1;
                canAdvanceWatermark = false;
              } else {
                emailsQueued += 1;
              }
            }
          }
          if (search.alert_push) pushSkipped += 1;

          if (canAdvanceWatermark) {
            await supabaseAdmin
              .from("saved_searches")
              .update({ last_notified_at: notifiedAt })
              .eq("id", search.id);
          }
        }

        return Response.json(
          {
            ok: emailFailures === 0,
            searches: searches.length,
            due,
            candidates: listings.length,
            inserted,
            emails_queued: emailsQueued,
            email_failures: emailFailures,
            push_skipped: pushSkipped,
          },
          { status: emailFailures > 0 ? 207 : 200, headers: { "cache-control": "no-store" } },
        );
      },
    },
  },
});
