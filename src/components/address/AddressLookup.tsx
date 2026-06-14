import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MapPin } from "lucide-react";
import { loadGoogleMaps } from "@/lib/googleMaps";

export type ResolvedAddress = {
  line1: string;
  city: string;
  region: string;
  postcode: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  formatted: string;
};

type Props = {
  label?: string;
  placeholder?: string;
  onResolve: (a: ResolvedAddress) => void;
  /** ISO country codes to bias/restrict, default UK */
  countries?: string[];
};

type Suggestion = { placePrediction: any };

/**
 * Reusable address / postcode lookup powered by Google Places API (New).
 * Type a postcode or part of an address; pick a suggestion to auto-fill the form.
 */
export function AddressLookup({ label = "Find address", placeholder = "Start typing a postcode or address…", onResolve, countries = ["gb"] }: Props) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<Suggestion[]>([]);
  const tokenRef = useRef<any>(null);
  const placesRef = useRef<any>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;
    loadGoogleMaps()
      .then(async () => {
        const lib: any = await (window as any).google.maps.importLibrary("places");
        if (!mounted) return;
        placesRef.current = lib;
        tokenRef.current = new lib.AutocompleteSessionToken();
      })
      .catch(() => {});
    return () => {
      mounted = false;
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, []);

  const search = (input: string) => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      const lib = placesRef.current;
      if (!lib || input.trim().length < 2) { setItems([]); return; }
      try {
        setBusy(true);
        const res = await lib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input,
          sessionToken: tokenRef.current,
          includedRegionCodes: countries,
        });
        setItems(res?.suggestions ?? []);
        setOpen(true);
      } catch {
        setItems([]);
      } finally {
        setBusy(false);
      }
    }, 200);
  };

  const pick = async (s: Suggestion) => {
    const pred = s.placePrediction;
    if (!pred) return;
    setBusy(true);
    try {
      const place = pred.toPlace();
      await place.fetchFields({ fields: ["addressComponents", "formattedAddress", "location", "displayName"] });
      const comps: any[] = place.addressComponents ?? [];
      const get = (type: string, short = false) => {
        const c = comps.find((x) => (x.types || []).includes(type));
        return c ? (short ? c.shortText : c.longText) : "";
      };
      const streetNumber = get("street_number");
      const route = get("route");
      const subPremise = get("subpremise");
      const premise = get("premise");
      const line1 = [subPremise, premise, [streetNumber, route].filter(Boolean).join(" ")]
        .filter(Boolean).join(", ");
      const resolved: ResolvedAddress = {
        line1: line1 || (place.displayName ?? ""),
        city: get("postal_town") || get("locality") || get("administrative_area_level_2"),
        region: get("administrative_area_level_1"),
        postcode: get("postal_code").toUpperCase(),
        country: get("country", true),
        latitude: place.location ? place.location.lat() : null,
        longitude: place.location ? place.location.lng() : null,
        formatted: place.formattedAddress ?? "",
      };
      onResolve(resolved);
      setQ(resolved.formatted);
      setOpen(false);
      setItems([]);
      // new session token after a selection
      tokenRef.current = new placesRef.current.AutocompleteSessionToken();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative">
      {label && <Label className="text-xs">{label}</Label>}
      <div className="relative">
        <MapPin className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          value={q}
          onChange={(e) => { setQ(e.target.value); search(e.target.value); }}
          onFocus={() => items.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className="pl-9"
        />
        {busy && <Loader2 className="h-4 w-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />}
      </div>
      {open && items.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-72 overflow-auto">
          {items.map((s, i) => {
            const p = s.placePrediction;
            const main = p?.mainText?.text ?? p?.text?.text ?? "";
            const sec = p?.secondaryText?.text ?? "";
            return (
              <button
                key={p?.placeId ?? i}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); pick(s); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
              >
                <div className="font-medium truncate">{main}</div>
                {sec && <div className="text-xs text-muted-foreground truncate">{sec}</div>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
