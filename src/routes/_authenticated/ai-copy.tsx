import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Sparkles, Copy, RefreshCw, Wand2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { generateListingCopy, listMyListings } from "@/lib/ai-copy.functions";

export const Route = createFileRoute("/_authenticated/ai-copy")({
  head: () => ({ meta: [{ title: "AI listing copy — Estately" }] }),
  component: AiCopyPage,
});

type Tone = "professional" | "warm" | "luxury" | "concise";
type Output = { headline: string; short: string; long: string; bullets: string[]; caption: string };

function AiCopyPage() {
  const gen = useServerFn(generateListingCopy);
  const loadListings = useServerFn(listMyListings);
  const [listings, setListings] = useState<Array<{ id: string; title: string; city: string | null; bedrooms: number | null; bathrooms: number | null; listing_type: string | null; properties?: { property_type?: string | null } | null }>>([]);
  const [listingId, setListingId] = useState<string>("");
  const [form, setForm] = useState({
    title: "",
    property_type: "house",
    beds: "3",
    baths: "2",
    area: "",
    features: "garden, off-street parking, modern kitchen",
    tone: "professional" as Tone,
  });
  const [out, setOut] = useState<Output | null>(null);
  const [busy, setBusy] = useState(false);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    loadListings({}).then((r) => setListings(r.listings as never)).catch(() => {});
  }, [loadListings]);

  const pickListing = (id: string) => {
    setListingId(id);
    setApplied(false);
    const l = listings.find((x) => x.id === id);
    if (!l) return;
    setForm((f) => ({
      ...f,
      title: l.title ?? f.title,
      property_type: l.properties?.property_type ?? f.property_type,
      beds: l.bedrooms != null ? String(l.bedrooms) : f.beds,
      baths: l.bathrooms != null ? String(l.bathrooms) : f.baths,
      area: l.city ?? f.area,
    }));
  };

  const generate = async (apply = false) => {
    setBusy(true);
    try {
      const r = await gen({ data: {
        title: form.title,
        property_type: form.property_type,
        beds: Number(form.beds) || 0,
        baths: Number(form.baths) || 0,
        area: form.area,
        features: form.features,
        tone: form.tone,
        listing_id: apply && listingId ? listingId : undefined,
        apply: apply && !!listingId,
      } });
      setOut({ headline: r.headline, short: r.short, long: r.long, bullets: r.bullets, caption: r.caption });
      setApplied(!!r.applied);
      toast.success(r.applied ? "Copy generated and applied to listing" : "Copy generated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally { setBusy(false); }
  };

  const copy = (text: string) => { navigator.clipboard.writeText(text); toast.success("Copied"); };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">AI listing copy</h1>
        <p className="text-muted-foreground mt-1">Powered by Lovable AI. Rightmove-ready descriptions, summaries, bullets and social captions in seconds.</p>
      </div>

      <div className="grid lg:grid-cols-[1fr_1.4fr] gap-5">
        <Card className="border-0 shadow-card">
          <CardContent className="p-5 space-y-4">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Sparkles className="h-3.5 w-3.5 text-primary" /> Inputs</div>
            <Field label="Property title / address"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="2 bed flat, Salford Quays" /></Field>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Type">
                <select className="w-full h-10 rounded-md border bg-background px-2 text-sm" value={form.property_type} onChange={(e) => setForm({ ...form, property_type: e.target.value })}>
                  {["flat","house","bungalow","studio","hmo","commercial"].map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Beds"><Input value={form.beds} onChange={(e) => setForm({ ...form, beds: e.target.value })} /></Field>
              <Field label="Baths"><Input value={form.baths} onChange={(e) => setForm({ ...form, baths: e.target.value })} /></Field>
            </div>
            <Field label="Area / neighbourhood"><Input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="Didsbury, Manchester" /></Field>
            <Field label="Key features (comma separated)"><Textarea rows={3} value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} /></Field>
            <Field label="Tone">
              <div className="grid grid-cols-4 gap-1.5">
                {(["professional","warm","luxury","concise"] as Tone[]).map((t) => (
                  <button key={t} type="button" onClick={() => setForm({ ...form, tone: t })}
                    className={`h-9 rounded-md text-xs font-medium capitalize border transition ${form.tone === t ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </Field>
            <Button className="w-full" onClick={generate} disabled={busy || !form.title}>
              {busy ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Generating…</> : <><Wand2 className="h-4 w-4 mr-2" /> Generate copy</>}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card">
          <CardContent className="p-5">
            {!out ? (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center text-muted-foreground">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3"><Sparkles className="h-5 w-5" /></div>
                <p className="font-medium text-foreground">Output appears here</p>
                <p className="text-sm mt-1">Fill the form and tap Generate. You'll get a headline, summary, full description, bullets and a social caption — ready to copy into Rightmove, Zoopla or your CRM.</p>
              </div>
            ) : (
              <Tabs defaultValue="long">
                <TabsList>
                  <TabsTrigger value="long">Full description</TabsTrigger>
                  <TabsTrigger value="summary">Summary</TabsTrigger>
                  <TabsTrigger value="headline">Headline</TabsTrigger>
                  <TabsTrigger value="bullets">Bullets</TabsTrigger>
                  <TabsTrigger value="caption">Social</TabsTrigger>
                </TabsList>
                <TabsContent value="long"><CopyBlock text={out.long} onCopy={() => copy(out.long)} /></TabsContent>
                <TabsContent value="summary"><CopyBlock text={out.short} onCopy={() => copy(out.short)} /></TabsContent>
                <TabsContent value="headline"><CopyBlock text={out.headline} onCopy={() => copy(out.headline)} /></TabsContent>
                <TabsContent value="bullets" className="space-y-2">
                  <ul className="list-disc pl-5 space-y-1 text-sm">{out.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>
                  <Button variant="outline" size="sm" onClick={() => copy(out.bullets.map(b => `• ${b}`).join("\n"))}><Copy className="h-3.5 w-3.5 mr-1" /> Copy bullets</Button>
                </TabsContent>
                <TabsContent value="caption"><CopyBlock text={out.caption} onCopy={() => copy(out.caption)} /></TabsContent>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="secondary">Tone: {form.tone}</Badge>
                  <Badge variant="secondary">{form.beds} bed · {form.baths} bath</Badge>
                  <Badge variant="secondary">{form.property_type}</Badge>
                </div>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label><div className="mt-1.5">{children}</div></div>;
}
function CopyBlock({ text, onCopy }: { text: string; onCopy: () => void }) {
  return (
    <div className="relative">
      <Textarea value={text} readOnly rows={10} className="resize-none font-sans text-sm" />
      <Button size="sm" variant="outline" onClick={onCopy} className="absolute top-2 right-2"><Copy className="h-3.5 w-3.5 mr-1" /> Copy</Button>
    </div>
  );
}
