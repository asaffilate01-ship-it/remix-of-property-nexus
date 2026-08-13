import { createHash, timingSafeEqual } from "node:crypto";

function secureEqual(left: string, right: string): boolean {
  const leftDigest = createHash("sha256").update(left).digest();
  const rightDigest = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftDigest, rightDigest);
}

function noStoreResponse(message: string, status: number): Response {
  return new Response(message, {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "text/plain; charset=utf-8",
    },
  });
}

/**
 * Protects service-role cron routes. CRON_SECRET must be configured and sent
 * as either `Authorization: Bearer <secret>` or `X-Cron-Secret: <secret>`.
 */
export function authorizeCronRequest(request: Request): Response | null {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) {
    console.error("CRON_SECRET is not configured; refusing privileged cron request");
    return noStoreResponse("Cron endpoint is not configured", 503);
  }

  const authorization = request.headers.get("authorization") ?? "";
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const supplied = bearer || request.headers.get("x-cron-secret")?.trim() || "";

  if (!supplied || !secureEqual(supplied, expected)) {
    return noStoreResponse("Unauthorized", 401);
  }

  return null;
}

function hostMatchesPattern(hostname: string, pattern: string): boolean {
  const normalized = pattern.trim().toLowerCase().replace(/\.$/, "");
  if (!normalized) return false;
  if (normalized.startsWith("*.")) {
    const suffix = normalized.slice(2);
    return hostname.endsWith(`.${suffix}`) && hostname !== suffix;
  }
  return hostname === normalized;
}

/**
 * Automation webhooks are outbound privileged requests, so they are HTTPS-only
 * and fail closed unless their hostname is explicitly allowlisted.
 */
export function validateAutomationWebhookUrl(rawUrl: unknown): URL {
  if (typeof rawUrl !== "string" || rawUrl.length === 0 || rawUrl.length > 2048) {
    throw new Error("Webhook URL is invalid");
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Webhook URL is invalid");
  }

  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error("Webhook URL must use HTTPS and must not contain credentials");
  }
  if (url.port && url.port !== "443") {
    throw new Error("Webhook URL must use the default HTTPS port");
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  const allowedHosts = (process.env.AUTOMATION_WEBHOOK_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (!allowedHosts.length) {
    throw new Error("Automation webhooks are disabled until an allowlist is configured");
  }
  if (!allowedHosts.some((pattern) => hostMatchesPattern(hostname, pattern))) {
    throw new Error("Webhook host is not allowed");
  }

  return url;
}

export function normalizeWebhookMethod(method: unknown): "POST" | "PUT" | "PATCH" {
  const normalized = typeof method === "string" ? method.toUpperCase() : "POST";
  if (normalized !== "POST" && normalized !== "PUT" && normalized !== "PATCH") {
    throw new Error("Webhook method is not allowed");
  }
  return normalized;
}
