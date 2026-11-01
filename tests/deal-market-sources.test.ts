import assert from "node:assert/strict";
import test from "node:test";
import { streamHmlrCsvRows, normalizeHmlrRecord, HMLR_ATTRIBUTION } from "../src/lib/hmlr-ingestion.ts";
import {
  PROPERTYDATA_LISTS, approvedPropertyDataUrl, normalisePropertyDataRecord,
  normalisePropertyDataResults,
} from "../src/lib/propertydata-sourcing.ts";

function row(id: string, price: number, date: string, postcode: string, status?: string) {
  const fields = [id,String(price),date,postcode,"T","N","F","10","", "Test, Lane",
    "", "LUTON","LUTON","BEDFORDSHIRE","A",...(status ? [status] : [])];
  return fields.map(f => '"' + f.replaceAll('"','""') + '"').join(",");
}
async function parseChunks(input: string, cuts: number[]) {
  async function* source() {
    let previous = 0;
    for (const cut of cuts) { yield new TextEncoder().encode(input.slice(previous,cut)); previous = cut; }
    yield new TextEncoder().encode(input.slice(previous));
  }
  const output: string[][] = [];
  for await (const fields of streamHmlrCsvRows(source())) output.push(fields);
  return output;
}
test("HMLR tokenizer survives broken UTF-8 chunk boundaries, CRLF and quoted commas", async () => {
  const one = row("{AB-11}",275000,"2026-04-20 00:00","LU1 2AA");
  const two = row("{AB-22}",280000,"2026-05-21 00:00","LU1 2AB","C");
  const text = "\uFEFF" + one + "\r\n" + two + "\n";
  const rows = await parseChunks(text,[1,2,3,8,13,20,65,106,text.length-2]);
  assert.equal(rows.length,2);
  assert.equal(rows[0][9],"Test, Lane");
  assert.equal(rows[1].length,16);
  const first = normalizeHmlrRecord(rows[0]);
  assert.deepEqual({ id:first?.transaction_id, status:first?.record_status, postcode:first?.postcode },
    {id:"AB-11",status:"A",postcode:"LU12AA"});
  assert.equal(normalizeHmlrRecord(rows[1])?.record_status,"C");
});
test("deletion tombstones can be replayed without creating invented prices",async()=>{
  const fields=(await parseChunks(row("{AB-22}",280000,"2026-05-21","LU1 2AB","D"),[]))[0];
  assert.deepEqual(normalizeHmlrRecord(fields),{ transaction_id:"AB-22",record_status:"D" });
});
test("malformed quoting or absurdly long fields throw",async()=>{
  async function read(text:string){ for await(const _ of streamHmlrCsvRows((async function*(){yield text})())){} }
  await assert.rejects(()=>read('"incomplete'),/Unterminated/);
  await assert.rejects(()=>read('"a"x,2'),/Unexpected character/);
  await assert.rejects(()=>read("a".repeat(1250)),/too large/);
});
test("invalid sold evidence and unexpected categories never become official records",()=>{
  const standard=row("{A-1}",280000,"2026-03-01 00:00","LU1 2AA").split(",");
  assert.equal(normalizeHmlrRecord(standard),null); // must parse actual CSV first
  assert.equal(normalizeHmlrRecord(["X", "10", "2026-01-01","LU1 2AA","T",...Array(10).fill("")]),null);
  assert.match(HMLR_ATTRIBUTION,/Open Government Licence/);
});
const sample = {
  status:"success",
  properties:[
    {id:"R10001",address:"10 Street, LU1",postcode:"LU1 2AA",price:150000,
      type_standardised:"Terraced house",bedrooms:3,sqf:950,days_on_market:88,sstc:0,
      price_history:[{date:"2026-01-01",price:190000},{date:"2026-09-01",price:150000}],
      url:"https://propertydata.co.uk/outbound/rightmove/10001",image_url:"https://media.rightmove.co.uk/unlicensed.jpg"},
    {id:"R10002",address:"11 Street, LU1",postcode:"LU1 2AB",price:175000,
      type_standardised:"Flat",sstc:1},
    {id:"R10001",address:"Duplicate",postcode:"LU1 2AA",price:250000},
    {id:"R10003",address:"12 Street, LU1",postcode:"LU1 2AC",price:190000,
      type_standardised:"Detached house",url:"https://rightmove.co.uk/properties/123"},
  ],
};
test("licensed API records retain provenance, verify URL host, hide photos and discard SSTC",()=>{
  const data = normalisePropertyDataResults(sample,new Date("2026-11-01T10:00:00Z"));
  assert.equal(data.length,2);
  assert.equal(data[0].providerListingId,"R10001");
  assert.equal(data[0].priceReductionPercent,21.05);
  assert.equal(data[0].previousAskingPrice,190000);
  assert.equal(data[0].sourcePortal,"rightmove");
  assert.equal(data[1].sourceUrl,null);
  assert.ok(!("image_url" in data[0]));
  assert.equal(data[0].expiresAt,"2026-12-31T10:00:00.000Z");
});
test("licensing and website-host boundaries fail closed",()=>{
  assert.equal(approvedPropertyDataUrl("https://propertydata.co.uk.evil.com/outbound/rightmove/1"),null);
  assert.equal(approvedPropertyDataUrl("javascript:alert(1)"),null);
  assert.equal(approvedPropertyDataUrl("https://propertydata.co.uk/login"),null);
  assert.equal(normalisePropertyDataRecord({id:"R10100",price:100000,postcode:""},new Date()),null);
  assert.throws(()=>normalisePropertyDataResults({status:"error",properties:[]},new Date()),/valid/);
  assert.ok(PROPERTYDATA_LISTS.includes("reduced-properties"));
});
