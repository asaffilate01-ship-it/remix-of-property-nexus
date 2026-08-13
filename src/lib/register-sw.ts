// Guarded service-worker registration.
// Refuses to register in dev, iframe previews, Lovable preview hostnames, or with ?sw=off.
// In those contexts it unregisters any matching SW so stale caches can't strand users.

const SW_URL = "/sw.js";

function shouldRefuse(): boolean {
  if (typeof window === "undefined") return true;
  if (!import.meta.env.PROD) return true;
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  const host = window.location.hostname;
  if (host.startsWith("id-preview--") || host.startsWith("preview--")) return true;
  if (host === "lovableproject.com" || host.endsWith(".lovableproject.com")) return true;
  if (host === "lovableproject-dev.com" || host.endsWith(".lovableproject-dev.com")) return true;
  if (host === "beta.lovable.dev" || host.endsWith(".beta.lovable.dev")) return true;
  if (new URLSearchParams(window.location.search).get("sw") === "off") return true;
  return false;
}

async function unregisterMatching(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs
        .filter((r) => {
          const url = r.active?.scriptURL ?? r.waiting?.scriptURL ?? r.installing?.scriptURL ?? "";
          return url.endsWith(SW_URL);
        })
        .map((r) => r.unregister()),
    );
  } catch {
    /* noop */
  }
}

export function registerServiceWorker(): void {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  void (async () => {
    if (shouldRefuse()) {
      await unregisterMatching();
      return;
    }

    try {
      // A previous build cached authenticated navigation responses. Remove that
      // cache before enabling the static-assets-only worker.
      if ("caches" in window) await caches.delete("html-navigations");
      await navigator.serviceWorker.register(SW_URL, { scope: "/" });
    } catch (error) {
      console.warn("Service worker registration failed", error);
    }
  })();
}
