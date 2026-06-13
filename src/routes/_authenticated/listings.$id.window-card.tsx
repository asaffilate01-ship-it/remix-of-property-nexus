import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft, Bed, Bath, Sofa, Ruler, Zap, Home } from "lucide-react";

export const Route = createFileRoute("/_authenticated/listings/$id/window-card")({
  component: WindowCardPage,
});

type Listing = {
  id: string; title: string; description: string | null;
  purpose: "sale" | "rent"; price: number | null; price_qualifier: string | null;
  bedrooms: number | null; bathrooms: number | null; receptions: number | null;
  city: string | null; postcode: string | null; address: string | null;
  cover_image: string | null; photos: unknown; features: unknown;
  is_hmo: boolean; bills_included: boolean;
  epc_rating: string | null; tenure: string | null;
  floor_area_sqft: number | null; council_tax_band: string | null; furnished: string | null;
  available_from: string | null; slug: string;
};

function normalizePhotos(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return (raw as unknown[]).map((p) =>
    typeof p === "string" ? p : (p && typeof p === "object" && "url" in (p as any) ? String((p as any).url) : "")
  ).filter(Boolean);
}

function priceLabel(l: Listing) {
  if (!l.price) return "POA";
  const formatted = `£${Number(l.price).toLocaleString()}${l.purpose === "rent" ? " pcm" : ""}`;
  const q = l.price_qualifier;
  if (!q || q === "none") return formatted;
  if (q === "poa") return "POA";
  const prefix: Record<string, string> = {
    guide_price: "Guide price ",
    offers_over: "Offers over ",
    offers_in_region: "OIRO ",
  };
  return `${prefix[q] ?? ""}${formatted}`;
}

function WindowCardPage() {
  const { id } = Route.useParams();
  const [l, setL] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("listings").select("*").eq("id", id).maybeSingle();
      setL(data as Listing | null);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="p-8 text-muted-foreground">Loading window card…</div>;
  if (!l) return <div className="p-8">Listing not found.</div>;

  const photos = normalizePhotos(l.photos);
  const cover = l.cover_image || photos[0] || null;
  const extras = photos.filter((p) => p !== cover).slice(0, 4);
  const features = Array.isArray(l.features) ? (l.features as unknown[]).filter((f): f is string => typeof f === "string") : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <Button asChild variant="ghost" size="sm">
          <Link to="/listings"><ArrowLeft className="h-4 w-4 mr-2" /> Back to listings</Link>
        </Button>
        <Button onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" /> Print / Save PDF</Button>
      </div>

      {/* A4 portrait card */}
      <div className="mx-auto bg-white text-black shadow-card print:shadow-none window-card"
           style={{ width: "210mm", minHeight: "297mm", padding: "12mm" }}>
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-black pb-3 mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-neutral-500">
              {l.purpose === "sale" ? "For Sale" : "To Let"}{l.is_hmo ? " · HMO" : ""}
            </div>
            <h1 className="text-2xl font-semibold leading-tight mt-1">{l.title}</h1>
            <div className="text-sm text-neutral-700 mt-1">
              {[l.address, l.city, l.postcode].filter(Boolean).join(", ")}
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold tabular-nums">{priceLabel(l)}</div>
            {l.bills_included && <div className="text-xs mt-1 text-neutral-600">Bills included</div>}
          </div>
        </div>

        {/* Cover image */}
        {cover && (
          <div className="w-full overflow-hidden rounded-sm border border-neutral-200 mb-3" style={{ height: "110mm" }}>
            <img src={cover} alt={l.title} className="w-full h-full object-cover" />
          </div>
        )}

        {/* Quick specs */}
        <div className="grid grid-cols-5 gap-2 text-center mb-4">
          <Spec icon={<Bed className="h-4 w-4" />} label="Beds" value={l.bedrooms ?? "—"} />
          <Spec icon={<Bath className="h-4 w-4" />} label="Baths" value={l.bathrooms ?? "—"} />
          <Spec icon={<Sofa className="h-4 w-4" />} label="Recep" value={l.receptions ?? "—"} />
          <Spec icon={<Ruler className="h-4 w-4" />} label="Sq ft" value={l.floor_area_sqft ?? "—"} />
          <Spec icon={<Zap className="h-4 w-4" />} label="EPC" value={l.epc_rating ?? "—"} />
        </div>

        {/* Extra photos */}
        {extras.length > 0 && (
          <div className="grid grid-cols-4 gap-2 mb-4">
            {extras.map((p) => (
              <div key={p} className="aspect-[4/3] overflow-hidden rounded-sm border border-neutral-200">
                <img src={p} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}

        {/* Description */}
        {l.description && (
          <div className="mb-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 mb-1">Description</div>
            <p className="text-sm leading-relaxed whitespace-pre-line line-clamp-[12]">{l.description}</p>
          </div>
        )}

        {/* Features + meta */}
        <div className="grid grid-cols-2 gap-4">
          {features.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 mb-1">Features</div>
              <ul className="text-sm grid grid-cols-1 gap-y-0.5">
                {features.slice(0, 10).map((f) => <li key={f}>• {f}</li>)}
              </ul>
            </div>
          )}
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 mb-1">Details</div>
            <dl className="text-sm grid grid-cols-2 gap-y-0.5">
              {l.tenure && (<><dt className="text-neutral-500">Tenure</dt><dd className="capitalize">{l.tenure}</dd></>)}
              {l.furnished && (<><dt className="text-neutral-500">Furnished</dt><dd className="capitalize">{l.furnished}</dd></>)}
              {l.council_tax_band && (<><dt className="text-neutral-500">Council tax</dt><dd>Band {l.council_tax_band}</dd></>)}
              {l.available_from && (<><dt className="text-neutral-500">Available</dt><dd>{new Date(l.available_from).toLocaleDateString()}</dd></>)}
              {l.epc_rating && (<><dt className="text-neutral-500">EPC</dt><dd>{l.epc_rating}</dd></>)}
            </dl>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute" />
        <div className="mt-6 pt-3 border-t border-neutral-300 flex items-center justify-between text-xs text-neutral-600">
          <div className="inline-flex items-center gap-1.5"><Home className="h-3.5 w-3.5" /> Estately</div>
          <div>estately.app/marketplace/{l.slug}</div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { background: white !important; }
          .window-card { box-shadow: none !important; }
          nav, aside, header, .sidebar, [data-sidebar] { display: none !important; }
        }
      `}</style>
    </div>
  );
}

function Spec({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="border border-neutral-200 rounded-sm py-2">
      <div className="flex items-center justify-center text-neutral-600">{icon}</div>
      <div className="text-base font-semibold leading-none mt-1">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-neutral-500 mt-0.5">{label}</div>
    </div>
  );
}
