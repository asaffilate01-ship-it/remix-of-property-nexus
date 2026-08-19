// Shared (browser-safe) portal syndication metadata.

export const PORTALS = [
  "rightmove",
  "zoopla",
  "onthemarket",
  "primelocation",
  "gabley_site",
] as const;

export type PortalId = (typeof PORTALS)[number];

export type PortalMeta = {
  id: PortalId;
  name: string;
  blurb: string;
  /** Feed format served at the public feed endpoint. */
  format: "blm" | "xml" | "json";
  /** Label for the portal's own account/branch identifier. */
  refLabel: string;
  refHint: string;
  /** Whether the portal accepts a real-time API push in addition to the feed. */
  supportsPush: boolean;
  docsUrl: string;
};

export const PORTAL_META: Record<PortalId, PortalMeta> = {
  rightmove: {
    id: "rightmove",
    name: "Rightmove",
    blurb: "Adobe/BLM property feed plus Real Time Datafeed (RTDF) push.",
    format: "blm",
    refLabel: "Branch ID",
    refHint: "Your Rightmove branch ID (e.g. 12345), issued by Rightmove Data Services.",
    supportsPush: true,
    docsUrl: "https://www.rightmove.co.uk/adf/",
  },
  zoopla: {
    id: "zoopla",
    name: "Zoopla",
    blurb: "Zoopla / ZPG member XML feed with hourly pickup or API push.",
    format: "xml",
    refLabel: "Branch reference",
    refHint: "Your ZPG branch reference supplied when your feed was approved.",
    supportsPush: true,
    docsUrl: "https://realtime-listings.webservices.zpg.co.uk/docs/latest/documentation.html",
  },
  onthemarket: {
    id: "onthemarket",
    name: "OnTheMarket",
    blurb: "OnTheMarket v3 XML feed, polled on their schedule.",
    format: "xml",
    refLabel: "Agent ID",
    refHint: "Your OnTheMarket agent/branch identifier.",
    supportsPush: false,
    docsUrl: "https://www.onthemarket.com/agents/",
  },
  primelocation: {
    id: "primelocation",
    name: "PrimeLocation",
    blurb: "Distributed through the same ZPG feed as Zoopla.",
    format: "xml",
    refLabel: "Branch reference",
    refHint: "Usually the same reference as your Zoopla branch.",
    supportsPush: false,
    docsUrl: "https://www.primelocation.com/",
  },
  gabley_site: {
    id: "gabley_site",
    name: "Your own website",
    blurb: "Clean JSON feed you can drop into any website or headless build.",
    format: "json",
    refLabel: "Site reference",
    refHint: "Optional label so you can tell multiple sites apart.",
    supportsPush: false,
    docsUrl: "https://gabley.co.uk/for-agents",
  },
};

export const PORTAL_LIST: PortalMeta[] = PORTALS.map((p) => PORTAL_META[p]);

export type PortalListingStatus = "queued" | "sent" | "live" | "removed" | "error";

export const PORTAL_STATUS_LABEL: Record<PortalListingStatus, string> = {
  queued: "Queued",
  sent: "Sent",
  live: "Live",
  removed: "Removed",
  error: "Error",
};

export function feedExtension(portal: PortalId): string {
  const f = PORTAL_META[portal].format;
  return f === "blm" ? "blm" : f === "json" ? "json" : "xml";
}

export function feedUrl(origin: string, token: string, portal: PortalId): string {
  return `${origin.replace(/\/$/, "")}/api/public/feeds/${token}.${feedExtension(portal)}`;
}
