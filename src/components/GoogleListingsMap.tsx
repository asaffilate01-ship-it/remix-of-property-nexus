/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";
import { MarkerClusterer, type Marker } from "@googlemaps/markerclusterer";
import { loadGoogleMaps } from "@/lib/googleMaps";

export type MapBounds = { north: number; south: number; east: number; west: number };
export type MapPoint = { lat: number; lng: number };

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
  activeId,
  onHoverListing,
  onSearchArea,
  onPolygonChange,
  polygon,
}: {
  listings: Listing[];
  onMarkerClick?: (l: Listing) => void;
  /** Listing currently hovered in the results list — its pin is highlighted. */
  activeId?: string | null;
  onHoverListing?: (id: string | null) => void;
  /** Called with the visible viewport when the user taps "Search this area". */
  onSearchArea?: (bounds: MapBounds) => void;
  /** Called when the user finishes (or clears) a draw-a-search shape. */
  onPolygonChange?: (path: MapPoint[] | null) => void;
  polygon?: MapPoint[] | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const infoRef = useRef<google.maps.InfoWindow | null>(null);
  const drawingRef = useRef<google.maps.Polyline | null>(null);
  const shapeRef = useRef<google.maps.Polygon | null>(null);
  const listenersRef = useRef<google.maps.MapsEventListener[]>([]);
  const markerClickRef = useRef(onMarkerClick);
  const hoverRef = useRef(onHoverListing);
  const polygonChangeRef = useRef(onPolygonChange);
  const [err, setErr] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [moved, setMoved] = useState(false);

  markerClickRef.current = onMarkerClick;
  hoverRef.current = onHoverListing;
  polygonChangeRef.current = onPolygonChange;

  // --- Map init + markers -------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    const withGeo = listings.filter((l) => l.latitude != null && l.longitude != null);
    loadGoogleMaps()
      .then(() => {
        if (cancelled || !ref.current || !window.google) return;
        if (!mapRef.current) {
          mapRef.current = new google.maps.Map(ref.current, {
            center: { lat: 54.5, lng: -2.5 },
            zoom: 6,
            mapTypeControl: false,
            streetViewControl: true,
            fullscreenControl: true,
            clickableIcons: false,
            gestureHandling: "greedy",
          });
          infoRef.current = new google.maps.InfoWindow();
          mapRef.current.addListener("dragend", () => setMoved(true));
          mapRef.current.addListener("zoom_changed", () => setMoved(true));
        }
        setReady(true);

        clustererRef.current?.clearMarkers();
        markersRef.current.forEach((m) => m.setMap(null));
        markersRef.current = new Map();

        const bounds = new google.maps.LatLngBounds();
        const created: Marker[] = [];
        withGeo.forEach((l) => {
          const pos = { lat: Number(l.latitude), lng: Number(l.longitude) };
          const m = new google.maps.Marker({
            position: pos,
            title: l.title,
            icon: pinIcon(false),
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
          m.addListener("mouseover", () => hoverRef.current?.(l.id));
          m.addListener("mouseout", () => hoverRef.current?.(null));
          markersRef.current.set(l.id, m);
          created.push(m);
          bounds.extend(pos);
        });

        if (!clustererRef.current) {
          clustererRef.current = new MarkerClusterer({ map: mapRef.current, markers: created });
        } else {
          clustererRef.current.addMarkers(created);
        }

        if (withGeo.length === 1) {
          mapRef.current.setCenter(bounds.getCenter());
          mapRef.current.setZoom(14);
        } else if (withGeo.length > 1) {
          mapRef.current.fitBounds(bounds, 48);
        }
        setMoved(false);
      })
      .catch((e) => setErr(e.message));
    return () => {
      cancelled = true;
    };
  }, [listings]);

  // --- Hover highlight ----------------------------------------------------
  useEffect(() => {
    markersRef.current.forEach((m, id) => {
      const active = id === activeId;
      m.setIcon(pinIcon(active));
      m.setZIndex(active ? 999 : undefined);
    });
  }, [activeId]);

  // --- Draw-a-search ------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google) return;
    const clearListeners = () => {
      listenersRef.current.forEach((l) => l.remove());
      listenersRef.current = [];
    };

    if (!drawing) {
      clearListeners();
      map.setOptions({ draggable: true, draggableCursor: undefined });
      drawingRef.current?.setMap(null);
      drawingRef.current = null;
      return;
    }

    shapeRef.current?.setMap(null);
    shapeRef.current = null;
    map.setOptions({ draggable: false, draggableCursor: "crosshair" });

    const line = new google.maps.Polyline({
      map,
      clickable: false,
      strokeColor: "#0a7d49",
      strokeWeight: 3,
    });
    drawingRef.current = line;

    let active = false;
    const start = () => {
      active = true;
      line.setPath([]);
    };
    const move = (e: google.maps.MapMouseEvent) => {
      if (!active || !e.latLng) return;
      line.getPath().push(e.latLng);
    };
    const finish = () => {
      if (!active) return;
      active = false;
      const path = line
        .getPath()
        .getArray()
        .map((p) => ({ lat: p.lat(), lng: p.lng() }));
      line.setMap(null);
      drawingRef.current = null;
      setDrawing(false);
      if (path.length < 3) {
        polygonChangeRef.current?.(null);
        return;
      }
      shapeRef.current = new google.maps.Polygon({
        map,
        paths: path,
        strokeColor: "#0a7d49",
        strokeWeight: 2,
        fillColor: "#0a7d49",
        fillOpacity: 0.1,
        clickable: false,
      });
      polygonChangeRef.current?.(path);
    };

    listenersRef.current = [
      map.addListener("mousedown", start),
      map.addListener("mousemove", move),
      map.addListener("mouseup", finish),
    ];
    const upHandler = () => finish();
    window.addEventListener("mouseup", upHandler);
    return () => {
      window.removeEventListener("mouseup", upHandler);
      clearListeners();
    };
  }, [drawing]);

  // Reflect an externally cleared polygon
  useEffect(() => {
    if (!polygon && shapeRef.current) {
      shapeRef.current.setMap(null);
      shapeRef.current = null;
    }
  }, [polygon]);

  if (err) {
    return (
      <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground p-4 text-center">
        {err}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={ref} className="w-full h-full" />

      {ready && (onPolygonChange || onSearchArea) && (
        <div className="pointer-events-none absolute inset-x-0 top-3 flex flex-wrap items-center justify-center gap-2 px-3">
          {onPolygonChange && (
            <button
              type="button"
              onClick={() => {
                if (shapeRef.current) {
                  shapeRef.current.setMap(null);
                  shapeRef.current = null;
                  onPolygonChange(null);
                  setDrawing(false);
                  return;
                }
                setDrawing((d) => !d);
              }}
              className="pointer-events-auto rounded-full bg-card/95 px-3.5 py-2 text-xs font-semibold shadow-lg ring-1 ring-border backdrop-blur hover:bg-card"
            >
              {shapeRef.current ? "Clear shape" : drawing ? "Drawing… drag on map" : "Draw a search"}
            </button>
          )}
          {onSearchArea && moved && (
            <button
              type="button"
              onClick={() => {
                const b = mapRef.current?.getBounds();
                if (!b) return;
                const ne = b.getNorthEast();
                const sw = b.getSouthWest();
                onSearchArea({ north: ne.lat(), south: sw.lat(), east: ne.lng(), west: sw.lng() });
                setMoved(false);
              }}
              className="pointer-events-auto rounded-full bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-lg hover:opacity-95"
            >
              Search this area
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function pinIcon(active: boolean): google.maps.Symbol {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: active ? 18 : 14,
    fillColor: active ? "#c4653a" : "#0a7d49",
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: 2,
  };
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
