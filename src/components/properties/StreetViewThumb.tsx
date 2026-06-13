import { Building2 } from "lucide-react";

type Props = {
  address?: string | null;
  city?: string | null;
  postcode?: string | null;
  className?: string;
  size?: { w: number; h: number };
};

/**
 * Google Street View static thumbnail.
 * Uses the referrer-restricted browser key (safe to embed) for the
 * Street View Static API. Falls back to a gradient if no key or location.
 */
export function StreetViewThumb({ address, city, postcode, className, size = { w: 640, h: 400 } }: Props) {
  const key = (import.meta as any).env?.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
  const loc = [address, city, postcode].filter(Boolean).join(", ");

  if (!key || !loc) {
    return (
      <div className={`relative bg-gradient-to-br from-primary/15 via-background to-accent/15 flex items-center justify-center ${className ?? ""}`}>
        <Building2 className="h-10 w-10 text-muted-foreground/40" />
      </div>
    );
  }

  const url = `https://maps.googleapis.com/maps/api/streetview?size=${size.w}x${size.h}&location=${encodeURIComponent(loc)}&fov=80&pitch=0&key=${key}`;

  return (
    <img
      src={url}
      alt={`Street view of ${loc}`}
      loading="lazy"
      className={`object-cover ${className ?? ""}`}
      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
    />
  );
}
