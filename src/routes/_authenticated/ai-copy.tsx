import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sparkles, Copy, RefreshCw, Wand2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/ai-copy")({
  head: () => ({ meta: [{ title: "AI listing copy — Estately" }] }),
  component: AiCopyPage,
});

type Tone = "professional" | "warm" | "luxury" | "concise";

function AiCopyPage() {
  const [form, setForm] = useState({ title: "", type: "house", beds: "3", baths: "2", area: "", features: "garden, off-street parking, modern kitchen", tone: "professional" as Tone });
  const [out, setOut] = useState<{ headline: string; summary: string; long: string; bullets: string[] } | null>(null);
  const [busy, setBusy] = useState(false);

  const generate = () => {
    setBusy(true);
    setTimeout(() => {
      setOut(synth(form));
      setBusy(false);
    }, 500);
  };

  const copy = (text: string) => { navigator.clipboard.writeText(text); toast.success("Copied"); };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">AI listing copy</h1>
        <p className="text-muted-foreground mt-1">Generate Rightmove-ready descriptions, summaries and feature bullets in seconds.</p>
      </div>

      <div className="grid lg:grid-cols-[1fr_1.4fr] gap-5">
        <Card className="border-0 shadow-card">
          <CardContent className="p-5 space-y-4">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Sparkles className="h-3.5 w-3.5 text-primary" /> Inputs</div>
            <Field label="Property title / address"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="2 bed flat, Salford Quays" /></Field>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Type">
                <select className="w-full h-10 rounded-md border bg-background px-2 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
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
                <p className="text-sm mt-1">Fill the form and tap Generate. You'll get a headline, summary, full description and feature bullets — ready to copy into Rightmove, Zoopla or your CRM.</p>
              </div>
            ) : (
              <Tabs defaultValue="long">
                <TabsList>
                  <TabsTrigger value="long">Full description</TabsTrigger>
                  <TabsTrigger value="summary">Summary</TabsTrigger>
                  <TabsTrigger value="headline">Headline</TabsTrigger>
                  <TabsTrigger value="bullets">Bullets</TabsTrigger>
                </TabsList>
                <TabsContent value="long" className="space-y-3">
                  <CopyBlock text={out.long} onCopy={() => copy(out.long)} />
                </TabsContent>
                <TabsContent value="summary"><CopyBlock text={out.summary} onCopy={() => copy(out.summary)} /></TabsContent>
                <TabsContent value="headline"><CopyBlock text={out.headline} onCopy={() => copy(out.headline)} /></TabsContent>
                <TabsContent value="bullets" className="space-y-2">
                  <ul className="list-disc pl-5 space-y-1 text-sm">{out.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>
                  <Button variant="outline" size="sm" onClick={() => copy(out.bullets.map(b => `• ${b}`).join("\n"))}><Copy className="h-3.5 w-3.5 mr-1" /> Copy bullets</Button>
                </TabsContent>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="secondary">Tone: {form.tone}</Badge>
                  <Badge variant="secondary">{form.beds} bed · {form.baths} bath</Badge>
                  <Badge variant="secondary">{form.type}</Badge>
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

function synth(f: { title: string; type: string; beds: string; baths: string; area: string; features: string; tone: Tone }) {
  const feats = f.features.split(",").map((s) => s.trim()).filter(Boolean);
  const area = f.area || "the area";
  const opener = {
    professional: `An impressive ${f.beds}-bedroom ${f.type} situated in the sought-after location of ${area}.`,
    warm: `Welcome home — this beautifully presented ${f.beds}-bed ${f.type} in ${area} is ready to fall in love with.`,
    luxury: `A rare opportunity to acquire an exceptional ${f.beds}-bedroom ${f.type} in the prestigious enclave of ${area}.`,
    concise: `${f.beds}-bed ${f.type} in ${area}.`,
  }[f.tone];
  const headline = `${f.beds} bed ${f.type} ${f.title ? `— ${f.title}` : ""} in ${area}`.trim();
  const summary = `${opener} Boasting ${f.baths} bathroom${f.baths === "1" ? "" : "s"} and standout features including ${feats.slice(0, 3).join(", ") || "a host of modern fittings"}.`;
  const long = `${opener}\n\nArranged over generous living space, the property offers ${f.beds} well-proportioned bedrooms and ${f.baths} bathroom${f.baths === "1" ? "" : "s"}. Notable features include ${feats.join(", ") || "tasteful modern finishes throughout"}.\n\n${area} is renowned for its excellent transport links, schools and local amenities, making this an ideal home for families and professionals alike.\n\nViewing is highly recommended to fully appreciate everything on offer.`;
  const bullets = [`${f.beds} bedrooms, ${f.baths} bathroom${f.baths === "1" ? "" : "s"}`, `Located in ${area}`, ...feats, "Energy-efficient features", "Early viewing advised"];
  return { headline, summary, long, bullets };
}
