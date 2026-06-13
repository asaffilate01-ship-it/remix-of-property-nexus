/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";
import { signedUrl } from "@/lib/survey";

type Pin = {
  id: string;
  lat: number;
  lng: number;
  kind: "photo" | "video";
  storage_path: string;
  caption: string | null;
  captured_at: string;
};

declare global {
  interface Window { google?: typeof google; __estatelyInitMap?: () => void }
}

let loaderPromise: Promise<void> | null = null;
function loadGoogleMaps(): Promise<void> {
  if (window.google?.maps) return Promise.resolve();
  if (loaderPromise) return loaderPromise;
  const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
  if (!key) return Promise.reject(new Error("Google Maps key missing"));
  loaderPromise = new Promise<void>((resolve, reject) => {
    window.__estatelyInitMap = () => resolve();
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=__estatelyInitMap`;
    s.async = true; s.defer = true;
    s.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(s);
  });
  return loaderPromise;
}

export function CapturesMap({ pins }: { pins: Pin[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let map: google.maps.Map | null = null;
    let markers: google.maps.Marker[] = [];
    let info: google.maps.InfoWindow | null = null;

    (async () => {
      try {
        await loadGoogleMaps();
        if (cancelled || !ref.current || !window.google) return;
        const valid = pins.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
        const center = valid[0] ? { lat: valid[0].lat, lng: valid[0].lng } : { lat: 54.5, lng: -2.5 };
        map = new window.google.maps.Map(ref.current, {
          center, zoom: valid.length ? 13 : 6, mapTypeControl: false, streetViewControl: false, fullscreenControl: false,
        });
        info = new window.google.maps.InfoWindow();
        const bounds = new window.google.maps.LatLngBounds();
        for (const p of valid) {
          const m = new window.google.maps.Marker({ position: { lat: p.lat, lng: p.lng }, map });
          m.addListener("click", async () => {
            try {
              const url = await signedUrl(p.storage_path);
              info!.setContent(`
                <div style="max-width:220px;font:13px system-ui">
                  ${p.kind === "photo"
                    ? `<img src="${url}" style="width:100%;border-radius:6px;margin-bottom:6px" />`
                    : `<video src="${url}" controls style="width:100%;border-radius:6px;margin-bottom:6px"></video>`}
                  <div style="font-weight:600">${(p.caption ?? "Capture").replace(/[<>]/g, "")}</div>
                  <div style="color:#666;font-size:12px">${new Date(p.captured_at).toLocaleString()}</div>
                </div>`);
              info!.open(map!, m);
            } catch { /* ignore */ }
          });
          markers.push(m);
          bounds.extend({ lat: p.lat, lng: p.lng });
        }
        if (valid.length > 1) map.fitBounds(bounds, 60);
      } catch (e: any) {
        if (!cancelled) setErr(e.message ?? "Map failed to load");
      }
    })();

    return () => { cancelled = true; markers.forEach((m) => m.setMap(null)); info?.close(); };
  }, [pins]);

  if (err) return <div className="h-96 rounded-xl border bg-muted flex items-center justify-center text-sm text-muted-foreground">{err}</div>;
  return <div ref={ref} className="h-[60vh] rounded-xl border" />;
}
