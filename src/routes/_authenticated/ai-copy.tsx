import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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

const STYLES = ["Warm and inviting","Premium / luxury","Investor-focused","Family-friendly","Compact / starter home"];

function AiCopyPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [style, setStyle] = useState(STYLES[0]);
  const [editing, setEditing] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("listings").select("id, title, address, bedrooms, bathrooms, price, description").order("created_at", { ascending: false });
      setListings((data as any) ?? []);
    })();
  }, []);

  const listing = useMemo(() => listings.find((l) => l.id === selected) ?? null, [listings, selected]);

  const prompt = useMemo(() => {
    if (!listing) return "";
    return `Write a 120–180 word UK estate-agent listing description in a "${style}" tone for the property below. Be vivid, accurate, no emojis, avoid clichés, end with a single-line call to action.

Address: ${listing.address ?? ""}
Bedrooms: ${listing.bedrooms ?? "?"}
Bathrooms: ${listing.bathrooms ?? "?"}
Asking: £${Number(listing.price ?? 0).toLocaleString()}
Existing notes: ${listing.description ?? "(none)"}`;
  }, [listing, style]);

  const saveBack = async () => {
    if (!editing || !selected) return;
    const { error } = await supabase.from("listings").update({ description: editing }).eq("id", selected);
    if (error) return toast.error(error.message);
    toast.success("Saved to listing");
  };

  return (
    <div className="space-y-6">
      <PageHeader title="AI listing copy" description="Generate a structured prompt from a listing, then paste your AI's response back to save." />

      <Card className="border-0 shadow-card">
        <CardContent className="p-5 space-y-3">
          <div className="grid sm:grid-cols-2 gap-2">
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger><SelectValue placeholder="Choose a listing…" /></SelectTrigger>
              <SelectContent>{listings.map((l) => <SelectItem key={l.id} value={l.id}>{l.title || l.address || l.id.slice(0, 8)}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STYLES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {!listing && <p className="text-xs text-muted-foreground">Pick a listing to generate a tailored prompt.</p>}
        </CardContent>
      </Card>

      {listing && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="border-0 shadow-card">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between"><div className="text-sm font-bold flex items-center gap-2"><Sparkles className="h-4 w-4" /> Prompt</div><Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(prompt); toast.success("Copied prompt"); }}><Copy className="mr-1 h-3.5 w-3.5" /> Copy</Button></div>
              <Textarea rows={14} readOnly value={prompt} className="font-mono text-xs" />
            </CardContent>
          </Card>
          <Card className="border-0 shadow-card">
            <CardContent className="p-5 space-y-3">
              <div className="text-sm font-bold">Paste result and save</div>
              <Textarea rows={14} value={editing} onChange={(e) => setEditing(e.target.value)} placeholder="Paste your AI's description here…" />
              <div className="flex justify-end"><Button onClick={saveBack} disabled={!editing}>Save to listing</Button></div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
