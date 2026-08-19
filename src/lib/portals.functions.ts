import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { PORTALS } from "@/lib/portals";

const portalEnum = z.enum(PORTALS);

export const listPortalChannels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { resolveAgencyId } = await import("@/lib/portals-core.server");
    const agencyId = await resolveAgencyId(context.supabase, context.userId);
    if (!agencyId) return { agency_id: null, channels: [], origin: "" };

    const { getServerSiteUrl } = await import("@/lib/site-url.server");
    const { data, error } = await context.supabase
      .from("portal_channels")
      .select("*")
      .eq("agency_id", agencyId)
      .order("portal");
    if (error) throw new Error(error.message);
    return { agency_id: agencyId, channels: data ?? [], origin: getServerSiteUrl() };
  });

export const upsertPortalChannel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        portal: portalEnum,
        enabled: z.boolean().default(true),
        auto_publish: z.boolean().default(false),
        branch_ref: z.string().max(120).nullable().optional(),
        network_ref: z.string().max(120).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { resolveAgencyId } = await import("@/lib/portals-core.server");
    const agencyId = await resolveAgencyId(context.supabase, context.userId);
    if (!agencyId) throw new Error("You need an agency before configuring portals.");

    const { data: row, error } = await context.supabase
      .from("portal_channels")
      .upsert(
        {
          agency_id: agencyId,
          portal: data.portal,
          enabled: data.enabled,
          auto_publish: data.auto_publish,
          branch_ref: data.branch_ref ?? null,
          network_ref: data.network_ref ?? null,
        },
        { onConflict: "agency_id,portal,branch_id" },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { channel: row };
  });

export const rotateFeedToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ channel_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { randomToken } = await import("@/lib/portals-core.server");
    const { data: row, error } = await context.supabase
      .from("portal_channels")
      .update({ feed_token: randomToken() })
      .eq("id", data.channel_id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { channel: row };
  });

export const getListingSyndication = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ listing_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("portal_listings")
      .select("*, portal_channels(portal, enabled, branch_ref)")
      .eq("listing_id", data.listing_id);
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

export const syndicateListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        listing_id: z.string().uuid(),
        portals: z.array(portalEnum).min(1).max(10),
        mode: z.enum(["publish", "remove"]).default("publish"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { syndicate } = await import("@/lib/portals-core.server");
    return syndicate(context.supabase, context.userId, data.listing_id, data.portals, data.mode);
  });

export const listPortalEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { resolveAgencyId } = await import("@/lib/portals-core.server");
    const agencyId = await resolveAgencyId(context.supabase, context.userId);
    if (!agencyId) return { events: [] };
    const { data } = await context.supabase
      .from("portal_events")
      .select("*, portal_channels!inner(portal, agency_id), listings(title, slug)")
      .eq("portal_channels.agency_id", agencyId)
      .order("created_at", { ascending: false })
      .limit(50);
    return { events: data ?? [] };
  });
