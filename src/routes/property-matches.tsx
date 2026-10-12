import {createFileRoute,Link} from "@tanstack/react-router";
import {useServerFn} from "@tanstack/react-start";
import {useState} from "react";
import {Check,Home,Search,ShieldCheck,Sparkles} from "lucide-react";
import {PublicHeader} from "@/components/PublicHeader";
import {PublicFooter} from "@/components/PublicFooter";
import {ListingCard} from "@/components/ListingCard";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {Card,CardContent} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {fetchListings} from "@/lib/public.functions";
import {matchPublishedProperties,type MatchedListing,type MatchListing,type PropertyIntent,type PropertyType} from "@/lib/property-matching";

const intents:[PropertyIntent,string][]=[["sale","Buy"],["rent","Rent"],["hmo","HMO / room"],["commercial","Commercial"]];
const types:[PropertyType,string][]=[["house","House"],["flat","Flat"],["bungalow","Bungalow"],["studio","Studio"],["room","Room"],["commercial","Commercial"],["land","Land"]];
const preferences=["Garden","Parking","Balcony","Lift","Garage","EV charging","Wheelchair access","Pets allowed","New build"];
type DisplayListing=MatchListing &{
 id:string;slug:string;title:string;listing_type:"sale"|"rent"|"room";price:number;currency:string;
 bedrooms:number|null;cover_image:string|null;city:string|null;
};

export const Route=createFileRoute("/property-matches")({
 head:()=>({meta:[
 {title:"Property Matching — Gabley"},
 {name:"description",content:"Compare published UK sale, rental, HMO and commercial listings against your own budget, location, space and feature preferences. Transparent matching with reasons."},
 {name:"robots",content:"index,follow"}
 ]}),
 component:PropertyMatchesPage,
});

function PropertyMatchesPage(){
 const fn=useServerFn(fetchListings);
 const [intent,setIntent]=useState<PropertyIntent>("sale");
 const [city,setCity]=useState("");
 const [postcode,setPostcode]=useState("");
 const [maxPrice,setMaxPrice]=useState("");
 const [minBeds,setMinBeds]=useState("");
 const [propertyType,setPropertyType]=useState<PropertyType|"any">("any");
 const [features,setFeatures]=useState<string[]>([]);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState("");
 const [matched,setMatched]=useState<MatchedListing<DisplayListing>[]|null>(null);
 const [sampleSize,setSampleSize]=useState(0);

 async function runMatch(){
  const price=maxPrice.trim()?Number(maxPrice):undefined;
  const bedrooms=minBeds.trim()?Number(minBeds):undefined;
  if((price!==undefined&&(!Number.isFinite(price)||price<=0||price>100_000_000))||
     (bedrooms!==undefined&&(!Number.isInteger(bedrooms)||bedrooms<0||bedrooms>20))){
   setError("Enter a valid positive budget and a whole-number bedroom requirement.");return;
  }
  setLoading(true);setError("");setMatched(null);
  try{
   // An existing server query provides only published, marketplace-enabled
   // listings. The matching engine never scans private applicant/CRM records.
   const data=await fn({data:{
    category:intent,city:city.trim()||undefined,postcode:postcode.trim()||undefined,
    max_price:price,beds:bedrooms,property_type:propertyType==="any"?undefined:propertyType,
    sort:"newest"
   }});
   const listings=(data.listings??[]).map(l=>({
    ...l,propertyType:Array.isArray(l.properties)?l.properties[0]?.property_type:
    (l.properties&&typeof l.properties==="object"?"property_type" in l.properties?
     String(l.properties.property_type):null:null),
   })) as DisplayListing[];
   setSampleSize(listings.length);
   setMatched(matchPublishedProperties({
    intent,city:city.trim()||undefined,postcodePrefix:postcode.trim()||undefined,
    maxPriceGBP:price,minBedrooms:bedrooms,
    propertyType:propertyType==="any"?undefined:propertyType,preferredFeatures:features,
   },listings));
  }catch(e){setError(e instanceof Error?e.message:"Property matching could not be completed. Please retry.");}
  finally{setLoading(false);}
 }
 const toggle=(f:string)=>setFeatures(prev=>prev.includes(f)?prev.filter(x=>x!==f):[...prev,f]);
 return <div className="min-h-screen flex flex-col"><PublicHeader/>
  <main className="flex-1">
   <div className="brand-gradient text-white">
    <div className="container mx-auto px-4 py-12">
     <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs"><Sparkles className="h-4 w-4"/> Matching by your criteria</div>
     <h1 className="mt-3 max-w-2xl font-display text-3xl font-bold md:text-5xl">Find properties that fit your requirements.</h1>
     <p className="mt-3 max-w-2xl text-white/80">Compare published UK listings by intent, location, budget, property type and preferred features. Every match includes its reason. No invented property or valuation data.</p>
    </div>
   </div>
   <div className="container mx-auto px-4 py-8">
    <Card><CardContent className="space-y-5 p-5">
     <div><label className="text-sm font-semibold">I want to</label>
      <div className="mt-2 flex flex-wrap gap-2">{intents.map(([key,label])=><Button key={key} type="button" variant={intent===key?"default":"outline"} size="sm" onClick={()=>{setIntent(key);setMatched(null);}}>{label}</Button>)}</div>
     </div>
     <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
      <label className="space-y-1 text-sm">Town / city
       <Input value={city} onChange={e=>setCity(e.target.value)} maxLength={80} placeholder="e.g. Luton"/></label>
      <label className="space-y-1 text-sm">Postcode / outcode (optional)
       <Input value={postcode} onChange={e=>setPostcode(e.target.value)} maxLength={12} placeholder="e.g. LU1"/></label>
      <label className="space-y-1 text-sm">{intent==="sale"||intent==="commercial"?"Maximum price (£)":"Maximum monthly rent (£ pcm)"}
       <Input value={maxPrice} onChange={e=>setMaxPrice(e.target.value)} inputMode="numeric" type="number" min="1" max="100000000" placeholder={intent==="sale"?"350000":"1500"}/></label>
      <label className="space-y-1 text-sm">Minimum bedrooms
       <Input value={minBeds} onChange={e=>setMinBeds(e.target.value)} inputMode="numeric" type="number" min="0" max="20" placeholder="Any"/></label>
     </div>
     <label className="block text-sm">Property type
      <select className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm md:max-w-sm" value={propertyType} onChange={e=>setPropertyType(e.target.value as PropertyType|"any")}>
       <option value="any">Any type</option>{types.map(([id,label])=><option key={id} value={id}>{label}</option>)}
      </select>
     </label>
     <div><p className="text-sm font-semibold">Preferred features (improve score; not mandatory)</p>
      <div className="mt-2 flex flex-wrap gap-2">{preferences.map(f=><button key={f} type="button" aria-pressed={features.includes(f)}
       onClick={()=>toggle(f)} className={"rounded-full border px-3 py-1.5 text-xs "+(features.includes(f)?"bg-primary text-primary-foreground":"hover:bg-muted")}>
        {features.includes(f)&&<Check className="mr-1 inline h-3 w-3"/>}{f}
       </button>)}</div>
     </div>
     <div className="flex flex-wrap items-center gap-3">
      <Button type="button" onClick={runMatch} disabled={loading}><Search className="mr-2 h-4 w-4"/>{loading?"Matching…":"Match published properties"}</Button>
      <Link to="/marketplace" className="text-sm text-primary underline">Browse the full marketplace</Link>
     </div>
     <p className="flex items-start gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 shrink-0"/>
      Search preferences are used to rank this response; no applicant profile, protected characteristic or credit/tenancy eligibility decision is created.</p>
    </CardContent></Card>
    {error&&<p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
    {matched&&<section className="mt-8" aria-live="polite">
     <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-2xl font-bold">{matched.length} matching properties</h2>
       <p className="mt-1 text-sm text-muted-foreground">Compared {sampleSize} listings from Gabley's current published marketplace results (capped by source search). Listings and availability may change.</p></div>
      <Badge variant="outline"><Home className="mr-1 h-4 w-4"/> Transparent scoring</Badge>
     </div>
     {matched.length===0?<Card><CardContent className="p-6 text-sm">No published properties matched all mandatory filters in the retrieved results. Try a nearby town, wider budget or fewer requirements.</CardContent></Card>:
     <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{matched.map(({listing,score,reasons})=>
      <div key={listing.id} className="space-y-2">
       <ListingCard l={{...listing,is_hmo:listing.is_hmo??undefined}}/>
       <div className="rounded-lg border p-3"><div className="flex items-center justify-between gap-2"><strong className="text-sm">Match score {score}/100</strong><Badge variant="outline">Criteria fit</Badge></div>
        <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-muted-foreground">{reasons.slice(0,6).map(reason=><li key={reason}>{reason}</li>)}</ul>
       </div>
      </div>)}</div>}
    </section>}
   </div>
  </main><PublicFooter/>
 </div>;
}
