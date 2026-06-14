/// <reference types="google.maps" />

declare global {
  interface Window {
    google?: typeof google;
    __estatelyInitMap?: () => void;
  }
}

let loaderPromise: Promise<void> | null = null;

/**
 * Shared Google Maps JS API loader. Ensures the script tag is only injected once
 * across the whole app, even if multiple map components mount in parallel.
 */
export function loadGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("Google Maps requires a browser"));
  if (window.google?.maps) return Promise.resolve();
  if (loaderPromise) return loaderPromise;

  const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
  const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID ?? "";
  if (!key) return Promise.reject(new Error("Google Maps key missing"));

  // If a previous attempt injected the tag, don't inject again.
  const existing = document.querySelector<HTMLScriptElement>('script[data-estately-gmaps="1"]');

  loaderPromise = new Promise<void>((resolve, reject) => {
    const settle = () => {
      if (window.google?.maps) resolve();
      else reject(new Error("Google Maps loaded without google.maps namespace"));
    };
    window.__estatelyInitMap = settle;

    if (existing) {
      // Script already there (e.g. HMR) — wait for it.
      if (window.google?.maps) return resolve();
      existing.addEventListener("load", settle, { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Maps")), { once: true });
      return;
    }

    const s = document.createElement("script");
    s.dataset.estatelyGmaps = "1";
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&loading=async&callback=__estatelyInitMap${channel ? `&channel=${channel}` : ""}`;
    s.async = true;
    s.defer = true;
    s.onerror = () => {
      loaderPromise = null;
      reject(new Error("Failed to load Google Maps"));
    };
    document.head.appendChild(s);
  }).catch((e) => {
    loaderPromise = null;
    throw e;
  });

  return loaderPromise;
}
