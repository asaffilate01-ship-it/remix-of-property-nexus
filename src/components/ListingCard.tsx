import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bed, Bath, MapPin } from "lucide-react";

export type ListingCardData = {
  id: string;
  slug: string;
  title: string;
  listing_type: "sale" | "rent" | "room";
  price: number | null;
  currency: string;
  bedrooms: number | null;
  bathrooms?: number | null;
  city: string | null;
  cover_image: string | null;
  is_hmo?: boolean;
};

const typeLabel: Record<string, string> = { sale: "For sale", rent: "To let", room: "HMO room" };

export function ListingCard({ l }: { l: ListingCardData }) {
  const price = l.price ? new Intl.NumberFormat("en-GB", { style: "currency", currency: l.currency || "GBP", maximumFractionDigits: 0 }).format(Number(l.price)) : "POA";
  const suffix = l.listing_type === "sale" ? "" : " pcm";
  return (
    <Link to="/marketplace/$slug" params={{ slug: l.slug }} className="group">
      <Card className="overflow-hidden border-0 shadow-card hover:shadow-lg transition">
        <div className="aspect-[4/3] bg-muted relative overflow-hidden">
          {l.cover_image ? (
            <img src={l.cover_image} alt={l.title} className="h-full w-full object-cover group-hover:scale-105 transition" />
          ) : (
            <div className="brand-gradient h-full w-full opacity-30" />
          )}
          <Badge className="absolute top-3 left-3" variant="secondary">{typeLabel[l.listing_type]}</Badge>
          {l.is_hmo && <Badge className="absolute top-3 right-3 bg-accent text-accent-foreground">HMO</Badge>}
        </div>
        <CardContent className="p-4 space-y-1.5">
          <div className="text-lg font-bold">{price}<span className="text-sm font-normal text-muted-foreground">{suffix}</span></div>
          <div className="font-medium line-clamp-1">{l.title}</div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {l.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{l.city}</span>}
            {l.bedrooms != null && <span className="inline-flex items-center gap-1"><Bed className="h-3 w-3" />{l.bedrooms}</span>}
            {l.bathrooms != null && <span className="inline-flex items-center gap-1"><Bath className="h-3 w-3" />{l.bathrooms}</span>}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
