import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, MapPin, Check } from "lucide-react";
import { toast } from "sonner";

type Props = {
  postcode: string;
  onPostcode: (v: string) => void;
  onResolve?: (info: { city: string; region: string; latitude: number; longitude: number }) => void;
};

// Free UK postcode lookup via postcodes.io (no API key required).
// Returns admin district / town for the postcode area; useful for auto-filling city.
export function PostcodeLookup({ postcode, onPostcode, onResolve }: Props) {
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);

  const lookup = async () => {
    const code = postcode.trim().toUpperCase();
    if (!code) return toast.error("Enter a postcode first");
    setBusy(true); setOk(false);
    try {
      const r = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(code)}`);
      if (!r.ok) throw new Error("Postcode not found");
      const j = await r.json();
      const res = j.result;
      onPostcode(res.postcode);
      onResolve?.({
        city: res.admin_district || res.parish || res.region,
        region: res.region,
        latitude: res.latitude,
        longitude: res.longitude,
      });
      setOk(true);
      toast.success(`${res.postcode} — ${res.admin_district}`);
    } catch (e: any) {
      toast.error(e.message || "Lookup failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <Label>Postcode</Label>
      <div className="flex gap-2">
        <Input
          value={postcode}
          onChange={(e) => { onPostcode(e.target.value.toUpperCase()); setOk(false); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); lookup(); } }}
          placeholder="SW1A 1AA"
          className="font-mono uppercase"
        />
        <Button type="button" variant="outline" onClick={lookup} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : ok ? <Check className="h-4 w-4 text-green-600" /> : <MapPin className="h-4 w-4" />}
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground mt-1">Tap the pin to auto-fill town/city from the postcode (UK).</p>
    </div>
  );
}
