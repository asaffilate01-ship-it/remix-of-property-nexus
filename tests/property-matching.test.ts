import assert from "node:assert/strict";
import test from "node:test";
import {matchPublishedProperties,type MatchListing} from "../src/lib/property-matching.ts";

const records:MatchListing[]=[
 {id:"best",slug:"best-home",title:"Home",purpose:"sale",status:"published",price:290000,currency:"GBP",bedrooms:3,bathrooms:2,city:"Luton",postcode:"LU1 1AA",propertyType:"house",features:["Garden","Parking"],verified:true},
 {id:"over",slug:"over-budget",title:"Over budget",purpose:"sale",status:"published",price:490000,currency:"GBP",bedrooms:4,bathrooms:3,city:"Luton",postcode:"LU1 1BB",propertyType:"house"},
 {id:"under-offer",slug:"not-available",title:"Under offer",purpose:"sale",status:"under_offer",price:200000,currency:"GBP",bedrooms:3,city:"Luton",propertyType:"house"},
 {id:"rent",slug:"rental",title:"Rental",purpose:"rent",status:"published",price:1200,currency:"GBP",bedrooms:2,bathrooms:1,city:"Luton",propertyType:"flat",features:["Lift"]},
 {id:"different-currency",slug:"eur",title:"Euro asking",purpose:"sale",status:"published",price:250000,currency:"EUR",bedrooms:3,city:"Luton",propertyType:"house"},
];

test("sale property matching uses hard filters then explainable scores",()=>{
 const m=matchPublishedProperties({intent:"sale",city:"Luton",maxPriceGBP:350000,minBedrooms:3,
  propertyType:"house",preferredFeatures:["Garden","Parking"]},records);
 assert.deepEqual(m.map(x=>x.listing.id),["best"]);
 assert.ok(m[0].score>=75);
 assert.ok(m[0].reasons.some(x=>x.includes("Within your purchase budget")));
 assert.ok(m[0].reasons.some(x=>x.includes("Preferred features")));
});

test("rent prices are monthly and never compared with purchase asking prices",()=>{
 const m=matchPublishedProperties({intent:"rent",maxPriceGBP:1400,minBedrooms:2},records);
 assert.deepEqual(m.map(x=>x.listing.id),["rent"]);
 assert.ok(m[0].reasons.some(x=>x.includes("monthly rent")));
});
test("commercial listings can have a sales purpose",()=>{
 const p:MatchListing={id:"c",slug:"shop",title:"Shop",purpose:"sale",status:"published",price:190000,currency:"GBP",propertyType:"commercial"};
 assert.equal(matchPublishedProperties({intent:"commercial"},[p]).length,1);
});
test("unknown listing states, currencies and POA never get imaginary scores",()=>{
 const a=matchPublishedProperties({intent:"sale"},[{id:"x",slug:"x",title:"POA",status:"published",purpose:"sale",price:null,currency:"GBP"}]);
 assert.equal(a.length,0);
 assert.equal(matchPublishedProperties({intent:"sale"},records).length,2); // both published GBP sale listings, without a budget filter
});
test("invalid, contradictory and overlarge input fails closed",()=>{
 assert.throws(()=>matchPublishedProperties({intent:"sale",maxPriceGBP:-20},records));
 assert.throws(()=>matchPublishedProperties({intent:"rent",minBedrooms:2.4},records));
 assert.throws(()=>matchPublishedProperties({intent:"sale",preferredFeatures:Array(20).fill("Parking")},records));
 assert.throws(()=>matchPublishedProperties({intent:"sale"},records,200));
});
