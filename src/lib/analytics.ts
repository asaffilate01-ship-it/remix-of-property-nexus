import { hasConsent } from "@/lib/consent";

/**
 * Consent-gated analytics. Nothing is sent unless the visitor granted the
 * "analytics" category AND an endpoint is configured via VITE_ANALYTICS_URL.
 */
const ENDPOINT = import.meta.env["VITE_ANALYTICS_URL"] as string | undefined;

export function analyticsEnabled() {
  return Boolean(ENDPOINT) && hasConsent("analytics");
}

export function trackPageView(path: string) {
  if (!analyticsEnabled()) return;
  try {
    const body = JSON.stringify({ type: "pageview", path, ref: document.referrer || null, ts: Date.now() });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT!, new Blob([body], { type: "application/json" }));
    } else {
      void fetch(ENDPOINT!, { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } });
    }
  } catch {
    /* never break the app for analytics */
  }
}
