import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Tag,
  ExternalLink,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Globe,
  Printer,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { ListingImage } from "@/components/ListingImage";

type Listing = {
  id: string;
  owner_id: string;
  slug: string;
  title: string;
  description: string | null;
  listing_type: "sale" | "rent" | "room";
  purpose: "sale" | "rent";
  status: string;
  price: number | null;
  price_qualifier: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  receptions: number | null;
  city: string | null;
  postcode: string | null;
  address: string | null;
  cover_image: string | null;
  photos: unknown;
  features: unknown;
  is_hmo: boolean;
  bills_included: boolean;
  marketplace_publish: boolean;
  website_publish: boolean;
  available_from: string | null;
  epc_rating: string | null;
  tenure: string | null;
  floor_area_sqft: number | null;
  council_tax_band: string | null;
  furnished: string | null;
  agency_id: string | null;
  property_id: string | null;
  view_count: number;
  rooms?: unknown;
  compliance?: unknown;
};

type PropertyOption = {
  id: string;
  title: string;
  address: string | null;
  city: string | null;
  postcode: string | null;
  property_type: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  is_hmo: boolean;
  listing_purpose: string;
  description: string | null;
  epc_rating: string | null;
  tenure: string | null;
  furnished: string | null;
  council_tax_band: string | null;
  floor_area_sqft: number | null;
  bills_included: boolean;
  available_from: string | null;
  cover_image: string | null;
  photos: unknown;
  features: unknown;
  compliance: unknown;
  price: number | null;
  price_qualifier: string | null;
  nightly_rate: number | null;
};

const empty = {
  id: undefined as string | undefined,
  property_id: "",
  title_override: "",
  description_override: "",
  price: "",
  price_qualifier: "none",
  agency_id: "",
  marketplace_publish: true,
  website_publish: true,
  publish: true,
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) +
  "-" +
  Math.random().toString(36).slice(2, 7);

export const Route = createFileRoute("/_authenticated/listings")({
  head: () => ({ meta: [{ title: "Listings — Estately" }] }),
  validateSearch: (search: Record<string, unknown>): { new?: boolean } =>
    search.new === true || search.new === "true" ? { new: true } : {},
  component: ListingsPage,
});

type Form = typeof empty;
type StatusFilter = "all" | "published" | "draft";

function ListingsPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/_authenticated/listings" });
  const [rows, setRows] = useState<Listing[]>([]);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [agencies, setAgencies] = useState<{ id: string; name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(empty);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [saving, setSaving] = useState(false);
  const formRef = useRef<Form>(empty);

  const updateForm: React.Dispatch<React.SetStateAction<Form>> = (next) => {
    setForm((prev) => {
      const resolved = typeof next === "function" ? (next as (prev: Form) => Form)(prev) : next;
      formRef.current = resolved;
      return resolved;
    });
  };

  useEffect(() => {
    if (search.new) {
      updateForm(empty);
      setOpen(true);
    }
  }, [search.new]);

  const onListingDialogChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen && search.new) {
      void navigate({ to: "/listings", search: {}, replace: true });
    }
  };

  const fetchManagedAgencies = useCallback(async (userId: string) => {
    const [{ data: owned }, { data: memberships }] = await Promise.all([
      supabase.from("agencies").select("id,name").eq("owner_id", userId),
      supabase.from("agency_members").select("agency_id").eq("user_id", userId),
    ]);
    const memberIds = (memberships ?? []).map((m) => m.agency_id).filter(Boolean) as string[];
    let memberAgencies: { id: string; name: string }[] = [];
    if (memberIds.length) {
      const { data } = await supabase.from("agencies").select("id,name").in("id", memberIds);
      memberAgencies = data ?? [];
    }
    return [...(owned ?? []), ...memberAgencies].filter(
      (a, i, all) => all.findIndex((c) => c.id === a.id) === i,
    );
  }, []);

  const load = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setRows([]);
      setAgencies([]);
      setProperties([]);
      return [] as Listing[];
    }
    const managed = await fetchManagedAgencies(u.user.id);
    setAgencies(managed);
    const managedIds = new Set(managed.map((a) => a.id));
    const [{ data: listingData }, { data: propData }] = await Promise.all([
      supabase.from("listings").select("*").order("created_at", { ascending: false }),
      supabase.from("properties").select("*").order("created_at", { ascending: false }),
    ]);
    const visible = ((listingData as Listing[]) ?? []).filter(
      (l) => l.owner_id === u.user!.id || (!!l.agency_id && managedIds.has(l.agency_id)),
    );
    setRows(visible);
    setProperties((propData as PropertyOption[]) ?? []);
    return visible;
  }, [fetchManagedAgencies]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) void load();
    };
    void run();
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") {
        if (session) void load();
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel(`listings-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "listings" },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load]);

  const openNew = () => {
    updateForm(empty);
    setOpen(true);
  };
  const openEdit = (l: Listing) => {
    updateForm({
      id: l.id,
      property_id: l.property_id ?? "",
      title_override: l.title ?? "",
      description_override: l.description ?? "",
      price: l.price?.toString() ?? "",
      price_qualifier: l.price_qualifier ?? "none",
      agency_id: l.agency_id ?? "",
      marketplace_publish: l.marketplace_publish,
      website_publish: l.website_publish ?? true,
      publish: l.status === "published",
    });
    setOpen(true);
  };

  const save = async () => {
    if (saving) return;
    const f = formRef.current;
    if (!f.property_id) return toast.error("Select a property");
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setSaving(false);
      return;
    }
    const prop = properties.find((p) => p.id === f.property_id);
    if (!prop) {
      setSaving(false);
      return toast.error("Property not found");
    }

    const purpose: "sale" | "rent" = prop.listing_purpose === "sale" ? "sale" : "rent";
    const listing_type: "sale" | "rent" | "room" = prop.is_hmo ? "room" : purpose;
    const defaultPrice = prop.listing_purpose === "short_let" ? prop.nightly_rate : prop.price;
    const finalPrice = f.price ? Number(f.price) : defaultPrice;

    const payload: any = {
      property_id: prop.id,
      title: (f.title_override || prop.title || "").trim(),
      description: f.description_override || prop.description,
      listing_type,
      purpose,
      status: f.publish ? "published" : "draft",
      price: finalPrice,
      price_qualifier:
        f.price_qualifier === "none" ? (prop.price_qualifier ?? null) : f.price_qualifier,
      address: prop.address,
      city: prop.city,
      postcode: prop.postcode,
      bedrooms: prop.bedrooms,
      bathrooms: prop.bathrooms,
      is_hmo: prop.is_hmo,
      bills_included: prop.bills_included,
      features: (prop.features ?? []) as any,
      photos: (prop.photos ?? []) as any,
      cover_image: prop.cover_image,
      epc_rating: prop.epc_rating,
      tenure: prop.tenure as any,
      furnished: prop.furnished,
      council_tax_band: prop.council_tax_band,
      floor_area_sqft: prop.floor_area_sqft,
      available_from: prop.available_from,
      compliance: (prop.compliance ?? {}) as any,
      marketplace_publish: f.marketplace_publish,
      website_publish: f.website_publish,
      agency_id: f.agency_id || null,
    };

    // Geocode from postcode
    try {
      const pc = (prop.postcode || "").trim();
      if (pc) {
        const r = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(pc)}`);
        if (r.ok) {
          const j = await r.json();
          if (j?.result) {
            payload.latitude = j.result.latitude;
            payload.longitude = j.result.longitude;
          }
        }
      }
    } catch {
      /* non-fatal */
    }

    if (f.id) {
      const { error } = await supabase
        .from("listings")
        .update(payload)
        .eq("id", f.id)
        .select("id")
        .single();
      if (error) {
        setSaving(false);
        return toast.error(error.message);
      }
    } else {
      const { error } = await supabase
        .from("listings")
        .insert({
          ...payload,
          owner_id: u.user.id,
          slug: slugify(payload.title || prop.title || "listing"),
        })
        .select("id")
        .single();
      if (error) {
        setSaving(false);
        return toast.error(error.message);
      }
    }

    toast.success(f.id ? "Listing updated" : "Listing created");
    await load();
    setOpen(false);
    updateForm(empty);
    setFilter("all");
    setSaving(false);
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("listings").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      load();
    }
  };

  const togglePublish = async (l: Listing) => {
    const next = l.status === "published" ? "draft" : "published";
    const { error } = await supabase.from("listings").update({ status: next }).eq("id", l.id);
    if (error) toast.error(error.message);
    else {
      toast.success(next === "published" ? "Published" : "Unpublished");
      load();
    }
  };

  const toggleMarketplace = async (l: Listing) => {
    const { error } = await supabase
      .from("listings")
      .update({ marketplace_publish: !l.marketplace_publish })
      .eq("id", l.id);
    if (error) toast.error(error.message);
    else {
      toast.success(l.marketplace_publish ? "Hidden from marketplace" : "Visible on marketplace");
      load();
    }
  };

  const filtered = rows.filter((l) => (filter === "all" ? true : l.status === filter));
  const usedPropertyIds = new Set(rows.map((r) => r.property_id).filter(Boolean) as string[]);
  const availableProps = properties.filter(
    (p) => form.id || !usedPropertyIds.has(p.id) || p.id === form.property_id,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Listings"
        description="Pick a property and publish it to the Estately marketplace and/or your own agency website."
        actions={
          <Dialog open={open} onOpenChange={onListingDialogChange}>
            <DialogTrigger asChild>
              <Button onClick={openNew}>
                <Plus className="mr-2 h-4 w-4" /> New listing
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{form.id ? "Edit listing" : "New listing"}</DialogTitle>
              </DialogHeader>
              <ListingForm
                form={form}
                setForm={updateForm}
                properties={availableProps}
                agencies={agencies}
              />
              <DialogFooter>
                <Button onClick={save} disabled={!form.property_id || saving}>
                  {saving ? "Saving…" : form.id ? "Save changes" : "Create listing"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {properties.length === 0 && (
        <Card className="border-dashed border-2 bg-transparent">
          <CardContent className="p-8 text-center text-muted-foreground">
            <Building2 className="mx-auto h-10 w-10 mb-3 opacity-40" />
            <div className="mb-3">You need a property before creating a listing.</div>
            <Button asChild>
              <Link to="/properties">Add a property first</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs value={filter} onValueChange={(v) => setFilter(v as StatusFilter)}>
        <TabsList>
          <TabsTrigger value="all">All ({rows.length})</TabsTrigger>
          <TabsTrigger value="published">
            Published ({rows.filter((r) => r.status === "published").length})
          </TabsTrigger>
          <TabsTrigger value="draft">
            Drafts ({rows.filter((r) => r.status === "draft").length})
          </TabsTrigger>
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
                {l.cover_image && (
                  <ListingImage src={l.cover_image} alt="" className="h-full w-full object-cover" />
                )}
                <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="capitalize">
                    {l.purpose}
                  </Badge>
                  <Badge variant={l.status === "published" ? "default" : "outline"}>
                    {l.status}
                  </Badge>
                  {l.is_hmo && <Badge className="bg-accent text-accent-foreground">HMO</Badge>}
                </div>
                <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                  {!l.marketplace_publish && (
                    <Badge variant="outline" className="bg-card/90 backdrop-blur">
                      <EyeOff className="h-3 w-3 mr-1" />
                      Off marketplace
                    </Badge>
                  )}
                  {l.website_publish === false && (
                    <Badge variant="outline" className="bg-card/90 backdrop-blur">
                      <EyeOff className="h-3 w-3 mr-1" />
                      Off website
                    </Badge>
                  )}
                </div>
              </div>
              <CardContent className="p-4 space-y-2">
                <div className="font-semibold line-clamp-1">{l.title}</div>
                <div className="text-sm text-muted-foreground">
                  {l.city ?? "—"} {l.price && <>· £{Number(l.price).toLocaleString()}</>}
                </div>
                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {l.view_count}
                  </div>
                  <div className="flex items-center gap-1">
                    {l.status === "published" && (
                      <Button
                        asChild
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        title="View public page"
                      >
                        <Link to="/marketplace/$slug" params={{ slug: l.slug }}>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      title={
                        l.marketplace_publish ? "Hide from marketplace" : "Show on marketplace"
                      }
                      onClick={() => toggleMarketplace(l)}
                    >
                      <Globe
                        className={`h-3.5 w-3.5 ${l.marketplace_publish ? "text-primary" : "text-muted-foreground"}`}
                      />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      title={l.status === "published" ? "Unpublish" : "Publish"}
                      onClick={() => togglePublish(l)}
                    >
                      {l.status === "published" ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      asChild
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      title="Window card (print)"
                    >
                      <Link to="/listing/$id/window-card" params={{ id: l.id }}>
                        <Printer className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      title="Edit"
                      onClick={() => openEdit(l)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this listing?</AlertDialogTitle>
                          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove(l.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
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

function ListingForm({
  form,
  setForm,
  properties,
  agencies,
}: {
  form: Form;
  setForm: React.Dispatch<React.SetStateAction<Form>>;
  properties: PropertyOption[];
  agencies: { id: string; name: string }[];
}) {
  const u = <K extends keyof Form>(k: K, v: Form[K]) => setForm((prev) => ({ ...prev, [k]: v }));
  const selected = properties.find((p) => p.id === form.property_id) ?? null;

  return (
    <div className="space-y-4 pr-1">
      <div>
        <Label>Property *</Label>
        <Select
          value={form.property_id}
          onValueChange={(v) => {
            const p = properties.find((x) => x.id === v);
            setForm((prev) => ({
              ...prev,
              property_id: v,
              price:
                prev.price ||
                (p?.listing_purpose === "short_let"
                  ? (p?.nightly_rate?.toString() ?? "")
                  : (p?.price?.toString() ?? "")),
              price_qualifier:
                prev.price_qualifier === "none"
                  ? (p?.price_qualifier ?? "none")
                  : prev.price_qualifier,
            }));
          }}
        >
          <SelectTrigger className="mt-1.5">
            <SelectValue placeholder="Choose a property…" />
          </SelectTrigger>
          <SelectContent>
            {properties.length === 0 && (
              <div className="text-xs text-muted-foreground p-2">
                No properties available. Add one from the Properties page first.
              </div>
            )}
            {properties.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.title} {p.postcode ? `· ${p.postcode}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1.5">
          All photos, features, EPC, compliance & details come from the selected property. Update
          them on the Properties page.
        </p>
      </div>

      {selected && (
        <Card className="bg-muted/40 border-0">
          <CardContent className="p-3 text-xs space-y-1">
            <div className="flex flex-wrap gap-1.5 mb-1">
              <Badge variant="secondary" className="capitalize">
                {selected.listing_purpose.replace("_", " ")}
              </Badge>
              {selected.is_hmo && <Badge className="bg-accent text-accent-foreground">HMO</Badge>}
              {selected.bills_included && <Badge variant="outline">Bills inc.</Badge>}
              {selected.epc_rating && <Badge variant="outline">EPC {selected.epc_rating}</Badge>}
              {selected.tenure && (
                <Badge variant="outline" className="capitalize">
                  {selected.tenure.replace("_", " ")}
                </Badge>
              )}
              {selected.furnished && (
                <Badge variant="outline" className="capitalize">
                  {selected.furnished.replace("_", " ")}
                </Badge>
              )}
            </div>
            <div className="text-muted-foreground">
              {[selected.address, selected.city, selected.postcode].filter(Boolean).join(", ") ||
                "No address"}
            </div>
            <div className="text-muted-foreground">
              {selected.bedrooms ?? "—"} bed · {selected.bathrooms ?? "—"} bath
              {selected.floor_area_sqft ? ` · ${selected.floor_area_sqft} sq ft` : ""}
              {Array.isArray(selected.photos)
                ? ` · ${(selected.photos as unknown[]).length} photos`
                : ""}
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <Label>Title (optional override)</Label>
        <Input
          value={form.title_override}
          onChange={(e) => u("title_override", e.target.value)}
          placeholder={selected?.title ?? "Listing title"}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Price (£)</Label>
          <Input
            type="number"
            value={form.price}
            onChange={(e) => u("price", e.target.value)}
            placeholder={selected?.price?.toString() ?? ""}
          />
        </div>
        <div>
          <Label>Price qualifier</Label>
          <Select value={form.price_qualifier} onValueChange={(v) => u("price_qualifier", v)}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
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

      <div>
        <Label>Description (optional override)</Label>
        <Textarea
          rows={4}
          value={form.description_override}
          onChange={(e) => u("description_override", e.target.value)}
          placeholder={selected?.description ?? "Use the property description"}
        />
      </div>

      {agencies.length > 0 && (
        <div>
          <Label>Agency</Label>
          <Select
            value={form.agency_id || "none"}
            onValueChange={(v) => u("agency_id", v === "none" ? "" : v)}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="No agency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No agency</SelectItem>
              {agencies.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2 rounded-lg border p-3">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
          Publish to
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="mp" className="cursor-pointer">
            Estately marketplace
          </Label>
          <Switch
            id="mp"
            checked={form.marketplace_publish}
            onCheckedChange={(v) => u("marketplace_publish", v)}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="ws" className="cursor-pointer">
            Your own agency website
          </Label>
          <Switch
            id="ws"
            checked={form.website_publish}
            onCheckedChange={(v) => u("website_publish", v)}
          />
        </div>
        <div className="flex items-center justify-between pt-2 border-t">
          <Label htmlFor="pub" className="cursor-pointer">
            Publish now (otherwise saved as draft)
          </Label>
          <Switch id="pub" checked={form.publish} onCheckedChange={(v) => u("publish", v)} />
        </div>
      </div>
    </div>
  );
}
