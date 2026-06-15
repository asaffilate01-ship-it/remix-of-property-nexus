import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Copy } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/ai-copy")({
  head: () => ({ meta: [{ title: "AI listing copy — Estately" }] }),
  component: AiCopyPage,
});

type Listing = { id: string; title: string | null; address: string | null; bedrooms: number | null; bathrooms: number | null; price: number | null; description: string | null };

function AiCopyPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("listings").select("id, title, address, bedrooms, bathrooms, price, description").order("created_at", { ascending: false });
      setListings((data as any) ?? []);
    })();
  }, []);

  const generate = async () => {
    const l = listings.find((x) => x.id === selected);
    if (!l) return toast.error("Pick a listing");
    setLoading(true); setOut("");
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ""}` },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You are a UK estate-agent copywriter. Write a vivid, accurate property listing description in 120–180 words. No emojis. Avoid clichés. End with a single-line call to action." },
            { role: "user", content: `Property: ${l.address}\nBedrooms: ${l.bedrooms ?? "?"}\nBathrooms: ${l.bathrooms ?? "?"}\nAsking: £${Number(l.price ?? 0).toLocaleString()}\nExisting notes: ${l.description ?? "(none)"}` },
          ],
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `AI gateway ${res.status}`);
      }
      const j = await res.json();
      setOut(j.choices?.[0]?.message?.content ?? "");
    } catch (e: any) {
      toast.error(e.message || "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const saveBack = async () => {
    if (!out || !selected) return;
    const { error } = await supabase.from("listings").update({ description: out }).eq("id", selected);
    if (error) return toast.error(error.message);
    toast.success("Saved to listing");
  };

  return (
    <div className="space-y-6">
      <PageHeader title="AI listing copy" description="Generate compelling property descriptions from your listing data." />

      <Card className="border-0 shadow-card">
        <CardContent className="p-5 space-y-3">
          <div className="flex gap-2">
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="Choose a listing…" /></SelectTrigger>
              <SelectContent>{listings.map((l) => <SelectItem key={l.id} value={l.id}>{l.title || l.address || l.id.slice(0, 8)}</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={generate} disabled={!selected || loading}><Sparkles className="mr-2 h-4 w-4" /> {loading ? "Generating…" : "Generate"}</Button>
          </div>
          {listings.length === 0 && <p className="text-xs text-muted-foreground">Add some listings first.</p>}
        </CardContent>
      </Card>

      {out && (
        <Card className="border-0 shadow-card">
          <CardContent className="p-5 space-y-3">
            <Textarea rows={10} value={out} onChange={(e) => setOut(e.target.value)} />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { navigator.clipboard.writeText(out); toast.success("Copied"); }}><Copy className="mr-2 h-4 w-4" /> Copy</Button>
              <Button onClick={saveBack}>Save to listing</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
