import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { fetchListing, submitLead } from "@/lib/public.functions";
import { Bed, Bath, MapPin } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/marketplace/$slug")({
  head: () => ({ meta: [{ title: "Listing — Estately" }] }),
  component: ListingDetail,
});

function ListingDetail() {
  const { slug } = useParams({ from: "/marketplace/$slug" });
  const fn = useServerFn(fetchListing);
  const { data, isLoading } = useQuery({ queryKey: ["listing", slug], queryFn: () => fn({ data: { slug } }) });

  if (isLoading) return <Shell><div className="container mx-auto p-8">Loading…</div></Shell>;
  const l = data?.listing;
  if (!l) return <Shell><div className="container mx-auto p-8">Listing not found.</div></Shell>;
  const price = l.price ? new Intl.NumberFormat("en-GB", { style: "currency", currency: l.currency || "GBP", maximumFractionDigits: 0 }).format(Number(l.price)) : "POA";
  const photos: string[] = Array.isArray(l.photos) ? (l.photos as unknown[]).filter((p): p is string => typeof p === "string") : [];

  return (
    <Shell>
      <article className="container mx-auto px-4 py-8 grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="aspect-[16/9] rounded-2xl overflow-hidden bg-muted mb-4">
            {l.cover_image || photos[0] ? (
              <img src={l.cover_image ?? photos[0]} alt={l.title} className="h-full w-full object-cover" />
            ) : <div className="brand-gradient h-full w-full opacity-30" />}
          </div>
          {photos.length > 1 && (
            <div className="grid grid-cols-4 gap-2 mb-6">
              {photos.slice(0, 8).map((p, i) => <img key={i} src={p} alt="" className="aspect-square object-cover rounded-md" />)}
            </div>
          )}
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary">{l.listing_type}</Badge>
            {l.is_hmo && <Badge className="bg-accent text-accent-foreground">HMO</Badge>}
            <Badge variant="outline">{l.status}</Badge>
          </div>
          <h1 className="text-3xl font-bold mb-2">{l.title}</h1>
          <div className="text-3xl font-bold text-primary mb-4">{price}{l.listing_type !== "sale" && <span className="text-base font-normal text-muted-foreground"> pcm</span>}</div>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-6">
            {l.city && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{[l.address, l.city, l.postcode].filter(Boolean).join(", ")}</span>}
            {l.bedrooms != null && <span className="inline-flex items-center gap-1"><Bed className="h-4 w-4" />{l.bedrooms} bed</span>}
            {l.bathrooms != null && <span className="inline-flex items-center gap-1"><Bath className="h-4 w-4" />{l.bathrooms} bath</span>}
          </div>
          {l.description && <p className="whitespace-pre-wrap leading-relaxed">{l.description}</p>}
        </div>

        <aside className="space-y-4">
          {l.agencies && (
            <Card className="border-0 shadow-card">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-muted overflow-hidden">
                  {l.agencies.logo_url && <img src={l.agencies.logo_url} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted-foreground">Listed by</div>
                  <Link to="/agencies/$slug" params={{ slug: l.agencies.slug }} className="font-medium hover:underline">{l.agencies.name}</Link>
                </div>
              </CardContent>
            </Card>
          )}
          <LeadForm listingId={l.id} agencyId={l.agency_id} ownerId={l.owner_id} />
        </aside>
      </article>
    </Shell>
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
      toast.success("Enquiry sent — they'll get back to you soon.");
      setName(""); setEmail(""); setPhone(""); setMessage("");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to send"); }
    finally { setBusy(false); }
  };
  return (
    <Card className="border-0 shadow-card">
      <CardContent className="p-5 space-y-3">
        <div className="font-semibold">Enquire about this property</div>
        <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="space-y-2"><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        <div className="space-y-2"><Label>Message</Label><Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} /></div>
        <Button className="w-full" onClick={submit} disabled={busy || !name}>{busy ? "Sending…" : "Send enquiry"}</Button>
      </CardContent>
    </Card>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (<div className="min-h-screen flex flex-col"><PublicHeader /><main className="flex-1">{children}</main><PublicFooter /></div>);
}
