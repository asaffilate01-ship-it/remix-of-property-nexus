import { createFileRoute, useParams, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { ListingCard } from "@/components/ListingCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { fetchListing, submitLead } from "@/lib/public.functions";
import { Bed, Bath, MapPin, Calendar, Ruler, Zap, Shield, ChevronLeft, Share2, Mail, Globe, Calculator, Sparkles, Home, Building2 } from "lucide-react";
import { PhoneReveal } from "@/components/PhoneReveal";
import { useMemo, useState } from "react";
import { toast } from "sonner";

function ListingError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <Shell>
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-xl font-semibold tracking-tight">This listing didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">Something went wrong. Try refreshing or browse other listings.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }} className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">Try again</button>
          <Link to="/marketplace" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent">Browse marketplace</Link>
        </div>
      </div>
    </Shell>
  );
}

function ListingNotFound() {
  return (
    <Shell>
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Listing not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">We couldn't find that property. It may have been removed or the link might be incorrect.</p>
        <div className="mt-6">
          <Link to="/marketplace" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">Browse marketplace</Link>
        </div>
      </div>
    </Shell>
  );
}

function ListingSkeleton() {
  return (
    <Shell>
      <div className="container mx-auto px-4 pt-6">
        <div className="h-4 w-32 bg-muted rounded animate-pulse" />
      </div>
      <div className="container mx-auto px-4 mt-4">
        <div className="aspect-[16/9] rounded-2xl bg-muted animate-pulse" />
      </div>
      <div className="container mx-auto px-4 py-8 grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="space-y-3">
            <div className="h-8 w-3/4 bg-muted rounded animate-pulse" />
            <div className="h-5 w-1/2 bg-muted rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border bg-card p-3 space-y-2">
                <div className="h-4 w-4 bg-muted rounded animate-pulse" />
                <div className="h-3 w-12 bg-muted rounded animate-pulse" />
                <div className="h-5 w-16 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <div className="h-4 w-full bg-muted rounded animate-pulse" />
            <div className="h-4 w-5/6 bg-muted rounded animate-pulse" />
            <div className="h-4 w-4/5 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <aside className="space-y-4">
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-muted animate-pulse" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                <div className="h-3 w-32 bg-muted rounded animate-pulse" />
              </div>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <div className="h-5 w-32 bg-muted rounded animate-pulse" />
            <div className="h-9 w-full bg-muted rounded animate-pulse" />
            <div className="h-9 w-full bg-muted rounded animate-pulse" />
            <div className="h-20 w-full bg-muted rounded animate-pulse" />
            <div className="h-10 w-full bg-muted rounded animate-pulse" />
          </div>
        </aside>
      </div>
    </Shell>
  );
}

export const Route = createFileRoute("/marketplace/$slug")({
  loader: async ({ params }) => {
    try { return await fetchListing({ data: { slug: params.slug } }); }
    catch { return { listing: null, similar: [] }; }
  },
  head: ({ params, loaderData }) => {
    const l = (loaderData as { listing?: { title?: string; description?: string; cover_image?: string; price?: number; city?: string; bedrooms?: number; purpose?: string } } | undefined)?.listing;
    const url = `https://proptest.313test.co.uk/marketplace/${params.slug}`;
    const priceStr = l?.price ? `£${Number(l.price).toLocaleString()}` : "";
    const headline = l?.title ? `${l.title}${l.city ? `, ${l.city}` : ""}` : "Listing";
    const title = l?.title ? `${headline}${priceStr ? ` — ${priceStr}` : ""} | Estately` : "Listing — Estately";
    const desc = l?.description?.slice(0, 155) ?? `${l?.bedrooms ?? ""} bed property ${l?.purpose === "sale" ? "for sale" : "to let"}${l?.city ? ` in ${l.city}` : ""} on Estately.`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:type", content: "article" },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        ...(l?.cover_image ? [{ property: "og:image", content: l.cover_image }, { name: "twitter:image", content: l.cover_image }] : []),
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: l ? [{
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          name: l.title,
          description: l.description,
          image: l.cover_image,
          offers: l.price ? { "@type": "Offer", price: l.price, priceCurrency: "GBP", availability: "https://schema.org/InStock", url } : undefined,
        }),
      }] : [],
    };
  },
  errorComponent: ListingError,
  notFoundComponent: ListingNotFound,
  component: ListingDetail,
});

function fmt(n: number | null | undefined, currency = "GBP") {
  if (!n) return "POA";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(n));
}

function ListingDetail() {
  const { slug } = useParams({ from: "/marketplace/$slug" });
  const fn = useServerFn(fetchListing);
  const { data, isLoading } = useQuery({ queryKey: ["listing", slug], queryFn: () => fn({ data: { slug } }) });

  if (isLoading) return <ListingSkeleton />;
  const l = data?.listing;
  if (!l) return <ListingNotFound />;

  const photos: string[] = Array.isArray(l.photos) ? (l.photos as unknown[]).filter((p): p is string => typeof p === "string") : [];
  const allPhotos = [l.cover_image, ...photos].filter((p): p is string => !!p);
  const features: string[] = Array.isArray(l.features) ? (l.features as unknown[]).filter((f): f is string => typeof f === "string") : [];
  const price = fmt(l.price, l.currency || "GBP");
  const isSale = l.purpose === "sale";
  const isRent = l.purpose === "rent";

  return (
    <Shell>
      <div className="container mx-auto px-4 pt-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/marketplace" className="inline-flex items-center hover:text-foreground"><ChevronLeft className="h-4 w-4" />Back to results</Link>
        </div>
      </div>

      <Gallery photos={allPhotos} title={l.title} isHmo={!!l.is_hmo} purpose={l.purpose} />

      <article className="container mx-auto px-4 py-8 grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <header>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge className="bg-primary text-primary-foreground">{isSale ? "For sale" : isRent ? "To let" : l.listing_type}</Badge>
              {l.is_hmo && <Badge className="bg-accent text-accent-foreground">HMO</Badge>}
              {l.status !== "published" && <Badge variant="outline" className="capitalize">{l.status?.replace(/_/g, " ")}</Badge>}
              {l.epc_rating && <Badge variant="outline">EPC {l.epc_rating}</Badge>}
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{l.title}</h1>
                <div className="text-muted-foreground mt-1 inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />{[l.address, l.city, l.postcode].filter(Boolean).join(", ") || "Address on request"}
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl md:text-4xl font-bold text-primary">{price}{!isSale && <span className="text-base font-normal text-muted-foreground"> pcm</span>}</div>
                {l.price_qualifier && <div className="text-xs text-muted-foreground capitalize">{l.price_qualifier.replace(/_/g, " ")}</div>}
              </div>
            </div>
          </header>

          <KeyFacts l={l} />

          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="features">Features</TabsTrigger>
              {(l.floorplan_url || l.tour_url) && <TabsTrigger value="tour">Floorplan & tour</TabsTrigger>}
              {isSale && <TabsTrigger value="mortgage">Mortgage</TabsTrigger>}
              <TabsTrigger value="area">Area</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="pt-4">
              {l.description ? (
                <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">{l.description}</p>
              ) : (
                <p className="text-muted-foreground">No description provided yet. Contact the agent for full details.</p>
              )}
            </TabsContent>
            <TabsContent value="features" className="pt-4">
              {features.length ? (
                <div className="flex flex-wrap gap-2">
                  {features.map((f, i) => <Badge key={i} variant="secondary" className="text-sm py-1.5 px-3 capitalize">{f}</Badge>)}
                </div>
              ) : <p className="text-muted-foreground">No features listed.</p>}
            </TabsContent>
            {(l.floorplan_url || l.tour_url) && (
              <TabsContent value="tour" className="pt-4 space-y-4">
                {l.tour_url && (
                  <div className="rounded-2xl overflow-hidden border bg-muted aspect-video">
                    <iframe
                      src={l.tour_url}
                      title="Virtual 360° tour"
                      className="w-full h-full"
                      allow="fullscreen; accelerometer; gyroscope; magnetometer; vr"
                      allowFullScreen
                      loading="lazy"
                    />
                  </div>
                )}
                {l.floorplan_url && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <button className="block w-full rounded-2xl overflow-hidden border bg-card hover:shadow-card transition">
                        <img src={l.floorplan_url} alt={`${l.title} floorplan`} className="w-full h-auto" loading="lazy" />
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-5xl"><img src={l.floorplan_url} alt="" className="w-full h-auto rounded-md" /></DialogContent>
                  </Dialog>
                )}
                {!l.tour_url && !l.floorplan_url && (
                  <p className="text-muted-foreground">No tour or floorplan provided yet.</p>
                )}
              </TabsContent>
            )}
            {isSale && <TabsContent value="mortgage" className="pt-4"><MortgageEstimator price={Number(l.price ?? 0)} /></TabsContent>}
            <TabsContent value="area" className="pt-4">
              <AreaMap lat={l.latitude} lng={l.longitude} postcode={l.postcode} />
            </TabsContent>
          </Tabs>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {l.agencies && (
            <Card className="border-0 shadow-card">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-muted overflow-hidden shrink-0">
                    {l.agencies.logo_url ? <img src={l.agencies.logo_url} alt="" className="h-full w-full object-cover" /> : <Building2 className="h-6 w-6 m-3 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-muted-foreground">Listed by</div>
                    <Link to="/agencies/$slug" params={{ slug: l.agencies.slug }} className="font-semibold hover:underline">{l.agencies.name}</Link>
                  </div>
                </div>
                <PhoneReveal
                  phone={l.agencies.phone}
                  email={l.agencies.email}
                  whatsapp={l.agencies.phone}
                  agencyName={l.agencies.name}
                  context={`Enquiry about "${l.title}" on Estately.`}
                />
                {l.agencies.website && (
                  <a href={l.agencies.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
                    <Globe className="h-4 w-4" />Visit agency website
                  </a>
                )}
              </CardContent>
            </Card>
          )}
          <LeadForm listingId={l.id} agencyId={l.agency_id} ownerId={l.owner_id} />
          <ShareCard slug={slug} title={l.title} />
        </aside>
      </article>

      {data?.similar && data.similar.length > 0 && (
        <section className="container mx-auto px-4 pb-16">
          <div className="flex items-center gap-2 mb-4"><Sparkles className="h-4 w-4 text-accent" /><h2 className="text-xl font-semibold">Similar properties nearby</h2></div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.similar.slice(0, 3).map((s) => <ListingCard key={s.id} l={s as never} />)}
          </div>
        </section>
      )}
    </Shell>
  );
}

function Gallery({ photos, title, isHmo, purpose }: { photos: string[]; title: string; isHmo: boolean; purpose: string | null }) {
  const main = photos[0];
  const thumbs = photos.slice(1, 5);
  if (!main) {
    return <div className="container mx-auto px-4 mt-4"><div className="aspect-[16/9] rounded-2xl brand-gradient opacity-30" /></div>;
  }
  return (
    <div className="container mx-auto px-4 mt-4">
      <div className="grid grid-cols-4 grid-rows-2 gap-2 h-[280px] md:h-[460px] rounded-2xl overflow-hidden">
        <Dialog>
          <DialogTrigger asChild>
            <button className="col-span-4 md:col-span-2 row-span-2 relative bg-muted group">
              <img src={main} alt={title} className="h-full w-full object-cover group-hover:scale-[1.02] transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/40 via-transparent to-transparent" />
              <div className="absolute top-3 left-3 flex gap-2">
                <Badge className="bg-card/95 text-foreground border-0">{purpose === "sale" ? "For sale" : "To let"}</Badge>
                {isHmo && <Badge className="bg-accent text-accent-foreground">HMO</Badge>}
              </div>
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl"><img src={main} alt={title} className="w-full h-auto rounded-md" /></DialogContent>
        </Dialog>
        {[0,1,2,3].map((i) => (
          <Dialog key={i}>
            <DialogTrigger asChild>
              <button className="hidden md:block bg-muted relative group">
                {thumbs[i] ? <img src={thumbs[i]} alt="" className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-500" /> : <div className="h-full w-full brand-gradient opacity-20" />}
                {i === 3 && photos.length > 5 && <div className="absolute inset-0 bg-foreground/60 flex items-center justify-center text-background font-semibold">+{photos.length - 5} photos</div>}
              </button>
            </DialogTrigger>
            {thumbs[i] && <DialogContent className="max-w-5xl"><img src={thumbs[i]} alt="" className="w-full h-auto rounded-md" /></DialogContent>}
          </Dialog>
        ))}
      </div>
    </div>
  );
}

type ListingRecord = {
  bedrooms: number | null; bathrooms: number | null; receptions: number | null;
  floor_area_sqft: number | null; epc_rating: string | null; tenure: string | null;
  furnished: string | null; council_tax_band: string | null; available_from: string | null;
  bills_included: boolean; properties?: { property_type?: string | null } | null;
};

function KeyFacts({ l }: { l: ListingRecord }) {
  const facts = [
    { icon: Bed, label: "Bedrooms", value: l.bedrooms?.toString() },
    { icon: Bath, label: "Bathrooms", value: l.bathrooms?.toString() },
    { icon: Home, label: "Receptions", value: l.receptions?.toString() },
    { icon: Ruler, label: "Floor area", value: l.floor_area_sqft ? `${Number(l.floor_area_sqft).toLocaleString()} sq ft` : null },
    { icon: Zap, label: "EPC rating", value: l.epc_rating },
    { icon: Shield, label: "Tenure", value: l.tenure?.replace(/_/g, " ") },
    { icon: Home, label: "Furnishing", value: l.furnished?.replace(/_/g, " ") },
    { icon: Building2, label: "Council tax", value: l.council_tax_band ? `Band ${l.council_tax_band}` : null },
    { icon: Calendar, label: "Available", value: l.available_from ? new Date(l.available_from).toLocaleDateString("en-GB") : null },
    { icon: Zap, label: "Bills", value: l.bills_included ? "Included" : null },
    { icon: Building2, label: "Type", value: l.properties?.property_type?.replace(/_/g, " ") },
  ].filter((f) => f.value);

  if (!facts.length) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {facts.map((f, i) => (
        <div key={i} className="rounded-xl border bg-card p-3">
          <f.icon className="h-4 w-4 text-accent mb-1.5" />
          <div className="text-xs text-muted-foreground">{f.label}</div>
          <div className="font-semibold capitalize">{f.value}</div>
        </div>
      ))}
    </div>
  );
}

function MortgageEstimator({ price }: { price: number }) {
  const [deposit, setDeposit] = useState(Math.round(price * 0.1));
  const [term, setTerm] = useState(25);
  const [rate, setRate] = useState(4.5);
  const monthly = useMemo(() => {
    const principal = Math.max(0, price - deposit);
    const r = (rate / 100) / 12;
    const n = term * 12;
    if (r === 0) return principal / n;
    return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  }, [price, deposit, term, rate]);

  return (
    <Card className="border-0 shadow-card bg-gradient-to-br from-primary/5 to-accent/5">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2 font-semibold"><Calculator className="h-4 w-4 text-accent" /> Mortgage estimator</div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div><Label>Deposit (£)</Label><Input type="number" value={deposit} onChange={(e) => setDeposit(Number(e.target.value))} className="mt-1.5" /></div>
          <div><Label>Term (years)</Label><Input type="number" value={term} onChange={(e) => setTerm(Number(e.target.value))} className="mt-1.5" /></div>
          <div><Label>Rate (%)</Label><Input type="number" step="0.1" value={rate} onChange={(e) => setRate(Number(e.target.value))} className="mt-1.5" /></div>
        </div>
        <div className="rounded-xl bg-card border p-4 flex items-baseline justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Estimated monthly payment</div>
            <div className="text-2xl font-bold">{fmt(monthly)}</div>
          </div>
          <div className="text-xs text-muted-foreground">Loan: {fmt(price - deposit)} · {Math.round((deposit / price) * 100)}% deposit</div>
        </div>
        <p className="text-xs text-muted-foreground">For guidance only. Your home may be repossessed if you do not keep up repayments on your mortgage.</p>
      </CardContent>
    </Card>
  );
}

function AreaMap({ lat, lng, postcode }: { lat: number | null; lng: number | null; postcode: string | null }) {
  const query = lat && lng ? `${lat},${lng}` : postcode ?? "";
  if (!query) return <p className="text-muted-foreground">Map will appear once the agent shares a location.</p>;
  const src = `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`;
  return (
    <div className="rounded-xl overflow-hidden border aspect-[16/10]">
      <iframe src={src} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="w-full h-full" title="Property location" />
    </div>
  );
}

function ShareCard({ slug, title }: { slug: string; title: string }) {
  const share = async () => {
    const url = `${window.location.origin}/marketplace/${slug}`;
    if (navigator.share) {
      try { await navigator.share({ title, url }); } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    }
  };
  return (
    <Card className="border-0 shadow-card">
      <CardContent className="p-4 flex items-center justify-between">
        <span className="text-sm">Like this? Share it.</span>
        <Button variant="outline" size="sm" onClick={share}><Share2 className="h-4 w-4 mr-1" /> Share</Button>
      </CardContent>
    </Card>
  );
}

function LeadForm({ listingId, agencyId, ownerId }: { listingId: string; agencyId: string | null; ownerId: string }) {
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [phone, setPhone] = useState(""); const [message, setMessage] = useState("I'd like to arrange a viewing.");
  const [busy, setBusy] = useState(false);
  const fn = useServerFn(submitLead);
  const submit = async () => {
    setBusy(true);
    try {
      await fn({ data: { listing_id: listingId, agency_id: agencyId ?? undefined, owner_id: ownerId, name, email: email || undefined, phone: phone || undefined, message } });
      toast.success("Enquiry sent — they'll be in touch soon.");
      setName(""); setEmail(""); setPhone(""); setMessage("");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to send"); }
    finally { setBusy(false); }
  };
  return (
    <Card className="border-0 shadow-card">
      <CardContent className="p-5 space-y-3">
        <div className="font-semibold">Request a viewing</div>
        <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="space-y-2"><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        </div>
        <div className="space-y-2"><Label>Message</Label><Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} /></div>
        <Button className="w-full" onClick={submit} disabled={busy || !name}>{busy ? "Sending…" : "Send enquiry"}</Button>
        <p className="text-xs text-muted-foreground text-center">Enquiries are sent directly to the agent. No third-party spam.</p>
      </CardContent>
    </Card>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (<div className="min-h-screen flex flex-col"><PublicHeader /><main className="flex-1">{children}</main><PublicFooter /></div>);
}
