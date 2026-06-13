import { createFileRoute, Link } from "@tanstack/react-router";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Tag, ExternalLink, Pencil, Trash2, Eye, EyeOff, Globe } from "lucide-react";
import { toast } from "sonner";

type Listing = {
  id: string; slug: string; title: string; description: string | null;
  listing_type: "sale" | "rent" | "room"; purpose: "sale" | "rent";
  status: string; price: number | null; price_qualifier: string | null;
  bedrooms: number | null; bathrooms: number | null; receptions: number | null;
  city: string | null; postcode: string | null; address: string | null;
  cover_image: string | null; photos: unknown; features: unknown;
  is_hmo: boolean; bills_included: boolean; marketplace_publish: boolean;
  available_from: string | null; epc_rating: string | null; tenure: string | null;
  floor_area_sqft: number | null; council_tax_band: string | null; furnished: string | null;
  agency_id: string | null; view_count: number;
};

const empty = {
  id: undefined as string | undefined,
  title: "", description: "",
  listing_type: "rent" as "sale" | "rent" | "room",
  purpose: "rent" as "sale" | "rent",
  price: "", price_qualifier: "none",
  bedrooms: "", bathrooms: "", receptions: "",
  address: "", city: "", postcode: "",
  cover_image: "", photos_text: "", features_text: "",
  is_hmo: false, bills_included: false,
  marketplace_publish: true, publish: true,
  available_from: "", epc_rating: "", tenure: "",
  floor_area_sqft: "", council_tax_band: "", furnished: "",
  agency_id: "" as string,
};

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) + "-" + Math.random().toString(36).slice(2, 7);

export const Route = createFileRoute("/_authenticated/listings")({ component: ListingsPage });

type Form = typeof empty;
type StatusFilter = "all" | "published" | "draft" | "off_market";

function ListingsPage() {
  const [rows, setRows] = useState<Listing[]>([]);
  const [agencies, setAgencies] = useState<{ id: string; name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(empty);
  const [filter, setFilter] = useState<StatusFilter>("all");

  const load = async () => {
    const { data } = await supabase.from("listings").select("*").order("created_at", { ascending: false });
    setRows((data as Listing[]) ?? []);
  };
  const loadAgencies = async () => {
    const { data } = await supabase.from("agencies").select("id,name");
    setAgencies(data ?? []);
  };
  useEffect(() => { load(); loadAgencies(); }, []);

  const openNew = () => { setForm(empty); setOpen(true); };
  const openEdit = (l: Listing) => {
    const photos = Array.isArray(l.photos) ? (l.photos as unknown[]).filter((p): p is string => typeof p === "string") : [];
    const features = Array.isArray(l.features) ? (l.features as unknown[]).filter((f): f is string => typeof f === "string") : [];
    setForm({
      id: l.id,
      title: l.title, description: l.description ?? "",
      listing_type: l.listing_type, purpose: l.purpose,
      price: l.price?.toString() ?? "", price_qualifier: l.price_qualifier ?? "none",
      bedrooms: l.bedrooms?.toString() ?? "", bathrooms: l.bathrooms?.toString() ?? "", receptions: l.receptions?.toString() ?? "",
      address: l.address ?? "", city: l.city ?? "", postcode: l.postcode ?? "",
      cover_image: l.cover_image ?? "", photos_text: photos.join("\n"), features_text: features.join(", "),
      is_hmo: l.is_hmo, bills_included: l.bills_included,
      marketplace_publish: l.marketplace_publish, publish: l.status === "published",
      available_from: l.available_from ?? "", epc_rating: l.epc_rating ?? "",
      tenure: l.tenure ?? "", floor_area_sqft: l.floor_area_sqft?.toString() ?? "",
      council_tax_band: l.council_tax_band ?? "", furnished: l.furnished ?? "",
      agency_id: l.agency_id ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const photos = form.photos_text.split(/\s*\n+\s*/).map((s) => s.trim()).filter(Boolean);
    const features = form.features_text.split(/\s*,\s*/).map((s) => s.trim()).filter(Boolean);
    const payload = {
      title: form.title,
      description: form.description || null,
      listing_type: form.listing_type,
      purpose: form.purpose,
      status: (form.publish ? "published" : "draft") as "published" | "draft",
      price: form.price ? Number(form.price) : null,
      price_qualifier: (form.price_qualifier === "none" ? null : form.price_qualifier) as "asking" | "fixed" | "guide_price" | "offers_in_region" | "offers_over" | "poa" | null,
      bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
      bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
      receptions: form.receptions ? Number(form.receptions) : null,
      address: form.address || null,
      city: form.city || null,
      postcode: form.postcode || null,
      cover_image: form.cover_image || (photos[0] ?? null),
      photos,
      features,
      is_hmo: form.is_hmo,
      bills_included: form.bills_included,
      marketplace_publish: form.marketplace_publish,
      available_from: form.available_from || null,
      epc_rating: form.epc_rating || null,
      tenure: form.tenure || null,
      floor_area_sqft: form.floor_area_sqft ? Number(form.floor_area_sqft) : null,
      council_tax_band: form.council_tax_band || null,
      furnished: form.furnished || null,
      agency_id: form.agency_id || null,
    };

    if (form.id) {
      const { error } = await supabase.from("listings").update(payload).eq("id", form.id);
      if (error) return toast.error(error.message);
      toast.success("Listing updated");
    } else {
      const { error } = await supabase.from("listings").insert({ ...payload, owner_id: u.user.id, slug: slugify(form.title) });
      if (error) return toast.error(error.message);
      toast.success("Listing created");
    }
    setOpen(false); setForm(empty); load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("listings").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  const togglePublish = async (l: Listing) => {
    const next = l.status === "published" ? "draft" : "published";
    const { error } = await supabase.from("listings").update({ status: next }).eq("id", l.id);
    if (error) toast.error(error.message); else { toast.success(next === "published" ? "Published" : "Unpublished"); load(); }
  };

  const toggleMarketplace = async (l: Listing) => {
    const { error } = await supabase.from("listings").update({ marketplace_publish: !l.marketplace_publish }).eq("id", l.id);
    if (error) toast.error(error.message); else { toast.success(l.marketplace_publish ? "Hidden from marketplace" : "Visible on marketplace"); load(); }
  };

  const filtered = rows.filter((l) => filter === "all" ? true : l.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">Listings</h1>
          <p className="text-muted-foreground text-sm">Publish to the Estately marketplace and your own agency page.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> New listing</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{form.id ? "Edit listing" : "New listing"}</DialogTitle></DialogHeader>
            <ListingForm form={form} setForm={setForm} agencies={agencies} />
            <DialogFooter><Button onClick={save} disabled={!form.title}>{form.id ? "Save changes" : "Create listing"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as StatusFilter)}>
        <TabsList>
          <TabsTrigger value="all">All ({rows.length})</TabsTrigger>
          <TabsTrigger value="published">Published ({rows.filter((r) => r.status === "published").length})</TabsTrigger>
          <TabsTrigger value="draft">Drafts ({rows.filter((r) => r.status === "draft").length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent">
          <CardContent className="p-12 text-center text-muted-foreground">
            <Tag className="mx-auto h-10 w-10 mb-3 opacity-40" />
            <div>No listings yet. Create your first one.</div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((l) => (
            <Card key={l.id} className="border-0 shadow-card overflow-hidden">
              <div className="aspect-[16/10] bg-muted relative">
                {l.cover_image && <img src={l.cover_image} alt="" className="h-full w-full object-cover" />}
                <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="capitalize">{l.purpose}</Badge>
                  <Badge variant={l.status === "published" ? "default" : "outline"}>{l.status}</Badge>
                  {l.is_hmo && <Badge className="bg-accent text-accent-foreground">HMO</Badge>}
                </div>
                {!l.marketplace_publish && (
                  <div className="absolute top-2 right-2"><Badge variant="outline" className="bg-card/90 backdrop-blur"><EyeOff className="h-3 w-3 mr-1" />Off marketplace</Badge></div>
                )}
              </div>
              <CardContent className="p-4 space-y-2">
                <div className="font-semibold line-clamp-1">{l.title}</div>
                <div className="text-sm text-muted-foreground">{l.city ?? "—"} {l.price && <>· £{Number(l.price).toLocaleString()}</>}</div>
                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs text-muted-foreground inline-flex items-center gap-1"><Eye className="h-3 w-3" />{l.view_count}</div>
                  <div className="flex items-center gap-1">
                    {l.status === "published" && (
                      <Button asChild size="icon" variant="ghost" className="h-8 w-8" title="View public page">
                        <Link to="/marketplace/$slug" params={{ slug: l.slug }}><ExternalLink className="h-3.5 w-3.5" /></Link>
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-8 w-8" title={l.marketplace_publish ? "Hide from marketplace" : "Show on marketplace"} onClick={() => toggleMarketplace(l)}>
                      <Globe className={`h-3.5 w-3.5 ${l.marketplace_publish ? "text-primary" : "text-muted-foreground"}`} />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" title={l.status === "published" ? "Unpublish" : "Publish"} onClick={() => togglePublish(l)}>
                      {l.status === "published" ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" title="Edit" onClick={() => openEdit(l)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" title="Delete"><Trash2 className="h-3.5 w-3.5" /></Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Delete this listing?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => remove(l.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ListingForm({ form, setForm, agencies }: { form: Form; setForm: (f: Form) => void; agencies: { id: string; name: string }[] }) {
  const u = <K extends keyof Form>(k: K, v: Form[K]) => setForm({ ...form, [k]: v });
  return (
    <div className="space-y-4 pr-1">
      <div><Label>Title *</Label><Input value={form.title} onChange={(e) => u("title", e.target.value)} placeholder="2 bed modern flat with balcony" /></div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Purpose</Label>
          <Select value={form.purpose} onValueChange={(v) => u("purpose", v as Form["purpose"])}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sale">For sale</SelectItem>
              <SelectItem value="rent">To let</SelectItem>
              <SelectItem value="commercial">Commercial</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Listing type</Label>
          <Select value={form.listing_type} onValueChange={(v) => u("listing_type", v as Form["listing_type"])}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sale">Sale</SelectItem>
              <SelectItem value="rent">Whole property let</SelectItem>
              <SelectItem value="room">Room (HMO)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div><Label>Price (£)</Label><Input type="number" value={form.price} onChange={(e) => u("price", e.target.value)} /></div>
        <div className="col-span-2">
          <Label>Price qualifier</Label>
          <Select value={form.price_qualifier} onValueChange={(v) => u("price_qualifier", v)}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No qualifier</SelectItem>
              <SelectItem value="asking">Asking price</SelectItem>
              <SelectItem value="fixed">Fixed price</SelectItem>
              <SelectItem value="guide_price">Guide price</SelectItem>
              <SelectItem value="offers_over">Offers over</SelectItem>
              <SelectItem value="offers_in_region">Offers in region of</SelectItem>
              <SelectItem value="poa">POA</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div><Label>Beds</Label><Input type="number" value={form.bedrooms} onChange={(e) => u("bedrooms", e.target.value)} /></div>
        <div><Label>Baths</Label><Input type="number" value={form.bathrooms} onChange={(e) => u("bathrooms", e.target.value)} /></div>
        <div><Label>Receptions</Label><Input type="number" value={form.receptions} onChange={(e) => u("receptions", e.target.value)} /></div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><Label>Address</Label><Input value={form.address} onChange={(e) => u("address", e.target.value)} placeholder="12 High Street" /></div>
        <div><Label>City</Label><Input value={form.city} onChange={(e) => u("city", e.target.value)} placeholder="London" /></div>
        <div><Label>Postcode</Label><Input value={form.postcode} onChange={(e) => u("postcode", e.target.value)} placeholder="SW1A 1AA" /></div>
      </div>

      <div><Label>Cover image URL</Label><Input value={form.cover_image} onChange={(e) => u("cover_image", e.target.value)} placeholder="https://…" /></div>
      <div>
        <Label>Photo gallery URLs <span className="text-muted-foreground text-xs">(one per line)</span></Label>
        <Textarea rows={3} value={form.photos_text} onChange={(e) => u("photos_text", e.target.value)} placeholder="https://...&#10;https://..." />
      </div>
      <div>
        <Label>Features <span className="text-muted-foreground text-xs">(comma separated)</span></Label>
        <Input value={form.features_text} onChange={(e) => u("features_text", e.target.value)} placeholder="garden, parking, gas central heating" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div><Label>EPC</Label>
          <Select value={form.epc_rating || "none"} onValueChange={(v) => u("epc_rating", v === "none" ? "" : v)}>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">—</SelectItem>
              {["A","B","C","D","E","F","G"].map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label>Floor area (sq ft)</Label><Input type="number" value={form.floor_area_sqft} onChange={(e) => u("floor_area_sqft", e.target.value)} /></div>
        <div><Label>Council tax</Label>
          <Select value={form.council_tax_band || "none"} onValueChange={(v) => u("council_tax_band", v === "none" ? "" : v)}>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">—</SelectItem>
              {["A","B","C","D","E","F","G","H"].map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div><Label>Tenure</Label>
          <Select value={form.tenure || "none"} onValueChange={(v) => u("tenure", v === "none" ? "" : v)}>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">—</SelectItem>
              <SelectItem value="freehold">Freehold</SelectItem>
              <SelectItem value="leasehold">Leasehold</SelectItem>
              <SelectItem value="share_of_freehold">Share of freehold</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>Furnishing</Label>
          <Select value={form.furnished || "none"} onValueChange={(v) => u("furnished", v === "none" ? "" : v)}>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">—</SelectItem>
              <SelectItem value="furnished">Furnished</SelectItem>
              <SelectItem value="part_furnished">Part furnished</SelectItem>
              <SelectItem value="unfurnished">Unfurnished</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div><Label>Available from</Label><Input type="date" value={form.available_from} onChange={(e) => u("available_from", e.target.value)} /></div>

      {agencies.length > 0 && (
        <div><Label>Agency</Label>
          <Select value={form.agency_id || "none"} onValueChange={(v) => u("agency_id", v === "none" ? "" : v)}>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder="No agency" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No agency</SelectItem>
              {agencies.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <div><Label>Description</Label><Textarea rows={5} value={form.description} onChange={(e) => u("description", e.target.value)} placeholder="Long-form description…" /></div>

      <div className="space-y-2 rounded-lg border p-3">
        <div className="flex items-center justify-between"><Label htmlFor="hmo" className="cursor-pointer">HMO room</Label><Switch id="hmo" checked={form.is_hmo} onCheckedChange={(v) => u("is_hmo", v)} /></div>
        <div className="flex items-center justify-between"><Label htmlFor="bills" className="cursor-pointer">Bills included</Label><Switch id="bills" checked={form.bills_included} onCheckedChange={(v) => u("bills_included", v)} /></div>
        <div className="flex items-center justify-between"><Label htmlFor="mp" className="cursor-pointer">Show on Estately marketplace</Label><Switch id="mp" checked={form.marketplace_publish} onCheckedChange={(v) => u("marketplace_publish", v)} /></div>
        <div className="flex items-center justify-between"><Label htmlFor="pub" className="cursor-pointer">Publish now</Label><Switch id="pub" checked={form.publish} onCheckedChange={(v) => u("publish", v)} /></div>
        <p className="text-xs text-muted-foreground">Turn off "marketplace" to keep the listing only on your agency page.</p>
      </div>
    </div>
  );
}
