import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Tag, ExternalLink } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

type Listing = { id: string; slug: string; title: string; listing_type: string; status: string; price: number | null; city: string | null; is_hmo: boolean };

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) + "-" + Math.random().toString(36).slice(2, 7);

export const Route = createFileRoute("/_authenticated/listings")({ component: ListingsPage });

function ListingsPage() {
  const [rows, setRows] = useState<Listing[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", listing_type: "rent" as "sale" | "rent" | "room", price: "", bedrooms: "", city: "", postcode: "", description: "", cover_image: "", is_hmo: false, publish: true });

  const load = async () => {
    const { data } = await supabase.from("listings").select("*").order("created_at", { ascending: false });
    setRows((data as Listing[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("listings").insert({
      owner_id: u.user.id,
      slug: slugify(form.title),
      title: form.title,
      description: form.description || null,
      listing_type: form.listing_type,
      status: form.publish ? "published" : "draft",
      price: form.price ? Number(form.price) : null,
      bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
      city: form.city || null,
      postcode: form.postcode || null,
      cover_image: form.cover_image || null,
      is_hmo: form.is_hmo,
    });
    if (error) toast.error(error.message);
    else { toast.success("Listing created"); setOpen(false); setForm({ title: "", listing_type: "rent", price: "", bedrooms: "", city: "", postcode: "", description: "", cover_image: "", is_hmo: false, publish: true }); load(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">Listings</h1><p className="text-muted-foreground text-sm">Your marketplace listings.</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> New listing</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>New listing</DialogTitle></DialogHeader>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Type</Label>
                  <Select value={form.listing_type} onValueChange={(v) => setForm({ ...form, listing_type: v as typeof form.listing_type })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sale">For sale</SelectItem><SelectItem value="rent">To let</SelectItem><SelectItem value="room">HMO room</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Price (£)</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Beds</Label><Input type="number" value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: e.target.value })} /></div>
                <div className="col-span-2"><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              </div>
              <div><Label>Cover image URL</Label><Input value={form.cover_image} onChange={(e) => setForm({ ...form, cover_image: e.target.value })} placeholder="https://…" /></div>
              <div><Label>Description</Label><Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Switch checked={form.is_hmo} onCheckedChange={(v) => setForm({ ...form, is_hmo: v })} /><Label>HMO</Label></div>
              <div className="flex items-center gap-2"><Switch checked={form.publish} onCheckedChange={(v) => setForm({ ...form, publish: v })} /><Label>Publish now</Label></div>
            </div>
            <DialogFooter><Button onClick={save} disabled={!form.title}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {rows.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent">
          <CardContent className="p-12 text-center text-muted-foreground">
            <Tag className="mx-auto h-10 w-10 mb-3 opacity-40" />
            <div>No listings yet. Create your first one.</div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((l) => (
            <Card key={l.id} className="border-0 shadow-card">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary">{l.listing_type}</Badge>
                  <Badge variant={l.status === "published" ? "default" : "outline"}>{l.status}</Badge>
                  {l.is_hmo && <Badge className="bg-accent text-accent-foreground">HMO</Badge>}
                </div>
                <div className="font-semibold mb-1">{l.title}</div>
                <div className="text-sm text-muted-foreground">{l.city ?? "—"} {l.price && <>· £{Number(l.price).toLocaleString()}</>}</div>
                {l.status === "published" && (
                  <Link to="/marketplace/$slug" params={{ slug: l.slug }} className="text-xs text-primary inline-flex items-center gap-1 mt-2 hover:underline">
                    View public page <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
