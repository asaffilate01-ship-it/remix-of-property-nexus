import { getRequest } from "@tanstack/react-start/server";

/** Best-effort caller identity for rate limiting (edge proxy headers). */
export function callerIdentifier(): string {
  try {
    const req = getRequest();
    const h = req?.headers;
    const ip =
      h?.get("cf-connecting-ip") ||
      h?.get("x-real-ip") ||
      h?.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    return ip;
  } catch {
    return "unknown";
  }
}

/**
 * Durable, DB-backed rate limit. Throws when the caller exceeds `limit`
 * requests inside `windowSeconds`. Fails open if the backend is unreachable.
 */
export async function enforceRateLimit(
  bucket: string,
  limit: number,
  windowSeconds: number,
  identifier = callerIdentifier(),
): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("check_rate_limit", {
      _bucket: bucket,
      _identifier: identifier,
      _limit: limit,
      _window_seconds: windowSeconds,
    });
    if (error) {
      console.error("[rate-limit] check failed", error.message);
      return;
    }
    if (data === false) {
      throw new Error("Too many requests. Please wait a moment and try again.");
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Too many requests")) throw err;
    console.error("[rate-limit] unexpected", err);
  }
}
