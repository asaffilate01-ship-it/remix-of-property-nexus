/**
 * Deterministic, explainable matching over listings returned by Gabley's
 * existing PUBLICATION-FILTERED marketplace query. Never rank by an
 * applicant's sensitive or inferred personal characteristics.
 *
 * No model calls, eligibility decisions, offers, lead exports or notifications.
 */
export type PropertyIntent="sale"|"rent"|"hmo"|"commercial";
export type PropertyType="house"|"flat"|"bungalow"|"studio"|"room"|"commercial"|"land";
export type MatchRequirements={
 intent:PropertyIntent;
 city?:string;
 postcodePrefix?:string;
 maxPriceGBP?:number;
 minBedrooms?:number;
 minBathrooms?:number;
 propertyType?:PropertyType;
 preferredFeatures?:string[];
};
export type MatchListing={
 id:string;
 slug:string;
 title:string;
 purpose?:string|null;
 listing_type?:string|null;
 is_hmo?:boolean|null;
 propertyType?:string|null;
 city?:string|null;
 postcode?:string|null;
 price?:number|null;
 currency?:string|null;
 bedrooms?:number|null;
 bathrooms?:number|null;
 features?:unknown;
 status?:string|null;
 verified?:boolean|null;
};
export type MatchedListing<T extends MatchListing>={
 listing:T;score:number;reasons:string[];
};
const normal=(value:string|undefined|null)=>String(value??"").normalize("NFKC").toLocaleLowerCase("en-GB").trim();
const validAmount=(n:unknown)=>typeof n==="number"&&Number.isFinite(n)&&n>0&&n<=100_000_000;
const validCount=(n:unknown)=>typeof n==="number"&&Number.isInteger(n)&&n>=0&&n<=100;
const allowedIntents=new Set<PropertyIntent>(["sale","rent","hmo","commercial"]);
const typeSet=new Set<PropertyType>(["house","flat","bungalow","studio","room","commercial","land"]);
const featuresOf=(list:unknown):string[]=>Array.isArray(list)?
 list.filter((x):x is string=>typeof x==="string").map(x=>normal(x)).filter(Boolean):[];

export function matchPublishedProperties<T extends MatchListing>(
 requirements:MatchRequirements, listings:readonly T[], limit=30
):MatchedListing<T>[]{
 if(!allowedIntents.has(requirements.intent)||!Number.isInteger(limit)||limit<1||limit>120)throw new Error("Invalid matching request");
 if(requirements.maxPriceGBP!==undefined&&!validAmount(requirements.maxPriceGBP))throw new Error("Invalid maximum price");
 if(requirements.minBedrooms!==undefined&&!validCount(requirements.minBedrooms))throw new Error("Invalid bedroom requirement");
 if(requirements.minBathrooms!==undefined&&!validCount(requirements.minBathrooms))throw new Error("Invalid bathroom requirement");
 if(requirements.propertyType&&!typeSet.has(requirements.propertyType))throw new Error("Invalid property type");
 if((requirements.preferredFeatures?.length??0)>12)throw new Error("Too many feature preferences");
 const city=normal(requirements.city),postcode=normal(requirements.postcodePrefix).replace(/\s/g,"");
 const preferred=[...new Set((requirements.preferredFeatures??[]).map(normal).filter(Boolean))];
 const output:MatchedListing<T>[]=[];
 const seen=new Set<string>();
 for(const l of listings){
  // Marketplace server already enforces published + marketplace_publish. Defence in depth.
  if(!l||typeof l.slug!=="string"||!l.slug||typeof l.id!=="string"||!l.id||
     l.status!=="published"||seen.has(l.id))continue;
  seen.add(l.id);
  const intent=l.is_hmo?"hmo":normal(l.purpose||l.listing_type);
  if(requirements.intent!==intent){
   if(!(requirements.intent==="commercial"&&normal(l.propertyType)==="commercial"))continue;
  }
  if(l.currency!=="GBP"||!validAmount(l.price))continue; // do not silently compare currencies or POA
  if(requirements.maxPriceGBP!==undefined&&l.price>requirements.maxPriceGBP)continue;
  if(requirements.minBedrooms!==undefined&&(!validCount(l.bedrooms)||l.bedrooms<requirements.minBedrooms))continue;
  if(requirements.minBathrooms!==undefined&&(!validCount(l.bathrooms)||l.bathrooms<requirements.minBathrooms))continue;
  if(requirements.propertyType&&normal(l.propertyType)!==requirements.propertyType)continue;
  if(city&&!normal(l.city).includes(city))continue;
  if(postcode&&!normal(l.postcode).replace(/\s/g,"").startsWith(postcode))continue;

  let score=55;
  const reasons=[requirements.intent==="sale"?"For sale":requirements.intent==="rent"?"To rent":requirements.intent==="hmo"?"HMO/room":"Commercial"];
  if(city){score+=7;reasons.push("In your chosen town/city");}
  if(postcode){score+=8;reasons.push("Matches your postcode area");}
  if(requirements.maxPriceGBP!==undefined){
   const difference=(requirements.maxPriceGBP-l.price)/requirements.maxPriceGBP;
   score+=Math.round(6+Math.min(.3,Math.max(0,difference))/.3*8);
   reasons.push("Within your "+(requirements.intent==="rent"||requirements.intent==="hmo"?"monthly rent":"purchase")+" budget");
  }
  if(requirements.propertyType){score+=7;reasons.push("Your selected property type");}
  if(requirements.minBedrooms!==undefined){score+=4;reasons.push("Meets bedroom requirement");}
  if(requirements.minBathrooms!==undefined){score+=3;reasons.push("Meets bathroom requirement");}
  if(preferred.length){
   const features=featuresOf(l.features);
   const matched=preferred.filter(f=>features.some(available=>available===f||available.includes(f)));
   score+=Math.round(12*matched.length/preferred.length);
   if(matched.length)reasons.push("Preferred features: "+matched.join(", "));
   if(matched.length<preferred.length)reasons.push("Not confirmed: "+preferred.filter(f=>!matched.includes(f)).join(", "));
  }
  if(l.verified===true){score+=2;reasons.push("Listing verification indicator present");}
  output.push({listing:l,score:Math.min(100,score),reasons});
 }
 return output.sort((a,b)=>b.score-a.score||
  (a.listing.price??0)-(b.listing.price??0)||
  a.listing.id.localeCompare(b.listing.id)).slice(0,limit);
}
