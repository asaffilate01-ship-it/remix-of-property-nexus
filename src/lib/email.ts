export type OutboxEmail = {
  id: string;
  recipient_email: string;
  subject: string | null;
  html: string | null;
  template_name: string | null;
  template_data: unknown;
};

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : {};
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() || fallback : fallback;
}

function numberValue(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function stripMarkup(value: unknown): string {
  return String(value ?? "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function publicUrl(appUrl: string, path: unknown): string {
  const base = validatePublicAppUrl(appUrl);
  const candidate = stringValue(path, "/");
  const safePath = candidate.startsWith("/") && !candidate.startsWith("//") ? candidate : "/";
  return new URL(safePath, base).toString();
}

export function validatePublicAppUrl(appUrl: string): URL {
  const base = new URL(appUrl);
  if (base.username || base.password) throw new Error("APP_URL must not contain credentials");
  if (base.protocol !== "https:" && base.hostname !== "localhost" && base.hostname !== "127.0.0.1") {
    throw new Error("APP_URL must use HTTPS");
  }
  return base;
}

function layout(title: string, content: string, preheader: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f8fafc;color:#0f172a;font-family:Arial,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden">
<tr><td style="padding:22px 28px;background:#0f172a;color:#fff;font-size:21px;font-weight:700">Gabley</td></tr>
<tr><td style="padding:30px 28px"><h1 style="margin:0 0 18px;font-size:24px;line-height:1.25">${escapeHtml(title)}</h1>${content}</td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;line-height:1.5">This is a service email from Gabley. If you were not expecting it, you can safely ignore it.</td></tr>
</table></td></tr></table></body></html>`;
}

function button(label: string, url: string): string {
  return `<p style="margin:24px 0"><a href="${escapeHtml(url)}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:10px">${escapeHtml(label)}</a></p>`;
}

function signatureRequest(data: UnknownRecord, appUrl: string): RenderedEmail {
  const recipient = stringValue(data.recipient, "there");
  const title = stringValue(data.document_title, "Document");
  const expires = stringValue(data.expires_on);
  const url = publicUrl(appUrl, data.signing_path);
  const expiryCopy = expires ? ` This secure link expires on ${escapeHtml(expires)}.` : "";
  const content = `<p style="line-height:1.65">Hello ${escapeHtml(recipient)},</p>
<p style="line-height:1.65">You have been asked to review and sign <strong>${escapeHtml(title)}</strong>.${expiryCopy}</p>
${button("Review and sign", url)}
<p style="color:#64748b;font-size:13px;line-height:1.5">For your security, do not forward this personal signing link.</p>`;
  return {
    subject: `Signature requested: ${title}`,
    html: layout("Your signature is requested", content, `Review and sign ${title}`),
    text: `Hello ${recipient},\n\nYou have been asked to review and sign ${title}.${expires ? ` This link expires on ${expires}.` : ""}\n\n${url}\n\nDo not forward this personal signing link.`,
  };
}

function savedSearchMatches(data: UnknownRecord, appUrl: string): RenderedEmail {
  const searchName = stringValue(data.search_name, "your saved search");
  const source = Array.isArray(data.listings) ? data.listings.slice(0, 20) : [];
  const listings = source.map(asRecord);
  const count = Math.max(numberValue(data.listing_count, listings.length), listings.length);
  const rows = listings.map((listing) => {
    const title = stringValue(listing.title, "Property");
    const city = stringValue(listing.city);
    const price = numberValue(listing.price);
    const url = publicUrl(appUrl, listing.path);
    const detail = [price > 0 ? new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(price) : "", city].filter(Boolean).join(" · ");
    return `<li style="margin:0 0 14px"><a href="${escapeHtml(url)}" style="color:#0f172a;font-weight:700">${escapeHtml(title)}</a>${detail ? `<br><span style="color:#64748b;font-size:13px">${escapeHtml(detail)}</span>` : ""}</li>`;
  }).join("");
  const marketplaceUrl = publicUrl(appUrl, "/marketplace");
  const content = `<p style="line-height:1.65">${count} new ${count === 1 ? "property matches" : "properties match"} <strong>${escapeHtml(searchName)}</strong>.</p>
${rows ? `<ul style="padding-left:20px;margin:20px 0">${rows}</ul>` : ""}
${button("View matching properties", marketplaceUrl)}`;
  return {
    subject: `${count} new ${count === 1 ? "match" : "matches"} for ${searchName}`,
    html: layout("New properties for you", content, `${count} new saved-search matches`),
    text: `${count} new ${count === 1 ? "property matches" : "properties match"} ${searchName}.\n\n${listings.map((listing) => `${stringValue(listing.title, "Property")}: ${publicUrl(appUrl, listing.path)}`).join("\n")}\n\n${marketplaceUrl}`,
  };
}

function expiryReminder(data: UnknownRecord): RenderedEmail {
  const recipient = stringValue(data.recipient, "there");
  const item = stringValue(data.item, "An item");
  const days = numberValue(data.days);
  const expires = stringValue(data.expires_on);
  const content = `<p style="line-height:1.65">Hello ${escapeHtml(recipient)},</p><p style="line-height:1.65"><strong>${escapeHtml(item)}</strong> expires in ${escapeHtml(days)} day${days === 1 ? "" : "s"}${expires ? `, on ${escapeHtml(expires)}` : ""}.</p><p style="line-height:1.65">Please contact your property manager if action is required.</p>`;
  return {
    subject: `${item} expires in ${days} day${days === 1 ? "" : "s"}`,
    html: layout("Expiry reminder", content, `${item} expires soon`),
    text: `Hello ${recipient},\n\n${item} expires in ${days} day${days === 1 ? "" : "s"}${expires ? `, on ${expires}` : ""}. Please contact your property manager if action is required.`,
  };
}

function genericNotification(email: OutboxEmail, data: UnknownRecord): RenderedEmail {
  const subject = stringValue(email.subject, "Notification from Gabley").slice(0, 200);
  const body = stringValue(data.body, stripMarkup(email.html) || "You have a new notification.").slice(0, 10_000);
  const content = `<p style="white-space:pre-wrap;line-height:1.65">${escapeHtml(body)}</p>`;
  return { subject, html: layout(subject, content, subject), text: body };
}

export function renderOutboxEmail(email: OutboxEmail, appUrl: string): RenderedEmail {
  validatePublicAppUrl(appUrl);

  const data = asRecord(email.template_data);
  switch (email.template_name) {
    case "signature-request":
      return signatureRequest(data, appUrl);
    case "saved-search-matches":
      return savedSearchMatches(data, appUrl);
    case "contract-expiry-reminder":
      return expiryReminder(data);
    case "generic-notification":
    case "track-step":
    default:
      return genericNotification(email, data);
  }
}
