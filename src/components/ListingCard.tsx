import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bed, Bath, MapPin } from "lucide-react";
import { SaveListingButton } from "@/components/marketplace/SaveListingButton";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { ListingImage } from "@/components/ListingImage";

export type ListingCardData = {
  id: string;
  slug: string;
  title: string;
  listing_type: "sale" | "rent" | "room";
  purpose?: string | null;
  price: number | null;
  price_qualifier?: string | null;
  currency: string;
  bedrooms: number | null;
  bathrooms?: number | null;
  city: string | null;
  cover_image: string | null;
  is_hmo?: boolean;
  created_at?: string | null;
  verified?: boolean | null;
  photos_verified?: boolean | null;
};

const typeLabel: Record<string, string> = { sale: "For sale", rent: "To let", room: "HMO room" };

function isNew(created_at?: string | null) {
  if (!created_at) return false;
  return Date.now() - new Date(created_at).getTime() < 3 * 86400000;
}

export function ListingCard({ l }: { l: ListingCardData }) {
  const price = l.price ? new Intl.NumberFormat("en-GB", { style: "currency", currency: l.currency || "GBP", maximumFractionDigits: 0 }).format(Number(l.price)) : "POA";
  const suffix = l.listing_type === "sale" ? "" : " pcm";
  const qualifier = l.price_qualifier && l.price_qualifier !== "none" ? l.price_qualifier.replace(/_/g, " ") : null;

  return (
    <div className="group relative">
      <Link to="/marketplace/$slug" params={{ slug: l.slug }} className="block">
      <Card className="overflow-hidden border-0 shadow-card hover:shadow-xl hover:-translate-y-0.5 transition-all">
        <div className="aspect-[4/3] bg-muted relative overflow-hidden">
          {l.cover_image ? (
            <img src={l.cover_image} alt={l.title} loading="lazy" className="h-full w-full object-cover group-hover:scale-105 transition duration-500" />
          ) : (
            <div className="brand-gradient h-full w-full opacity-30" />
          )}
          <div className="absolute inset-x-0 top-0 p-3 flex items-start justify-between">
            <div className="flex flex-wrap gap-1.5">
              <Badge className="bg-card/95 text-foreground backdrop-blur border-0">{typeLabel[l.listing_type]}</Badge>
              {l.is_hmo && <Badge className="bg-accent text-accent-foreground border-0">HMO</Badge>}
            </div>
            <div className="flex flex-col items-end gap-1">
              {isNew(l.created_at) && <Badge className="bg-success text-success-foreground border-0">New</Badge>}
              {l.verified && <VerifiedBadge kind="verified" />}
              {l.photos_verified && <VerifiedBadge kind="photos" />}
            </div>
          </div>
        </div>
        <CardContent className="p-4 space-y-1.5">
          <div className="flex items-baseline gap-2">
            <div className="text-lg font-bold">{price}<span className="text-sm font-normal text-muted-foreground">{suffix}</span></div>
            {qualifier && <span className="text-xs text-muted-foreground capitalize">{qualifier}</span>}
          </div>
          <div className="font-medium line-clamp-1">{l.title}</div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {l.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{l.city}</span>}
            {l.bedrooms != null && <span className="inline-flex items-center gap-1"><Bed className="h-3 w-3" />{l.bedrooms}</span>}
            {l.bathrooms != null && <span className="inline-flex items-center gap-1"><Bath className="h-3 w-3" />{l.bathrooms}</span>}
          </div>
        </CardContent>
      </Card>
      </Link>
      <div className="absolute top-3 right-3 z-10 rounded-full bg-card/95 backdrop-blur shadow-sm">
        <SaveListingButton listingId={l.id} variant="ghost" size="icon" />
      </div>
    </div>
  );
}
