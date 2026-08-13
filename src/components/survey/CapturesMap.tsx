/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";
import { signedUrl } from "@/lib/survey";
import { loadGoogleMaps } from "@/lib/googleMaps";

type Pin = {
  id: string;
  lat: number;
  lng: number;
  kind: "photo" | "video";
  storage_path: string;
  caption: string | null;
  captured_at: string;
};

export function CapturesMap({ pins }: { pins: Pin[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let map: google.maps.Map | null = null;
    const markers: google.maps.Marker[] = [];
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
              const content = document.createElement("div");
              content.style.cssText = "max-width:220px;font:13px system-ui";
              const media = document.createElement(p.kind === "photo" ? "img" : "video");
              media.src = url;
              media.style.cssText = "width:100%;border-radius:6px;margin-bottom:6px";
              if (media instanceof HTMLVideoElement) media.controls = true;
              const caption = document.createElement("div");
              caption.style.fontWeight = "600";
              caption.textContent = p.caption ?? "Capture";
              const timestamp = document.createElement("div");
              timestamp.style.cssText = "color:#666;font-size:12px";
              timestamp.textContent = new Date(p.captured_at).toLocaleString();
              content.append(media, caption, timestamp);
              info!.setContent(content);
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
