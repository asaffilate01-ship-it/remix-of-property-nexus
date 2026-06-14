import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import React, { useEffect, useState } from "react";
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
import { Plus, Tag, ExternalLink, Pencil, Trash2, Eye, EyeOff, Globe, Printer } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { PhotoUploader, type ListingPhoto } from "@/components/listings/PhotoUploader";
import { RoomsEditor, type HmoRoom } from "@/components/listings/RoomsEditor";
import { ComplianceEditor, type ComplianceMap } from "@/components/listings/ComplianceEditor";
import { FeatureMultiSelect } from "@/components/properties/FeatureMultiSelect";
import { AddressLookup } from "@/components/address/AddressLookup";

type Listing = {
  id: string; owner_id: string; slug: string; title: string; description: string | null;
  listing_type: "sale" | "rent" | "room" | "holiday"; purpose: "sale" | "rent";
  status: string; price: number | null; price_qualifier: string | null;
  bedrooms: number | null; bathrooms: number | null; receptions: number | null;
  city: string | null; postcode: string | null; address: string | null;
  cover_image: string | null; photos: unknown; features: unknown;
  is_hmo: boolean; bills_included: boolean; marketplace_publish: boolean;
  available_from: string | null; epc_rating: string | null; tenure: string | null;
  floor_area_sqft: number | null; council_tax_band: string | null; furnished: string | null;
  agency_id: string | null; view_count: number;
  rooms?: unknown; compliance?: unknown;
};

const empty = {
  id: undefined as string | undefined,
  title: "", description: "",
  listing_type: "rent" as "sale" | "rent" | "room" | "holiday",
  purpose: "rent" as "sale" | "rent",
  price: "", price_qualifier: "none",
  bedrooms: "", bathrooms: "", receptions: "",
  address: "", city: "", postcode: "",
  cover_image: "",
  photos: [] as ListingPhoto[],
  cover_index: 0,
  features: [] as string[],
  rooms: [] as HmoRoom[],
  compliance: {} as ComplianceMap,
  is_hmo: false, bills_included: false,
  marketplace_publish: true, publish: true,
  available_from: "", epc_rating: "", tenure: "",
  floor_area_sqft: "", council_tax_band: "", furnished: "",
  agency_id: "" as string,
};

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) + "-" + Math.random().toString(36).slice(2, 7);

function normalizePhotos(raw: unknown): ListingPhoto[] {
  if (!Array.isArray(raw)) return [];
  const out: ListingPhoto[] = [];
  for (const p of raw as unknown[]) {
    if (typeof p === "string") out.push({ url: p, room: null });
    else if (p && typeof p === "object" && "url" in (p as any)) out.push({ url: String((p as any).url), room: (p as any).room ?? null });
  }
  return out;
}

export const Route = createFileRoute("/_authenticated/listings")({ component: ListingsPage });

type Form = typeof empty;
type StatusFilter = "all" | "published" | "draft" | "off_market" | "holiday";

function ListingsPage() {
  const search = useSearch({ from: "/_authenticated/listings" });
  const [rows, setRows] = useState<Listing[]>([]);
  const [agencies, setAgencies] = useState<{ id: string; name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(empty);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [saving, setSaving] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  useEffect(() => {
    if (search.new) { setForm(empty); setOpen(true); }
  }, [search.new]);

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setRows([]);
      return;
    }
    const managedAgencyIds = new Set(agencies.map((a) => a.id));
    const { data } = await supabase
      .from("listings")
      .select("*")
      .order("created_at", { ascending: false });
    const visible = ((data as Listing[]) ?? []).filter((listing) => listing.owner_id === u.user.id || (!!listing.agency_id && managedAgencyIds.has(listing.agency_id)));
    setRows(visible);
  };
  const loadAgencies = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setAgencies([]);
      return;
    }
    const [{ data: owned }, { data: memberships }] = await Promise.all([
      supabase.from("agencies").select("id,name").eq("owner_id", u.user.id),
      supabase.from("agency_members").select("agency_id").eq("user_id", u.user.id),
    ]);
    const memberAgencyIds = (memberships ?? []).map((m) => m.agency_id).filter(Boolean);
    if (memberAgencyIds.length === 0) {
      setAgencies(owned ?? []);
      return;
    }
    const { data: memberAgencies } = await supabase.from("agencies").select("id,name").in("id", memberAgencyIds);
    const merged = [...(owned ?? []), ...(memberAgencies ?? [])].filter(
      (agency, index, all) => all.findIndex((candidate) => candidate.id === agency.id) === index,
    );
    setAgencies(merged);
  };
  useEffect(() => { void loadAgencies(); }, []);
  useEffect(() => { void load(); }, [agencies]);

  useEffect(() => {
    const channel = supabase
      .channel(`listings-${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "listings" }, () => void load())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const openNew = () => { setForm(empty); setOpen(true); };
  const openEdit = (l: Listing) => {
    const photos = normalizePhotos(l.photos);
    const features = Array.isArray(l.features) ? (l.features as unknown[]).filter((f): f is string => typeof f === "string") : [];
    const rooms = Array.isArray(l.rooms) ? (l.rooms as HmoRoom[]) : [];
    const compliance = (l.compliance && typeof l.compliance === "object" ? l.compliance : {}) as ComplianceMap;
    const coverIdx = Math.max(0, photos.findIndex((p) => p.url === l.cover_image));
    setForm({
      id: l.id,
      title: l.title, description: l.description ?? "",
      listing_type: l.listing_type, purpose: l.purpose,
      price: l.price?.toString() ?? "", price_qualifier: l.price_qualifier ?? "none",
      bedrooms: l.bedrooms?.toString() ?? "", bathrooms: l.bathrooms?.toString() ?? "", receptions: l.receptions?.toString() ?? "",
      address: l.address ?? "", city: l.city ?? "", postcode: l.postcode ?? "",
      cover_image: l.cover_image ?? "",
      photos,
      cover_index: coverIdx >= 0 ? coverIdx : 0,
      features,
      rooms,
      compliance,
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
    if (saving || uploadingPhotos) return;
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setSaving(false);
      return;
    }
    const photos = form.photos;
    const coverUrl = photos[form.cover_index]?.url ?? photos[0]?.url ?? form.cover_image ?? null;
    // If HMO, infer bedrooms from rooms count
    const bedroomsValue = form.is_hmo
      ? (form.rooms.length || (form.bedrooms ? Number(form.bedrooms) : null))
      : (form.bedrooms ? Number(form.bedrooms) : null);
    // Sync epc_rating top-level if compliance has one (keep existing field too)
    const payload: any = {
      title: form.title,
      description: form.description || null,
      listing_type: form.listing_type,
      purpose: form.purpose,
      status: (form.publish ? "published" : "draft") as "published" | "draft",
      price: form.price ? Number(form.price) : null,
      price_qualifier: (form.price_qualifier === "none" ? null : form.price_qualifier),
      bedrooms: bedroomsValue,
      bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
      receptions: form.receptions ? Number(form.receptions) : null,
      address: form.address || null,
      city: form.city || null,
      postcode: form.postcode || null,
      cover_image: coverUrl,
      photos: photos as any,
      features: form.features as any,
      rooms: form.rooms as any,
      compliance: form.compliance as any,
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
      if (error) {
        setSaving(false);
        return toast.error(error.message);
      }
      toast.success("Listing updated");
    } else {
      const { error } = await supabase.from("listings").insert({ ...payload, owner_id: u.user.id, slug: slugify(form.title) });
      if (error) {
        setSaving(false);
        return toast.error(error.message);
      }
      toast.success("Listing created");
    }
    setOpen(false); setForm(empty); setFilter("all"); await load();
    setSaving(false);
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

  const filtered = rows.filter((l) => {
    if (filter === "all") return true;
    if (filter === "holiday") return l.listing_type === "holiday";
    return l.status === filter;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Listings"
        description="Publish to the Estately marketplace and your own agency page."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> New listing</Button></DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{form.id ? "Edit listing" : "New listing"}</DialogTitle></DialogHeader>
                <ListingForm form={form} setForm={setForm} agencies={agencies} onUploadingChange={setUploadingPhotos} />
                <DialogFooter><Button onClick={save} disabled={!form.title || saving || uploadingPhotos}>{uploadingPhotos ? "Uploading photos…" : saving ? "Saving…" : form.id ? "Save changes" : "Create listing"}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />


      <Tabs value={filter} onValueChange={(v) => setFilter(v as StatusFilter)}>
        <TabsList>
          <TabsTrigger value="all">All ({rows.length})</TabsTrigger>
          <TabsTrigger value="published">Published ({rows.filter((r) => r.status === "published").length})</TabsTrigger>
          <TabsTrigger value="draft">Drafts ({rows.filter((r) => r.status === "draft").length})</TabsTrigger>
          <TabsTrigger value="holiday">Holiday ({rows.filter((r) => r.listing_type === "holiday").length})</TabsTrigger>
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
                  {l.listing_type === "holiday" && <Badge className="bg-amber-500 text-white border-0">Holiday</Badge>}
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
                    <Button asChild size="icon" variant="ghost" className="h-8 w-8" title="Window card (print)">
                      <Link to="/listing/$id/window-card" params={{ id: l.id }}><Printer className="h-3.5 w-3.5" /></Link>
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

function ListingForm({ form, setForm, agencies, onUploadingChange }: { form: Form; setForm: React.Dispatch<React.SetStateAction<Form>>; agencies: { id: string; name: string }[]; onUploadingChange?: (uploading: boolean) => void }) {
  const u = <K extends keyof Form>(k: K, v: Form[K]) => setForm((prev) => ({ ...prev, [k]: v }));
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
              
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Listing type</Label>
          <Select
            value={form.listing_type}
            onValueChange={(v) => {
              const next = v as Form["listing_type"];
              setForm({ ...form, listing_type: next, is_hmo: next === "room" ? true : form.is_hmo });
            }}
          >
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
              <SelectItem value="guide_price">Guide price</SelectItem>
              <SelectItem value="offers_over">Offers over</SelectItem>
              <SelectItem value="offers_in_region">Offers in region of</SelectItem>
              <SelectItem value="poa">POA</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {form.is_hmo ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Baths</Label><Input type="number" value={form.bathrooms} onChange={(e) => u("bathrooms", e.target.value)} /></div>
            <div><Label>Receptions</Label><Input type="number" value={form.receptions} onChange={(e) => u("receptions", e.target.value)} /></div>
          </div>
          <RoomsEditor rooms={form.rooms} onChange={(rooms) => u("rooms", rooms)} />
        </>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <div><Label>Beds</Label><Input type="number" value={form.bedrooms} onChange={(e) => u("bedrooms", e.target.value)} /></div>
          <div><Label>Baths</Label><Input type="number" value={form.bathrooms} onChange={(e) => u("bathrooms", e.target.value)} /></div>
          <div><Label>Receptions</Label><Input type="number" value={form.receptions} onChange={(e) => u("receptions", e.target.value)} /></div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <AddressLookup
            onResolve={(a) => setForm({
              ...form,
              address: a.line1 || form.address,
              city: a.city || form.city,
              postcode: a.postcode || form.postcode,
            })}
          />
        </div>
        <div className="col-span-2"><Label>Address</Label><Input value={form.address} onChange={(e) => u("address", e.target.value)} placeholder="12 High Street" /></div>
        <div><Label>City</Label><Input value={form.city} onChange={(e) => u("city", e.target.value)} placeholder="London" /></div>
        <div><Label>Postcode</Label><Input value={form.postcode} onChange={(e) => u("postcode", e.target.value)} placeholder="SW1A 1AA" /></div>
      </div>

      <div>
        <Label>Photos</Label>
        <p className="text-xs text-muted-foreground mb-2">Drag & drop or upload. Click the star to set the cover image{form.is_hmo ? "; tag each shot to a room." : "."}</p>
        <PhotoUploader
          photos={form.photos}
          onChange={(photos) => u("photos", photos)}
          coverIndex={form.cover_index}
          onCoverChange={(i) => u("cover_index", i)}
          roomOptions={form.is_hmo ? form.rooms.map((r) => `Room ${r.room_number}${r.name ? ` – ${r.name}` : ""}`) : []}
          onUploadingChange={onUploadingChange}
        />
      </div>

      <div>
        <Label>Features</Label>
        <FeatureMultiSelect value={form.features} onChange={(features) => u("features", features)} />
      </div>

      <ComplianceEditor value={form.compliance} onChange={(c) => u("compliance", c)} isHmo={form.is_hmo} />


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
