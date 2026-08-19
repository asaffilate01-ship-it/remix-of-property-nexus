// Server-only portal feed builders and real-time push adapters.
import { PORTAL_META, type PortalId } from "./portals";

export type FeedListing = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  address: string | null;
  city: string | null;
  postcode: string | null;
  price: number | null;
  currency: string;
  purpose: string;
  listing_type: string;
  property_type_code: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  receptions: number | null;
  epc_rating: string | null;
  tenure: string | null;
  furnished: string | null;
  available_from: string | null;
  latitude: number | null;
  longitude: number | null;
  features: unknown;
  photos: unknown;
  floorplan_url: string | null;
  tour_url: string | null;
  status: string;
  updated_at: string;
  created_at: string;
};

export type FeedChannel = {
  id: string;
  portal: PortalId;
  branch_ref: string | null;
  network_ref: string | null;
  config: Record<string, unknown>;
};

const esc = (v: unknown): string =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const toArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x) => typeof x === "string") as string[] : [];

const photoUrls = (l: FeedListing, origin: string): string[] =>
  toArray(l.photos).map((p) =>
    p.startsWith("http") ? p : `${origin.replace(/\/$/, "")}/storage/${p.replace(/^\//, "")}`,
  );

const isSale = (l: FeedListing) => l.purpose === "sale" || l.listing_type === "sale";

function listingUrl(origin: string, l: FeedListing) {
  return `${origin.replace(/\/$/, "")}/marketplace/${l.slug}`;
}

// ---------- Rightmove BLM (Adobe/ADF v3) ----------
function buildBlm(listings: FeedListing[], channel: FeedChannel, origin: string): string {
  const EOF_ = "^";
  const EOR = "|";
  const cols = [
    "AGENT_REF", "ADDRESS_1", "ADDRESS_2", "ADDRESS_3", "TOWN", "POSTCODE1", "POSTCODE2",
    "DISPLAY_ADDRESS", "PROP_SUB_ID", "TRANS_TYPE_ID", "PRICE", "PRICE_QUALIFIER",
    "BEDROOMS", "BATHROOMS", "RECEPTIONS", "SUMMARY", "DESCRIPTION", "FEATURE1", "FEATURE2",
    "FEATURE3", "MEDIA_IMAGE_00", "MEDIA_IMAGE_01", "MEDIA_IMAGE_02", "MEDIA_FLOOR_PLAN_00",
    "MEDIA_VIRTUAL_TOUR_00", "PUBLISHED_FLAG", "LATITUDE", "LONGITUDE", "UPDATE_DATE", "CREATE_DATE",
  ];
  const header = [
    "#HEADER#",
    "Version : 3",
    `EOF : '${EOF_}'`,
    `EOR : '${EOR}'`,
    `Property Count : ${listings.length}`,
    `Generated Date : ${new Date().toISOString()}`,
    `Branch ID : ${channel.branch_ref ?? ""}`,
    "#DEFINITION#",
    cols.join(`${EOF_}`) + EOF_ + EOR,
    "#DATA#",
  ].join("\n");

  const clean = (v: unknown) =>
    String(v ?? "").replace(/[\^|\r\n]/g, " ").trim();

  const rows = listings.map((l) => {
    const pc = (l.postcode ?? "").trim().toUpperCase();
    const [pc1, pc2] = pc.includes(" ") ? pc.split(/\s+/) : [pc.slice(0, -3), pc.slice(-3)];
    const imgs = photoUrls(l, origin);
    const feats = toArray(l.features);
    const values = [
      l.id,
      clean(l.address), "", "",
      clean(l.city), clean(pc1), clean(pc2),
      clean([l.address, l.city].filter(Boolean).join(", ")),
      l.property_type_code ?? "0",
      isSale(l) ? "1" : "2",
      l.price ?? 0,
      "0",
      l.bedrooms ?? 0, l.bathrooms ?? 0, l.receptions ?? 0,
      clean((l.description ?? "").slice(0, 300)),
      clean(l.description),
      clean(feats[0]), clean(feats[1]), clean(feats[2]),
      imgs[0] ?? "", imgs[1] ?? "", imgs[2] ?? "",
      l.floorplan_url ?? "",
      l.tour_url ?? "",
      l.status === "live" ? "1" : "0",
      l.latitude ?? "", l.longitude ?? "",
      l.updated_at.replace("T", " ").slice(0, 19),
      l.created_at.replace("T", " ").slice(0, 19),
    ];
    return values.join(EOF_) + EOF_ + EOR;
  });

  return `${header}\n${rows.join("\n")}\n#END#\n`;
}

// ---------- ZPG (Zoopla / PrimeLocation) XML ----------
function buildZpgXml(listings: FeedListing[], channel: FeedChannel, origin: string): string {
  const items = listings
    .map((l) => {
      const imgs = photoUrls(l, origin);
      return `  <property>
    <agent_ref>${esc(l.id)}</agent_ref>
    <branch_reference>${esc(channel.branch_ref ?? "")}</branch_reference>
    <listing_reference>${esc(l.slug)}</listing_reference>
    <channel>${isSale(l) ? "sales" : "lettings"}</channel>
    <life_cycle_status>${l.status === "live" ? "available" : "hidden"}</life_cycle_status>
    <display_address>${esc([l.address, l.city].filter(Boolean).join(", "))}</display_address>
    <address>
      <line_1>${esc(l.address)}</line_1>
      <town_or_city>${esc(l.city)}</town_or_city>
      <postal_code>${esc(l.postcode)}</postal_code>
      <country_code>GB</country_code>
    </address>
    ${l.latitude != null && l.longitude != null ? `<coordinates><latitude>${l.latitude}</latitude><longitude>${l.longitude}</longitude></coordinates>` : ""}
    <property_type>${esc(l.property_type_code ?? "flat")}</property_type>
    ${isSale(l) ? `<pricing><price>${l.price ?? 0}</price><currency_code>${esc(l.currency)}</currency_code><transaction_type>sale</transaction_type></pricing>` : `<pricing><rent>${l.price ?? 0}</rent><rent_frequency>per_month</rent_frequency><currency_code>${esc(l.currency)}</currency_code><transaction_type>rent</transaction_type></pricing>`}
    <detailed_description><heading>${esc(l.title)}</heading><text>${esc(l.description)}</text></detailed_description>
    <summary>${esc((l.description ?? "").slice(0, 400))}</summary>
    <bedrooms>${l.bedrooms ?? 0}</bedrooms>
    <bathrooms>${l.bathrooms ?? 0}</bathrooms>
    <reception_rooms>${l.receptions ?? 0}</reception_rooms>
    ${l.epc_rating ? `<energy_performance_certificate><current_energy_rating>${esc(l.epc_rating)}</current_energy_rating></energy_performance_certificate>` : ""}
    ${l.tenure ? `<tenure>${esc(l.tenure)}</tenure>` : ""}
    ${l.furnished ? `<furnished_state>${esc(l.furnished)}</furnished_state>` : ""}
    ${l.available_from ? `<available_from_date>${esc(l.available_from)}</available_from_date>` : ""}
    <features>${toArray(l.features).slice(0, 10).map((f) => `<feature>${esc(f)}</feature>`).join("")}</features>
    <detail_url>${esc(listingUrl(origin, l))}</detail_url>
    <media>${imgs.slice(0, 20).map((u, i) => `<image><url>${esc(u)}</url><rank>${i + 1}</rank></image>`).join("")}${l.floorplan_url ? `<floorplan><url>${esc(l.floorplan_url)}</url></floorplan>` : ""}${l.tour_url ? `<virtual_tour><url>${esc(l.tour_url)}</url></virtual_tour>` : ""}</media>
    <update_date>${esc(l.updated_at)}</update_date>
  </property>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<listings generated="${esc(new Date().toISOString())}" branch="${esc(channel.branch_ref ?? "")}" network="${esc(channel.network_ref ?? "")}">
${items}
</listings>
`;
}

// ---------- OnTheMarket XML ----------
function buildOtmXml(listings: FeedListing[], channel: FeedChannel, origin: string): string {
  const items = listings
    .map((l) => {
      const imgs = photoUrls(l, origin);
      return `  <property id="${esc(l.id)}">
    <agent_ref>${esc(l.id)}</agent_ref>
    <branch_id>${esc(channel.branch_ref ?? "")}</branch_id>
    <status>${l.status === "live" ? "available" : "withdrawn"}</status>
    <department>${isSale(l) ? "residential sales" : "residential lettings"}</department>
    <address>${esc([l.address, l.city].filter(Boolean).join(", "))}</address>
    <postcode>${esc(l.postcode)}</postcode>
    <price>${l.price ?? 0}</price>
    <price_qualifier>${isSale(l) ? "guide price" : "pcm"}</price_qualifier>
    <bedrooms>${l.bedrooms ?? 0}</bedrooms>
    <bathrooms>${l.bathrooms ?? 0}</bathrooms>
    <receptions>${l.receptions ?? 0}</receptions>
    <property_type>${esc(l.property_type_code ?? "flat")}</property_type>
    ${l.epc_rating ? `<epc_rating>${esc(l.epc_rating)}</epc_rating>` : ""}
    <summary>${esc((l.description ?? "").slice(0, 400))}</summary>
    <description>${esc(l.description)}</description>
    <features>${toArray(l.features).slice(0, 10).map((f) => `<feature>${esc(f)}</feature>`).join("")}</features>
    <url>${esc(listingUrl(origin, l))}</url>
    <images>${imgs.slice(0, 20).map((u, i) => `<image order="${i + 1}">${esc(u)}</image>`).join("")}</images>
    ${l.floorplan_url ? `<floorplan>${esc(l.floorplan_url)}</floorplan>` : ""}
    <last_updated>${esc(l.updated_at)}</last_updated>
  </property>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<data generated="${esc(new Date().toISOString())}">
  <properties>
${items}
  </properties>
</data>
`;
}

// ---------- Own website JSON ----------
function buildJson(listings: FeedListing[], origin: string): string {
  return JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      count: listings.length,
      listings: listings.map((l) => ({
        id: l.id,
        slug: l.slug,
        url: listingUrl(origin, l),
        title: l.title,
        description: l.description,
        purpose: l.purpose,
        price: l.price,
        currency: l.currency,
        address: l.address,
        city: l.city,
        postcode: l.postcode,
        bedrooms: l.bedrooms,
        bathrooms: l.bathrooms,
        receptions: l.receptions,
        epc_rating: l.epc_rating,
        tenure: l.tenure,
        furnished: l.furnished,
        available_from: l.available_from,
        latitude: l.latitude,
        longitude: l.longitude,
        features: toArray(l.features),
        images: photoUrls(l, origin),
        floorplan_url: l.floorplan_url,
        tour_url: l.tour_url,
        updated_at: l.updated_at,
      })),
    },
    null,
    2,
  );
}

export function buildFeed(
  portal: PortalId,
  listings: FeedListing[],
  channel: FeedChannel,
  origin: string,
): { body: string; contentType: string } {
  switch (portal) {
    case "rightmove":
      return { body: buildBlm(listings, channel, origin), contentType: "text/plain; charset=utf-8" };
    case "zoopla":
    case "primelocation":
      return { body: buildZpgXml(listings, channel, origin), contentType: "application/xml; charset=utf-8" };
    case "onthemarket":
      return { body: buildOtmXml(listings, channel, origin), contentType: "application/xml; charset=utf-8" };
    case "gabley_site":
    default:
      return { body: buildJson(listings, origin), contentType: "application/json; charset=utf-8" };
  }
}

// ---------- Real-time push adapters ----------
export type PushResult = {
  delivered: boolean;
  external_ref?: string;
  detail: string;
};

export type PushMode = "publish" | "remove";

/**
 * Push a single listing to a portal's real-time API.
 * Returns delivered=false (with a reason) when the portal has no push API or
 * the agency has not supplied credentials — the scheduled feed still carries
 * the listing in that case.
 */
export async function pushListing(
  portal: PortalId,
  channel: FeedChannel,
  listing: FeedListing,
  origin: string,
  mode: PushMode = "publish",
): Promise<PushResult> {
  const meta = PORTAL_META[portal];
  if (!meta.supportsPush) {
    return { delivered: false, detail: `${meta.name} collects the feed on their own schedule — no push API.` };
  }

  if (portal === "zoopla") {
    const key = process.env.ZOOPLA_API_KEY;
    const base = process.env.ZOOPLA_API_URL ?? "https://realtime-listings-api.webservices.zpg.co.uk/live/v2";
    if (!key) {
      return { delivered: false, detail: "ZOOPLA_API_KEY is not configured — listing will go out on the next scheduled feed." };
    }
    const payload =
      mode === "remove"
        ? {
            branch_reference: channel.branch_ref ?? "",
            listing_reference: listing.slug,
            deleted_at: new Date().toISOString(),
          }
        : JSON.parse(buildZpgJsonPush(listing, channel, origin));
    const res = await fetch(`${base}/listing/${mode === "remove" ? "delete" : "update"}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "ZPG-Listing-ETag": listing.updated_at, "X-Api-Key": key },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Zoopla rejected the listing (${res.status}): ${text.slice(0, 300)}`);
    return { delivered: true, external_ref: listing.slug, detail: `Zoopla accepted the ${mode}.` };
  }

  if (portal === "rightmove") {
    const network = channel.network_ref ?? process.env.RIGHTMOVE_NETWORK_ID;
    const branch = channel.branch_ref;
    const cert = process.env.RIGHTMOVE_API_KEY;
    const base = process.env.RIGHTMOVE_API_URL ?? "https://adfapi.rightmove.co.uk/v1/property";
    if (!cert || !network || !branch) {
      return {
        delivered: false,
        detail: "Rightmove RTDF needs RIGHTMOVE_API_KEY plus network and branch IDs — listing stays on the scheduled feed.",
      };
    }
    const body = {
      network: { network_id: Number(network) },
      branch: { branch_id: Number(branch) },
      property: {
        agent_ref: listing.id,
        published: mode === "publish" ? 1 : 0,
        display_address: [listing.address, listing.city].filter(Boolean).join(", "),
        postcode1: (listing.postcode ?? "").split(" ")[0],
        postcode2: (listing.postcode ?? "").split(" ")[1] ?? "",
        price: listing.price ?? 0,
        bedrooms: listing.bedrooms ?? 0,
        bathrooms: listing.bathrooms ?? 0,
        summary: (listing.description ?? "").slice(0, 300),
        description: listing.description ?? "",
        transaction_type_id: isSale(listing) ? 1 : 2,
        media: photoUrls(listing, origin).slice(0, 20).map((url, i) => ({ media_type: "image", media_url: url, media_order: i })),
      },
    };
    const res = await fetch(`${base}/sendpropertydetails`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cert}` },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Rightmove rejected the listing (${res.status}): ${text.slice(0, 300)}`);
    return { delivered: true, external_ref: listing.id, detail: `Rightmove accepted the ${mode}.` };
  }

  return { delivered: false, detail: "No push adapter for this portal." };
}

function buildZpgJsonPush(l: FeedListing, channel: FeedChannel, origin: string): string {
  return JSON.stringify({
    branch_reference: channel.branch_ref ?? "",
    listing_reference: l.slug,
    life_cycle_status: l.status === "live" ? "available" : "hidden",
    channel: isSale(l) ? "sales" : "lettings",
    property_type: l.property_type_code ?? "flat",
    detailed_description: [{ heading: l.title, text: l.description ?? "" }],
    summary_description: (l.description ?? "").slice(0, 400),
    display_address: [l.address, l.city].filter(Boolean).join(", "),
    country_code: "GB",
    postal_code: l.postcode ?? "",
    ...(isSale(l) ? { pricing: { price: l.price ?? 0, transaction_type: "sale" } } : { pricing: { rent: l.price ?? 0, rent_frequency: "per_month", transaction_type: "rent" } }),
    num_bedrooms: l.bedrooms ?? 0,
    num_bathrooms: l.bathrooms ?? 0,
    num_reception_rooms: l.receptions ?? 0,
    features: toArray(l.features).slice(0, 10),
    detail_url: listingUrl(origin, l),
    images: photoUrls(l, origin).slice(0, 20).map((url, i) => ({ url, rank: i + 1 })),
    ...(l.latitude != null && l.longitude != null ? { coordinates: { latitude: l.latitude, longitude: l.longitude } } : {}),
    update_date: l.updated_at,
  });
}
