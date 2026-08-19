// Server-only helpers behind the portal syndication server functions.
import { randomBytes } from "crypto";
import { PORTAL_META, type PortalId } from "@/lib/portals";
import { buildFeed, pushListing, type FeedChannel, type FeedListing } from "@/lib/portals.server";
import { getServerSiteUrl } from "@/lib/site-url.server";

export function randomToken(): string {
  return randomBytes(24).toString("hex");
}

export async function resolveAgencyId(supabase: any, userId: string): Promise<string | null> {
  const owned = await supabase.from("agencies").select("id").eq("owner_id", userId).limit(1).maybeSingle();
  if (owned.data?.id) return owned.data.id;
  const mem = await supabase.from("agency_members").select("agency_id").eq("user_id", userId).limit(1).maybeSingle();
  return mem.data?.agency_id ?? null;
}

export const LISTING_FEED_COLUMNS =
  "id, slug, title, description, address, city, postcode, price, currency, purpose, listing_type, property_type_code, bedrooms, bathrooms, receptions, epc_rating, tenure, furnished, available_from, latitude, longitude, features, photos, floorplan_url, tour_url, status, updated_at, created_at";

export type SyndicationOutcome = {
  portal: PortalId;
  status: "queued" | "sent" | "live" | "removed" | "error";
  detail: string;
};

export async function syndicate(
  supabase: any,
  userId: string,
  listingId: string,
  portals: PortalId[],
  mode: "publish" | "remove",
): Promise<{ results: SyndicationOutcome[] }> {
  const agencyId = await resolveAgencyId(supabase, userId);
  if (!agencyId) throw new Error("You need an agency before syndicating listings.");

  const { data: listing, error: le } = await supabase
    .from("listings")
    .select(LISTING_FEED_COLUMNS)
    .eq("id", listingId)
    .single();
  if (le || !listing) throw new Error("Listing not found.");

  const origin = getServerSiteUrl();
  const results: SyndicationOutcome[] = [];

  for (const portal of portals) {
    const { data: channel } = await supabase
      .from("portal_channels")
      .select("*")
      .eq("agency_id", agencyId)
      .eq("portal", portal)
      .maybeSingle();

    if (!channel || !channel.enabled) {
      results.push({ portal, status: "error", detail: `${PORTAL_META[portal].name} is not enabled for your agency.` });
      continue;
    }

    const feedChannel: FeedChannel = {
      id: channel.id,
      portal,
      branch_ref: channel.branch_ref,
      network_ref: channel.network_ref,
      config: (channel.config ?? {}) as Record<string, unknown>,
    };

    let status: SyndicationOutcome["status"] = mode === "remove" ? "removed" : "queued";
    let detail = "";
    let externalRef: string | null = null;

    try {
      const push = await pushListing(portal, feedChannel, listing as FeedListing, origin, mode);
      detail = push.detail;
      externalRef = push.external_ref ?? null;
      if (push.delivered) status = mode === "remove" ? "removed" : "live";
    } catch (e: any) {
      status = "error";
      detail = String(e?.message ?? e).slice(0, 500);
    }

    await supabase.from("portal_listings").upsert(
      {
        channel_id: channel.id,
        listing_id: listingId,
        status,
        external_ref: externalRef,
        last_error: status === "error" ? detail : null,
        last_pushed_at: new Date().toISOString(),
      },
      { onConflict: "channel_id,listing_id" },
    );

    await supabase.from("portal_events").insert({
      channel_id: channel.id,
      listing_id: listingId,
      action: mode,
      ok: status !== "error",
      detail: detail.slice(0, 500),
    });

    results.push({ portal, status, detail });
  }

  return { results };
}

/** Builds the public feed body for a channel identified by its feed token. */
export async function buildFeedForToken(
  token: string,
  ext: string,
): Promise<{ body: string; contentType: string } | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: channel } = await supabaseAdmin
    .from("portal_channels")
    .select("*")
    .eq("feed_token", token)
    .maybeSingle();
  if (!channel || !channel.enabled) return null;

  const portal = channel.portal as PortalId;
  const expected = PORTAL_META[portal].format === "blm" ? "blm" : PORTAL_META[portal].format === "json" ? "json" : "xml";
  if (ext !== expected) return null;

  const { data: rows } = await supabaseAdmin
    .from("portal_listings")
    .select(`listing_id, status, listings(${LISTING_FEED_COLUMNS})`)
    .eq("channel_id", channel.id)
    .neq("status", "removed");

  const listings = (rows ?? [])
    .map((r: any) => r.listings)
    .filter(Boolean) as FeedListing[];

  const feed = buildFeed(
    portal,
    listings,
    {
      id: channel.id,
      portal,
      branch_ref: channel.branch_ref,
      network_ref: channel.network_ref,
      config: (channel.config ?? {}) as Record<string, unknown>,
    },
    getServerSiteUrl(),
  );

  await supabaseAdmin.from("portal_channels").update({ last_feed_at: new Date().toISOString() }).eq("id", channel.id);
  return feed;
}
