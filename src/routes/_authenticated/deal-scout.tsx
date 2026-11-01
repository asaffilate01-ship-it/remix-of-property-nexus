import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Calculator, CheckCircle2, ExternalLink, Filter, Plus, RefreshCw, Search, ShieldAlert, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { scanPublishedSaleListings, saveScoutCandidate, screenDealWithSoldComparables } from "@/lib/deal-scout.functions";
import { listDealOpportunities } from "@/lib/deal-intelligence.functions";
import { screenPropertyDeal, type DealScreenInput, type DealScreenResult, type SoldComparable } from "@/lib/deal-screening";

export const Route = createFileRoute("/_authenticated/deal-scout")({
  head: () => ({ meta: [{ title: "Deal Scout — Gabley", name: "description", content: "Evidence-led UK sales discovery, conservative property valuation and investor sourcing workflow." }] }),
  component: DealScoutPage,
});

type Candidate = {
  id: string; slug: string; title: string; postcode: string | null; city: string | null;
  price: number | null; bedrooms: number | null; floorAreaSqft: number | null;
  propertyType: string | null; source: string; askingOnly: true;
};
type Opportunity = {
  id: string; title: string; postcode: string | null; asking_price: number | null;
  purchase_price: number; proposed_fee: number; status: string;
  seller_authority_confirmed: boolean; fee_disclosed: boolean; updated_at: string;
  analysis: {
    propertyType?: string; bedrooms?: number | null; subjectFloorAreaSqft?: number | null;
    screening?: DealScreenResult; comparables?: SoldComparable[]; slug?: string;
  } | null;
};
type CompDraft = { price: string; soldAt: string; postcode: string; propertyType: string; bedrooms: string; evidenceRef: string; source: "hm_land_registry" | "agent_verified"; floorAreaSqft: string };
const money = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
const newComp = (propertyType = "house", postcode = ""): CompDraft => ({
  price: "", soldAt: "", postcode, propertyType, bedrooms: "", evidenceRef: "",
  source: "hm_land_registry", floorAreaSqft: "",
});
const defaults = {
  proposedPurchasePrice: "", worksCost: "0", contingencyPercent: "10", stampDutyEstimate: "0",
  legalCost: "0", financeAndHoldingCost: "0", sellingCost: "0", otherCosts: "0",
  proposedSourcingFee: "0", investorProfitTarget: "0", propertyType: "house", bedrooms: "", subjectFloorAreaSqft: "",
};
function number(v: string) {
  if (!v.trim()) throw new Error("Enter a price or cost in each amount field");
  const result = Number(v);
  if (!Number.isFinite(result) || result < 0) throw new Error("Costs and valuations must be valid positive numbers or zero");
  return result;
}

function DealScoutPage() {
  const scan = useServerFn(scanPublishedSaleListings);
  const shortlist = useServerFn(saveScoutCandidate);
  const analyse = useServerFn(screenDealWithSoldComparables);
  const fetchDeals = useServerFn(listDealOpportunities);
  const [city, setCity] = useState("");
  const [postcode, setPostcode] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [listings, setListings] = useState<Candidate[] | null>(null);
  const [deals, setDeals] = useState<Opportunity[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [screening, setScreening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dealsError, setDealsError] = useState<string | null>(null);
  const [params, setParams] = useState(defaults);
  const [comps, setComps] = useState<CompDraft[]>([newComp(), newComp(), newComp()]);
  const [result, setResult] = useState<DealScreenResult | null>(null);
  const [tab, setTab] = useState("scout");

  const reloadDeals = async () => {
    try {
      const r = await fetchDeals();
      setDeals((r.rows ?? []) as Opportunity[]);
      setDealsError(null);
    } catch (cause) {
      setDealsError(cause instanceof Error ? cause.message : "Deal opportunities are unavailable.");
    }
  };
  useEffect(() => { void reloadDeals(); }, []);
  const selected = deals.find((row) => row.id === selectedId) ?? null;
  useEffect(() => {
    if (!selected) return;
    const saved = selected.analysis;
    setParams({
      ...defaults, propertyType: saved?.propertyType ?? "house",
      bedrooms: saved?.bedrooms == null ? "" : String(saved.bedrooms),
      subjectFloorAreaSqft: saved?.subjectFloorAreaSqft == null ? "" : String(saved.subjectFloorAreaSqft),
      proposedPurchasePrice: String(selected.purchase_price || selected.asking_price || 0),
      proposedSourcingFee: String(selected.proposed_fee ?? 0),
    });
    setComps(saved?.comparables?.length ? saved.comparables.map(c => ({
      price: String(c.price), soldAt: c.soldAt, postcode: c.postcode,
      propertyType: c.propertyType, bedrooms: c.bedrooms == null ? "" : String(c.bedrooms),
      floorAreaSqft: c.floorAreaSqft == null ? "" : String(c.floorAreaSqft),
      evidenceRef: c.evidenceRef, source: c.source,
    })) : [newComp(saved?.propertyType, selected.postcode ?? ""), newComp(saved?.propertyType, selected.postcode ?? ""), newComp(saved?.propertyType, selected.postcode ?? "")]);
    setResult(saved?.screening ?? null);
  }, [selectedId]);

  const searchListings = async () => {
    setSearching(true); setError(null); setListings(null);
    try {
      if (maxPrice && number(maxPrice) < 1000) throw new Error("Enter a maximum asking price of £1,000 or more.");
      const r = await scan({ data: {
        city: city.trim() || undefined, postcodePrefix: postcode.trim() || undefined,
        maxPrice: maxPrice ? number(maxPrice) : undefined, propertyType: "any",
      } });
      setListings(r.listings as Candidate[]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Marketplace scan unavailable.");
    } finally { setSearching(false); }
  };

  const saveListing = async (row: Candidate) => {
    setSavingId(row.id);
    try {
      const outcome = await shortlist({ data: { listingId: row.id } });
      toast.success(outcome.created ? "Listing saved as research opportunity" : "Already in your deal workspace");
      await reloadDeals();
      setSelectedId(outcome.id);
      setTab("evaluate");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Could not save this listing.");
    } finally { setSavingId(null); }
  };

  const updateComp = (index: number, key: keyof CompDraft, value: string) =>
    setComps(current => current.map((comp, i) => i === index ? { ...comp, [key]: value } : comp));
  const buildInput = (): DealScreenInput => {
    if (!selected?.postcode || !selected.asking_price) throw new Error("The deal needs an asking price and postcode before valuation.");
    const comparableSales: SoldComparable[] = comps.filter(c => c.price || c.evidenceRef || c.soldAt).map(c => ({
      price: number(c.price), soldAt: c.soldAt, postcode: c.postcode,
      propertyType: c.propertyType,
      bedrooms: c.bedrooms.trim() ? number(c.bedrooms) : null,
      floorAreaSqft: c.floorAreaSqft.trim() ? number(c.floorAreaSqft) : null,
      source: c.source, evidenceRef: c.evidenceRef,
    }));
    return {
      title: selected.title, postcode: selected.postcode,
      propertyType: params.propertyType, bedrooms: params.bedrooms ? number(params.bedrooms) : null,
      subjectFloorAreaSqft: params.subjectFloorAreaSqft ? number(params.subjectFloorAreaSqft) : null,
      askingPrice: Number(selected.asking_price),
      proposedPurchasePrice: number(params.proposedPurchasePrice),
      worksCost: number(params.worksCost), contingencyPercent: number(params.contingencyPercent),
      stampDutyEstimate: number(params.stampDutyEstimate),
      legalCost: number(params.legalCost), financeAndHoldingCost: number(params.financeAndHoldingCost),
      sellingCost: number(params.sellingCost), otherCosts: number(params.otherCosts),
      proposedSourcingFee: number(params.proposedSourcingFee),
      investorProfitTarget: number(params.investorProfitTarget),
      assessedAt: new Date().toISOString().slice(0, 10), comps: comparableSales,
    };
  };

  const saveScreen = async () => {
    setScreening(true);
    try {
      const input = buildInput();
      const preview = screenPropertyDeal(input);
      if (!selected) throw new Error("Choose a deal first");
      const saved = await analyse({ data: {
        opportunityId: selected.id, propertyType: input.propertyType, bedrooms: input.bedrooms,
        subjectFloorAreaSqft: input.subjectFloorAreaSqft,
        proposedPurchasePrice: input.proposedPurchasePrice, worksCost: input.worksCost,
        contingencyPercent: input.contingencyPercent, stampDutyEstimate: input.stampDutyEstimate,
        legalCost: input.legalCost, financeAndHoldingCost: input.financeAndHoldingCost,
        sellingCost: input.sellingCost, otherCosts: input.otherCosts,
        proposedSourcingFee: input.proposedSourcingFee, investorProfitTarget: input.investorProfitTarget,
        comps: input.comps,
      } });
      setResult(saved.screening ?? preview);
      await reloadDeals();
      toast.success("Evidence and screening assumptions saved for review");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Could not evaluate this opportunity.");
    } finally { setScreening(false); }
  };
  const formFields: { key: keyof typeof defaults; label: string }[] = [
    { key: "proposedPurchasePrice", label: "Proposed purchase / offer price (£)" },
    { key: "worksCost", label: "Refurbishment works (£)" },
    { key: "contingencyPercent", label: "Works contingency (%)" },
    { key: "stampDutyEstimate", label: "Stamp duty estimate (£)" },
    { key: "legalCost", label: "Legal / searches (£)" },
    { key: "financeAndHoldingCost", label: "Finance and holding (£)" },
    { key: "sellingCost", label: "Resale selling costs (£)" },
    { key: "otherCosts", label: "Other acquisition costs (£)" },
    { key: "proposedSourcingFee", label: "Proposed sourcing commission (£)" },
    { key: "investorProfitTarget", label: "Minimum investor profit (£)" },
  ];
  const dealCount = deals.length;
  const potentialCount = useMemo(() => deals.filter(d => d.analysis?.screening?.verdict === "potential_candidate").length, [deals]);

  return (
    <div className="space-y-6">
      <PageHeader title="Deal Scout" description="Screen low asking prices against comparable sold evidence, then shortlist and match buyers without purchasing a property."
        actions={<div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild><Link to="/deal-investors">Buyer mandates <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" /></Link></Button>
          <Button variant="outline" asChild><Link to="/deal-intelligence">Deal pipeline <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" /></Link></Button>
        </div>}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="shadow-card"><CardContent className="p-5"><div className="text-xs text-muted-foreground">Research opportunities</div><p className="mt-2 text-3xl font-semibold tabular">{dealCount}</p></CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-5"><div className="text-xs text-muted-foreground">Potential candidates</div><p className="mt-2 text-3xl font-semibold tabular">{potentialCount}</p></CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-5"><div className="text-xs text-muted-foreground">Automated offers / introductions</div><p className="mt-2 text-3xl font-semibold tabular">0</p><p className="text-xs text-muted-foreground">Human-authorised only</p></CardContent></Card>
      </div>

      <div className="flex gap-3 rounded-xl border border-warning/30 bg-muted/50 p-4 text-sm">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
        <p>**Research only.** A low asking price is not proof that a property is undervalued. Sold comparables are entered by staff and must be independently checked. Gabley does not buy the property or automatically contact buyers/sellers. Estate-agency supervision, redress, seller authority and fee disclosures must be cleared before introduction.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-5">
        <TabsList className="flex h-auto flex-wrap">
          <TabsTrigger value="scout" className="gap-2"><Search className="h-4 w-4" aria-hidden="true" /> Discover sales</TabsTrigger>
          <TabsTrigger value="evaluate" className="gap-2"><Calculator className="h-4 w-4" aria-hidden="true" /> Valuation & economics</TabsTrigger>
        </TabsList>
        <TabsContent value="scout" className="space-y-5">
          <Card className="shadow-card"><CardContent className="p-5 space-y-4">
            <h2 className="font-semibold">Scan published Gabley sale listings</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1"><Label htmlFor="scout-city">Town or city</Label><Input id="scout-city" placeholder="e.g. Luton" value={city} onChange={e=>setCity(e.target.value)} maxLength={80} /></div>
              <div className="space-y-1"><Label htmlFor="scout-postcode">Postcode area</Label><Input id="scout-postcode" placeholder="e.g. LU1" value={postcode} onChange={e=>setPostcode(e.target.value)} maxLength={10} /></div>
              <div className="space-y-1"><Label htmlFor="scout-price">Maximum asking price (£)</Label><Input id="scout-price" type="number" min="1000" placeholder="250000" value={maxPrice} onChange={e=>setMaxPrice(e.target.value)} /></div>
            </div>
            <Button disabled={searching} onClick={() => void searchListings()}><Filter className="mr-2 h-4 w-4" aria-hidden="true" />{searching ? "Searching…" : "Find lower asking prices"}</Button>
            <p className="text-xs text-muted-foreground">Only published, marketplace-enabled sale listings in GBP. At most 150 scanned, ordered by asking price. No unauthorised portal scraping or assumed resale value.</p>
          </CardContent></Card>
          {error && <div role="alert" className="rounded-lg border border-destructive/30 p-4 text-sm text-destructive">{error}</div>}
          {listings && <div className="space-y-3">
            <div className="flex items-center justify-between"><h2 className="font-semibold">{listings.length} sale listings from this scan</h2><Badge variant="secondary">Asking prices only</Badge></div>
            {!listings.length && <p className="rounded-xl border p-6 text-sm text-muted-foreground">No published sales match these filters. Try another area or budget.</p>}
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {listings.map(row => <Card key={row.id} className="shadow-card"><CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between gap-2"><Badge variant="outline">Public listing</Badge><TrendingDown className="h-4 w-4 text-primary" aria-hidden="true" /></div>
                <h3 className="line-clamp-2 font-semibold">{row.title}</h3>
                <p className="text-2xl font-bold tabular">{row.price == null ? "Price unavailable" : money.format(row.price)}</p>
                <p className="text-xs text-muted-foreground">{[row.city,row.postcode].filter(Boolean).join(" · ")} · {row.propertyType ?? "Type not recorded"}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" disabled={savingId===row.id} onClick={() => void saveListing(row)}>
                    <Plus className="mr-1 h-4 w-4" aria-hidden="true" />{savingId===row.id ? "Saving…" : "Screen this deal"}
                  </Button>
                  <Button size="sm" variant="outline" asChild><Link to="/marketplace/$slug" params={{ slug: row.slug }}>Listing <ExternalLink className="ml-1 h-3.5 w-3.5" aria-hidden="true" /></Link></Button>
                </div>
              </CardContent></Card>)}
            </div>
          </div>}
        </TabsContent>
        <TabsContent value="evaluate" className="space-y-5">
          {dealsError && <div role="alert" className="rounded-lg border p-4 text-sm text-destructive">{dealsError}<Button variant="outline" size="sm" className="ml-3" onClick={() => void reloadDeals()}>Retry</Button></div>}
          <Card className="shadow-card"><CardContent className="p-5 space-y-3">
            <h2 className="font-semibold">Select a deal to value</h2>
            {deals.length === 0 && <div className="text-sm text-muted-foreground">No saved deals yet. Use Discover sales to add one or visit the Deal Intelligence pipeline.</div>}
            <div className="grid gap-2 md:grid-cols-2">
              {deals.slice(0, 60).map(row => (
                <button key={row.id} type="button" onClick={() => setSelectedId(row.id)}
                  aria-pressed={selectedId === row.id}
                  className={`min-h-11 rounded-lg border px-4 py-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring ${selectedId === row.id ? "border-primary bg-primary/5" : "hover:bg-muted/60"}`}>
                  <span className="block truncate font-medium">{row.title}</span>
                  <span className="text-xs text-muted-foreground">{row.postcode ?? "Missing postcode"} · {row.asking_price ? money.format(row.asking_price) : "Missing asking price"} · {row.status}</span>
                </button>
              ))}
            </div>
          </CardContent></Card>
          {selected && <div className="space-y-5">
            <div className="space-y-1">
              <h2 className="font-display text-xl font-semibold">Underwrite: {selected.title}</h2>
              <p className="text-sm text-muted-foreground">Based on actual completed sold-price evidence, not advertised asking prices. Nothing is sent to a buyer or seller.</p>
            </div>
            <Card className="shadow-card"><CardContent className="space-y-4 p-5">
              <h3 className="font-semibold">Property and cost assumptions</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1"><Label htmlFor="scout-type">Property type</Label>
                  <Input id="scout-type" value={params.propertyType} onChange={e=>setParams({...params,propertyType:e.target.value})} maxLength={40} />
                </div>
                <div className="space-y-1"><Label htmlFor="scout-beds">Bedrooms</Label>
                  <Input id="scout-beds" type="number" min="0" value={params.bedrooms} onChange={e=>setParams({...params,bedrooms:e.target.value})} />
                </div>
                <div className="space-y-1"><Label htmlFor="scout-area">Floor area (sq ft, if known)</Label>
                  <Input id="scout-area" type="number" min="100" value={params.subjectFloorAreaSqft} onChange={e=>setParams({...params,subjectFloorAreaSqft:e.target.value})} />
                </div>
                {formFields.map(field => <div key={field.key} className="space-y-1">
                  <Label htmlFor={`deal-${field.key}`}>{field.label}</Label>
                  <Input id={`deal-${field.key}`} type="number" min="0" step="0.01" value={params[field.key]} onChange={e=>setParams({...params,[field.key]:e.target.value})} />
                </div>)}
              </div>
              <p className="text-xs text-muted-foreground">Costs defaulting to zero are assumptions, not confirmation. Enter realistic stamp duty, finance, conveyancing, refurbishment contingency and sourcing fees before screening.</p>
            </CardContent></Card>

            <Card className="shadow-card"><CardContent className="space-y-4 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><h3 className="font-semibold">Comparable completed sales</h3><p className="text-xs text-muted-foreground">Add at least three recent sales of similar properties in the same postcode area. Keep the Land Registry or verified-agent reference.</p></div>
                <Button variant="outline" size="sm" disabled={comps.length >= 60} onClick={()=>setComps([...comps,newComp(params.propertyType,selected.postcode??"")])}><Plus className="mr-1 h-4 w-4" aria-hidden="true" /> Comparable</Button>
              </div>
              {comps.map((c,i)=><div key={i} className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center justify-between"><span className="font-medium text-sm">Sold comparable {i+1}</span>
                  <Button type="button" variant="ghost" size="sm" disabled={comps.length<=3} onClick={()=>setComps(comps.filter((_,j)=>j!==i))}>Remove</Button></div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {([
                    ["price","Completed sold price (£)","number"],["soldAt","Sold date","date"],
                    ["postcode","Postcode","text"],["propertyType","Property type","text"],
                    ["bedrooms","Bedrooms","number"],["floorAreaSqft","Floor area (sq ft)","number"],
                    ["evidenceRef","Evidence reference","text"],
                  ] as const).map(([key,label,type])=><div key={key} className="space-y-1">
                    <Label htmlFor={`comp-${i}-${key}`}>{label}</Label><Input id={`comp-${i}-${key}`} type={type} value={c[key]} onChange={e=>updateComp(i,key,e.target.value)} />
                  </div>)}
                  <div className="space-y-1"><Label htmlFor={`comp-${i}-source`}>Claimed data source</Label>
                    <select id={`comp-${i}-source`} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={c.source} onChange={e=>updateComp(i,"source",e.target.value)}>
                      <option value="hm_land_registry">HM Land Registry</option><option value="agent_verified">Agent verified</option>
                    </select></div>
                </div>
              </div>)}
              <Button disabled={screening || !selected.asking_price || !selected.postcode} onClick={() => void saveScreen()}>
                <Calculator className="mr-2 h-4 w-4" aria-hidden="true" />{screening ? "Checking evidence…" : "Calculate and save screening"}
              </Button>
            </CardContent></Card>

            {result && <Card className="shadow-card"><CardContent className="space-y-4 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">Evidence-based screening result</h3>
                <Badge variant={result.verdict==="potential_candidate"?"default":"outline"}>{result.verdict.replaceAll("_"," ")}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {([
                  ["Comparable sales accepted",String(result.comparablesUsed)],
                  ["Conservative exit value",result.conservativeExitValue==null?"Not available":money.format(result.conservativeExitValue)],
                  ["Discount to conservative value",result.discountPercent==null?"Not available":`${result.discountPercent}%`],
                  ["Costs including sourcing fee",money.format(result.totalAcquisitionAndExitCosts)],
                  ["Indicative investor profit",result.projectedProfitAfterFee==null?"Not available":money.format(result.projectedProfitAfterFee)],
                  ["Maximum offer at profit target",result.maxOfferToMeetTarget==null?"Not available":money.format(Math.max(0,result.maxOfferToMeetTarget))],
                ] as const).map(([label,value])=><div key={label} className="rounded-lg border bg-muted/30 p-3">
                  <div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 text-lg font-semibold tabular">{value}</div>
                </div>)}
              </div>
              <p className="text-xs text-muted-foreground">Evidence confidence: <strong>{result.confidence}</strong>. Methods: {result.valuationMethod.replaceAll("_"," ")}. These are not independent RICS valuations or guarantees of profit.</p>
              <div className="space-y-1">{result.notes.map(n=><p key={n} className="flex gap-2 text-xs text-muted-foreground"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {n}</p>)}</div>
              {result.verdict==="potential_candidate" && <Button variant="outline" asChild><Link to="/deal-intelligence">Review fee and buyer introduction gates <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" /></Link></Button>}
            </CardContent></Card>}
          </div>}
        </TabsContent>
      </Tabs>
    </div>
  );
}
