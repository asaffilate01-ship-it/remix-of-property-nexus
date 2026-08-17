import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { generateListingCopy } from "@/lib/ai-copy.functions";

export const Route = createFileRoute("/_authenticated/ai-copy")({
  head: () => ({ meta: [{ title: "AI listing copy — Gabley" }] }),
  component: AiCopyPage,
});

type Listing = { id: string; title: string | null; address: string | null; bedrooms: number | null; bathrooms: number | null; price: number | null; description: string | null; city?: string | null; postcode?: string | null };

const TONES = [
  { v: "professional", l: "Professional" },
  { v: "warm", l: "Warm and inviting" },
  { v: "luxury", l: "Premium / luxury" },
  { v: "concise", l: "Concise" },
] as const;

function AiCopyPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [tone, setTone] = useState<(typeof TONES)[number]["v"]>("professional");
  const [features, setFeatures] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ headline: string; short: string; long: string; bullets: string[]; caption: string } | null>(null);
  const [edited, setEdited] = useState("");
  const generate = useServerFn(generateListingCopy);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("listings")
        .select("id, title, address, bedrooms, bathrooms, price, description, city, postcode")
        .order("created_at", { ascending: false });
      setListings((data as Listing[]) ?? []);
    })();
  }, []);

  const listing = useMemo(() => listings.find((l) => l.id === selected) ?? null, [listings, selected]);

  const handleGenerate = async () => {
    if (!listing) return;
    setLoading(true);
    setResult(null);
    try {
      const out = await generate({
        data: {
          title: listing.title ?? listing.address ?? "Property",
          beds: listing.bedrooms ?? 0,
          baths: listing.bathrooms ?? 0,
          area: [listing.city, listing.postcode].filter(Boolean).join(", ") || undefined,
          features: features || undefined,
          tone,
          listing_id: listing.id,
        },
      });
      setResult({ headline: out.headline, short: out.short, long: out.long, bullets: out.bullets, caption: out.caption });
      setEdited(out.long);
      toast.success("Copy generated");
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      if (msg.includes("429")) toast.error("AI rate limit reached — please try again shortly.");
      else if (msg.includes("402")) toast.error("AI credits exhausted. Add credits in workspace settings.");
      else toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const saveBack = async () => {
    if (!edited || !selected) return;
    const { error } = await supabase.from("listings").update({ description: edited, ai_copy_generated_at: new Date().toISOString() }).eq("id", selected);
    if (error) return toast.error(error.message);
    toast.success("Saved to listing");
  };

  return (
    <div className="space-y-6">
      <PageHeader title="AI listing copy" description="Generate compelling property descriptions, social captions, and bullets in seconds." />

      <Card className="border-0 shadow-card">
        <CardContent className="p-5 space-y-3">
          <div className="grid sm:grid-cols-2 gap-2">
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger><SelectValue placeholder="Choose a listing…" /></SelectTrigger>
              <SelectContent>
                {listings.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">No listings yet — create one first.</div>}
                {listings.map((l) => <SelectItem key={l.id} value={l.id}>{l.title || l.address || l.id.slice(0, 8)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={tone} onValueChange={(v) => setTone(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TONES.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Textarea
            rows={3}
            value={features}
            onChange={(e) => setFeatures(e.target.value)}
            placeholder="Optional: extra features to highlight (e.g. south-facing garden, log burner, EV charger)"
          />
          <div className="flex justify-end">
            <Button onClick={handleGenerate} disabled={!listing || loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {loading ? "Generating…" : "Generate copy"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="border-0 shadow-card">
            <CardContent className="p-5 space-y-4 text-sm">
              <div>
                <div className="font-bold mb-1">Headline</div>
                <div className="text-muted-foreground">{result.headline}</div>
              </div>
              <div>
                <div className="font-bold mb-1">Short summary</div>
                <div className="text-muted-foreground">{result.short}</div>
              </div>
              <div>
                <div className="font-bold mb-1">Bullets</div>
                <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                  {result.bullets.map((b, i) => <li key={i}>{b}</li>)}
                </ul>
              </div>
              <div>
                <div className="font-bold mb-1">Social caption</div>
                <div className="text-muted-foreground">{result.caption}</div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-card">
            <CardContent className="p-5 space-y-3">
              <div className="text-sm font-bold">Long description (editable)</div>
              <Textarea rows={18} value={edited} onChange={(e) => setEdited(e.target.value)} />
              <div className="flex justify-end">
                <Button onClick={saveBack} disabled={!edited}><Save className="mr-2 h-4 w-4" /> Save to listing</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
