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
import { listDealOpportunities, refreshOpportunityMatches } from "@/lib/deal-intelligence.functions";
import { screenPropertyDeal, type DealScreenInput, type DealScreenResult, type SoldComparable } from "@/lib/deal-screening";
import { parsePricePaidCsv, suggestPricePaidComparables } from "@/lib/price-paid-csv";
import { getStoredLandRegistryComparables } from "@/lib/hmlr-comparables.functions";
import { dealScoutSourceStatus, searchPropertyDataInvestments, savePropertyDataResearchCase, refreshPropertyDataResearchCase } from "@/lib/propertydata-sourcing.functions";
import { PROPERTYDATA_LISTS, type PropertyDataSourcingList, type LicensedSourcingCandidate } from "@/lib/propertydata-sourcing";

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
    externalProvider?: string; externalDataExpiresAt?: string; sourcePortal?: string;
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
  const findMatches = useServerFn(refreshOpportunityMatches);
  const storedSold = useServerFn(getStoredLandRegistryComparables);
  const sourceStatus = useServerFn(dealScoutSourceStatus);
  const licensedSearch = useServerFn(searchPropertyDataInvestments);
  const licensedSave = useServerFn(savePropertyDataResearchCase);
  const licensedRefresh = useServerFn(refreshPropertyDataResearchCase);
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
  const [investorMatches, setInvestorMatches] = useState<Array<{ investorProfileId: string; investorRef: string; score: number; reasons: string[]; fundingStatus: string }>>([]);
  const [matching, setMatching] = useState(false);
  const [importingSold, setImportingSold] = useState(false);
  const [soldImportNote, setSoldImportNote] = useState<string | null>(null);
  const [soldLookupBusy, setSoldLookupBusy] = useState(false);
  const [licensedAvailable, setLicensedAvailable] = useState(false);
  const [licensedPostcode, setLicensedPostcode] = useState("");
  const [licensedRadius, setLicensedRadius] = useState("10");
  const [licensedList, setLicensedList] = useState<PropertyDataSourcingList>("reduced-properties");
  const [licensedListings, setLicensedListings] = useState<LicensedSourcingCandidate[] | null>(null);
  const [licensedBusy, setLicensedBusy] = useState(false);
  const [licensedError, setLicensedError] = useState<string | null>(null);
  const [licensedSavingId, setLicensedSavingId] = useState<string | null>(null);
  const [refreshingSource, setRefreshingSource] = useState(false);
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
  useEffect(() => {
    void reloadDeals();
    void sourceStatus().then(state => setLicensedAvailable(state.propertydata === "configured"))
      .catch(() => setLicensedAvailable(false));
  }, []);
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
    setInvestorMatches([]);
    setSoldImportNote(null);
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

  const searchLicensedPortals = async () => {
    setLicensedBusy(true); setLicensedError(null); setLicensedListings(null);
    try {
      if (!licensedAvailable) throw new Error("A PropertyData commercial subscription must be connected first.");
      const response = await licensedSearch({ data: {
        postcode: licensedPostcode.trim().toUpperCase(),
        list: licensedList,
        radiusMiles: Number(licensedRadius),
        ...(maxPrice.trim() ? { maxPrice: Number(maxPrice) } : {}),
      } });
      setLicensedListings(response.items as LicensedSourcingCandidate[]);
    } catch (cause) {
      setLicensedError(cause instanceof Error ? cause.message : "The licensed source is unavailable.");
    } finally { setLicensedBusy(false); }
  };
  const shortlistLicensed = async (item: LicensedSourcingCandidate) => {
    setLicensedSavingId(item.providerListingId);
    try {
      const saved = await licensedSave({ data: { providerListingId: item.providerListingId } });
      toast.success(saved.created ? "Licensed listing added as a research case" : "Research case already exists");
      await reloadDeals();
      setSelectedId(saved.opportunityId);
      setTab("evaluate");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Unable to save this licensed research case");
    } finally { setLicensedSavingId(null); }
  };
  const updateLicensedCase = async () => {
    if (!selectedId) return;
    setRefreshingSource(true);
    try {
      await licensedRefresh({ data: { opportunityId: selectedId } });
      const id=selectedId;
      setSelectedId(null);
      await reloadDeals();
      setSelectedId(id);
      toast.success("Revalidated the current asking price; previous valuation must be reviewed again");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Unable to refresh external listing");
    } finally { setRefreshingSource(false); }
  };
  const loadStoredSales = async () => {
    if (!selected?.postcode) return;
    if (params.propertyType !== "house" && params.propertyType !== "flat") {
      setSoldImportNote("Official Price Paid data cannot determine this exact property subtype; use appropriately verified manual comparables.");
      return;
    }
    setSoldLookupBusy(true); setSoldImportNote(null);
    try {
      const result = await storedSold({ data: {
        postcode: selected.postcode, propertyType: params.propertyType, limit: 15,
      } });
      if (result.comparables.length < 3) {
        setSoldImportNote("Fewer than three qualifying completed sales were found. The historical Land Registry feed may not yet be imported for this area.");
        return;
      }
      setComps(result.comparables.map(c => ({
        price: String(c.price), soldAt: c.soldAt, postcode: c.postcode,
        propertyType: c.propertyType, bedrooms: "", floorAreaSqft: "",
        evidenceRef: c.evidenceRef, source: c.source,
      })));
      setResult(null); setInvestorMatches([]);
      setSoldImportNote(`Loaded ${result.comparables.length} registered-sale suggestions from ${result.recordsSampled} sampled transactions. Review actual subtype, condition and transaction dates before valuing; registered data can lag.`);
    } catch (cause) {
      setSoldImportNote(cause instanceof Error ? cause.message : "Land Registry history could not be loaded.");
    } finally { setSoldLookupBusy(false); }
  };

  const updateComp = (index: number, key: keyof CompDraft, value: string) =>
    setComps(current => current.map((comp, i) => i === index ? { ...comp, [key]: value } : comp));
  const importSoldCsv = async (file?: File) => {
    if (!selected || !file) return;
    setImportingSold(true);
    setSoldImportNote(null);
    try {
      if (file.size > 15_000_000) throw new Error("Use a local Land Registry CSV extract under 15 MB. Filter to the town or recent year first.");
      const data = parsePricePaidCsv(await file.text());
      if (!selected.postcode) throw new Error("This deal must have a postcode to select sold comparables.");
      const matches = suggestPricePaidComparables(data.rows, {
        postcode: selected.postcode, propertyType: params.propertyType,
        assessedAt: new Date().toISOString().slice(0,10),
      });
      if (matches.length < 3) {
        setSoldImportNote(`Parsed ${data.read} Price Paid rows; only ${matches.length} comparable sale(s) matched this area and property type. Broaden your official extract or check the subject type. No valuation was created.`);
        return;
      }
      setComps(matches.map(comp => ({
        price: String(comp.price), soldAt: comp.soldAt, postcode: comp.postcode,
        propertyType: comp.propertyType, bedrooms: "", floorAreaSqft: "",
        evidenceRef: comp.evidenceRef, source: comp.source,
      })));
      setResult(null); setInvestorMatches([]);
      setSoldImportNote(`Imported ${matches.length} suggestions from ${data.read} rows (${data.skipped} excluded, ${data.deletions} deleted). Review source evidence, property subtype and similarity before calculating. This does not verify the CSV's provenance.`);
      toast.success(`${matches.length} comparable sales suggested from your local dataset`);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Unable to parse the local price-paid file.");
    } finally {
      setImportingSold(false);
    }
  };
  const buildInput = (): DealScreenInput => {
    if (!selected?.postcode || !selected.asking_price) throw new Error("The deal needs an asking price and postcode before valuation.");
    if (selected.analysis?.externalProvider === "propertydata" &&
        (!selected.analysis.externalDataExpiresAt ||
          Date.parse(selected.analysis.externalDataExpiresAt) <= Date.now())) {
      throw new Error("Licensed asking-price evidence is more than 60 days old. Refresh its source before screening.");
    }
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
      setInvestorMatches([]);
      await reloadDeals();
      if (saved.screening?.verdict === "potential_candidate") {
        try {
          const matches = await findMatches({ data: { opportunityId: selected.id } });
          setInvestorMatches(matches.matches ?? []);
        } catch {
          toast.info("Screening saved; you can retry buyer matching separately.");
        }
      }
      toast.success("Evidence and screening assumptions saved for review");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Could not evaluate this opportunity.");
    } finally { setScreening(false); }
  };
  const matchBuyers = async () => {
    if (!selected || !result || result.verdict === "insufficient_evidence") return;
    setMatching(true);
    try {
      const matches = await findMatches({ data: { opportunityId: selected.id } });
      setInvestorMatches(matches.matches ?? []);
      toast.success(matches.matches?.length
        ? `${matches.matches.length} suitable buyer mandate(s) identified for staff review`
        : "No active buyer mandates meet the current deal criteria");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Unable to match buyers");
    } finally { setMatching(false); }
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
        <p><strong>Research only.</strong> A low asking price is not proof that a property is undervalued. Sold comparables are entered by staff and must be independently checked. Gabley does not buy the property or automatically contact buyers/sellers. Estate-agency supervision, redress, seller authority and fee disclosures must be cleared before introduction.</p>
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

          <Card className="shadow-card"><CardContent className="space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-semibold">Find deals advertised on major property portals</h2>
                <p className="text-xs text-muted-foreground">Approved PropertyData sourcing API — investment-specific listings drawn from major portals, without unauthorised scraping. Individual calls use API credits.</p>
              </div>
              <Badge variant={licensedAvailable ? "secondary" : "outline"}>{licensedAvailable ? "Licensed API configured" : "Needs commercial API access"}</Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1"><Label htmlFor="licensed-postcode">Full postcode</Label>
                <Input id="licensed-postcode" value={licensedPostcode} onChange={e=>setLicensedPostcode(e.target.value)} placeholder="LU1 2AA" maxLength={12} />
              </div>
              <div className="space-y-1"><Label htmlFor="licensed-source-list">Sourcing strategy</Label>
                <select id="licensed-source-list" className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={licensedList} onChange={e=>setLicensedList(e.target.value as PropertyDataSourcingList)}>
                  {PROPERTYDATA_LISTS.map(name=><option value={name} key={name}>{name.replaceAll("-"," ")}</option>)}
                </select>
              </div>
              <div className="space-y-1"><Label htmlFor="licensed-radius">Search radius (miles)</Label>
                <Input id="licensed-radius" type="number" min="1" max="80" value={licensedRadius} onChange={e=>setLicensedRadius(e.target.value)} />
              </div>
            </div>
            <Button type="button" disabled={!licensedAvailable || licensedBusy || !licensedPostcode.trim()} onClick={() => void searchLicensedPortals()}>
              <Search className="mr-2 h-4 w-4" aria-hidden="true" />
              {licensedBusy ? "Querying licensed feed…" : "Search licensed property opportunities"}
            </Button>
            <p className="text-xs text-muted-foreground">Results are on-demand, limited to ten per call and not cached as a copy of the portals. Third-party photos are excluded. PropertyData's 60-day evidence refresh rule applies.</p>
            {!licensedAvailable && <p className="text-xs text-muted-foreground">Enable this with a commercial PropertyData API subscription, a server-only API key and a confirmed licence setting. <a className="underline underline-offset-2" href="https://propertydata.co.uk/api/documentation/licensing" target="_blank" rel="noreferrer">Provider usage rights</a>.</p>}
            {licensedError && <p role="alert" className="text-sm text-destructive">{licensedError}</p>}
          </CardContent></Card>
          {licensedListings && <section aria-label="Licensed sourcing results" className="space-y-3">
            <h3 className="font-semibold">{licensedListings.length} licensed sourcing result(s)</h3>
            {licensedListings.length===0 && <p className="text-sm text-muted-foreground">No available listings returned for this strategy, postcode and budget.</p>}
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {licensedListings.map(item=><Card key={item.providerListingId} className="shadow-card">
                <CardContent className="space-y-3 p-5">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{item.detailedPropertyType}</Badge>
                    {item.priceReductionPercent!=null && <Badge>Reduced {item.priceReductionPercent}%</Badge>}
                  </div>
                  <h4 className="font-semibold">{item.title}</h4>
                  <p className="text-2xl font-semibold tabular">{money.format(item.askingPrice)}</p>
                  <p className="text-xs text-muted-foreground">{item.postcode} · {item.bedrooms ?? "—"} beds · {item.daysOnMarket ?? "—"} days listed</p>
                  <p className="text-xs text-muted-foreground">Source: PropertyData{item.sourcePortal ? ` / ${item.sourcePortal}` : ""} · Listing expiry: {new Date(item.expiresAt).toLocaleDateString("en-GB")}. Asking price only; not a valuation.</p>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" disabled={licensedSavingId===item.providerListingId} onClick={() => void shortlistLicensed(item)}>
                      <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
                      {licensedSavingId===item.providerListingId ? "Rechecking…" : "Research this opportunity"}
                    </Button>
                    {item.sourceUrl && <Button asChild size="sm" variant="outline"><a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">Provider listing</a></Button>}
                  </div>
                </CardContent>
              </Card>)}
            </div>
          </section>}

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
              {selected.analysis?.externalProvider === "propertydata" && <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline">PropertyData case</Badge>
                <span className="text-xs text-muted-foreground">Current-source evidence expires {selected.analysis.externalDataExpiresAt ? new Date(selected.analysis.externalDataExpiresAt).toLocaleDateString("en-GB") : "unknown"}</span>
                <Button type="button" variant="outline" size="sm" disabled={refreshingSource} onClick={() => void updateLicensedCase()}>{refreshingSource ? "Checking…" : "Refresh source asking price"}</Button>
              </div>}
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
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/30 p-4">
                <div>
                  <h4 className="text-sm font-semibold">Load from registered sale history</h4>
                  <p className="text-xs text-muted-foreground">Search the HMLR database once its official Price Paid CSVs have been imported. No provider keys or local CSV required.</p>
                </div>
                <Button type="button" variant="outline" disabled={soldLookupBusy} onClick={() => void loadStoredSales()}>
                  <Search className="mr-2 h-4 w-4" aria-hidden="true" /> {soldLookupBusy ? "Finding sales…" : "Suggest Land Registry comparables"}
                </Button>
              </div>
              <div className="space-y-2 rounded-xl border bg-muted/40 p-4">
                <h4 className="font-medium text-sm">Suggest comparables from HM Land Registry Price Paid Data</h4>
                <p className="text-xs text-muted-foreground">Upload a local official CSV extract (up to 15 MB). It is parsed in your browser, not uploaded to the server. Gabley selects recent standard completed sales of the broad property type within the same postcode district. The data does not contain bedrooms or floor area; confirm these independently. Monthly change-only files are incomplete without earlier data.</p>
                <Label htmlFor="price-paid-csv">Official Price Paid CSV extract</Label>
                <Input id="price-paid-csv" type="file" accept=".csv,text/csv" disabled={importingSold}
                  onChange={event => { const file=event.target.files?.[0]; void importSoldCsv(file); event.target.value=""; }}
                  aria-describedby="price-paid-source-note" />
                <p id="price-paid-source-note" className="text-xs text-muted-foreground">Contains HM Land Registry data © Crown copyright and database right 2021. Licensed under the Open Government Licence v3.0. <a className="underline underline-offset-2" href="https://www.gov.uk/government/statistical-data-sets/price-paid-data-downloads" target="_blank" rel="noreferrer">Download the official data</a>.</p>
                {importingSold && <p role="status" className="text-xs">Reading your local dataset…</p>}
                {soldImportNote && <p role="status" className="text-xs text-foreground">{soldImportNote}</p>}
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
              <div className="space-y-3 border-t pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="font-medium">Find a buyer — mandate matching</h4>
                    <p className="max-w-xl text-xs text-muted-foreground">Search only the agency's existing investor mandates. No contact details, introductions or messages are sent automatically.</p>
                  </div>
                  <Button variant="outline" size="sm" disabled={matching || result.verdict==="insufficient_evidence"} onClick={() => void matchBuyers()}>
                    {matching ? "Checking…" : "Find matching buyers"}
                  </Button>
                </div>
                {investorMatches.length > 0 && <div className="grid gap-2 md:grid-cols-2">
                  {investorMatches.slice(0, 20).map(buyer => <div key={buyer.investorProfileId} className="rounded-lg border bg-muted/20 p-3">
                    <div className="flex items-center justify-between gap-2"><strong className="truncate text-sm">{buyer.investorRef}</strong><Badge variant="outline">{buyer.score}/100 fit</Badge></div>
                    <p className="mt-1 text-xs text-muted-foreground">Funding: {buyer.fundingStatus.replaceAll("_"," ")}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{buyer.reasons.map(reason=>reason.replaceAll("_"," ")).join(" · ")}</p>
                  </div>)}
                </div>}
                <Button variant="outline" asChild><Link to="/deal-intelligence">Review seller authority, fee terms and introductions <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" /></Link></Button>
              </div>
            </CardContent></Card>}
          </div>}
        </TabsContent>
      </Tabs>
    </div>
  );
}
