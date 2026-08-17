/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/googleMaps";

type Listing = {
  id: string;
  slug: string;
  title: string;
  city: string | null;
  price: number | null;
  currency: string;
  latitude?: number | null;
  longitude?: number | null;
  postcode?: string | null;
};

export function GoogleListingsMap({
  listings,
  onMarkerClick,
}: {
  listings: Listing[];
  onMarkerClick?: (l: Listing) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoRef = useRef<google.maps.InfoWindow | null>(null);
  const markerClickRef = useRef(onMarkerClick);
  const [err, setErr] = useState<string | null>(null);

  markerClickRef.current = onMarkerClick;

  useEffect(() => {
    let cancelled = false;
    const withGeo = listings.filter(
      (listing) => listing.latitude != null && listing.longitude != null,
    );
    loadGoogleMaps()
      .then(() => {
        if (cancelled || !ref.current || !window.google) return;
        if (!mapRef.current) {
          mapRef.current = new google.maps.Map(ref.current, {
            center: { lat: 54.5, lng: -2.5 },
            zoom: 6,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
          });
          infoRef.current = new google.maps.InfoWindow();
        }
        // clear markers
        markersRef.current.forEach((m) => m.setMap(null));
        markersRef.current = [];

        const bounds = new google.maps.LatLngBounds();
        withGeo.forEach((l) => {
          const pos = { lat: Number(l.latitude), lng: Number(l.longitude) };
          const m = new google.maps.Marker({
            position: pos,
            map: mapRef.current!,
            title: l.title,
            label: l.price
              ? {
                  text: priceShort(l.price, l.currency),
                  className: "gabley-pin",
                  color: "#fff",
                  fontSize: "11px",
                  fontWeight: "600",
                }
              : undefined,
          });
          m.addListener("click", () => {
            const html = `<div style="font-family:inherit;max-width:220px"><div style="font-weight:600;font-size:13px;margin-bottom:2px">${escapeHtml(l.title)}</div><div style="font-size:11px;color:#666">${escapeHtml(l.city ?? "")}</div><div style="font-weight:700;color:#0a7d49;margin-top:4px">${l.price ? new Intl.NumberFormat("en-GB", { style: "currency", currency: l.currency || "GBP", maximumFractionDigits: 0 }).format(Number(l.price)) : "POA"}</div><a href="/marketplace/${l.slug}" style="display:inline-block;margin-top:6px;font-size:12px;color:#2563eb">View listing →</a></div>`;
            infoRef.current!.setContent(html);
            infoRef.current!.open({ anchor: m, map: mapRef.current! });
            markerClickRef.current?.(l);
          });
          markersRef.current.push(m);
          bounds.extend(pos);
        });

        if (withGeo.length === 1) {
          mapRef.current.setCenter(bounds.getCenter());
          mapRef.current.setZoom(14);
        } else if (withGeo.length > 1) {
          mapRef.current.fitBounds(bounds, 48);
        }
      })
      .catch((e) => setErr(e.message));
    return () => {
      cancelled = true;
    };
  }, [listings]);

  if (err) {
    return (
      <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground p-4 text-center">
        {err}
      </div>
    );
  }
  return <div ref={ref} className="w-full h-full" />;
}

function priceShort(p: number, currency: string): string {
  const sym =
    currency === "GBP" || !currency
      ? "£"
      : currency === "EUR"
        ? "€"
        : currency === "USD"
          ? "$"
          : "";
  if (p >= 1_000_000) return `${sym}${(p / 1_000_000).toFixed(p % 1_000_000 === 0 ? 0 : 1)}m`;
  if (p >= 1_000) return `${sym}${Math.round(p / 1_000)}k`;
  return `${sym}${p}`;
}

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}
