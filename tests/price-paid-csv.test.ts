import assert from "node:assert/strict";
import test from "node:test";
import { parsePricePaidCsv, suggestPricePaidComparables } from "../src/lib/price-paid-csv.ts";

function line(id: string, price: number, date: string, postcode: string, type: string, address: string, category="A", status="A") {
  return ['{'+id+'}',price,date,postcode,type,'N','F',address,'','Example Road','', 'LUTON','LUTON','BEDFORDSHIRE',category,status]
    .map(value => '"'+String(value).replaceAll('"','""')+'"').join(",");
}
const rows = [
  line("12345",290000,"2026-05-12 00:00","LU1 2AA","T","10"),
  line("12346",300000,"2026-05-12 00:00","LU1 2AB","T","11"),
  line("12347",310000,"2026-05-12 00:00","LU1 2AC","S","12"),
  line("12348",150000,"2026-04-02 00:00","LU1 2AD","F","FLAT 1"),
  line("12349",160000,"2026-04-02 00:00","LU2 2AA","T","13"),
  line("12350",240000,"2026-04-02 00:00","LU1 2AE","D","14","B"),
  line("12351",240000,"2028-04-02 00:00","LU1 2AF","D","15"),
].join("\r\n");

test("parse official headerless 16-column CSV including quoted addresses and monthly status", () => {
  const input = line("ID-1",250000,"2026-03-01 00:00","LU1 1AA","T",'12, Upper Street');
  const result = parsePricePaidCsv(input);
  assert.equal(result.rows.length,1);
  assert.equal(result.rows[0].transactionId,"ID-1");
  assert.equal(result.rows[0].addressKey,"LU1 1AA|12, UPPER STREET||EXAMPLE ROAD");
});

test("category B, future and other postcodes never become standard sold comparables", () => {
  const result = parsePricePaidCsv(rows);
  assert.equal(result.skipped,1);
  const comps = suggestPricePaidComparables(result.rows,{ postcode:"LU1 2AZ",propertyType:"house",assessedAt:"2026-11-01" });
  assert.deepEqual(comps.map(c=>c.price),[290000,300000,310000]);
  assert.ok(comps.every(c=>c.evidenceRef.startsWith("HMLR-")));
});
test("monthly change and deletion status apply idempotently per transaction", () => {
  const text = [
    line("A1",200000,"2026-04-01","LU1 1AA","T","10"),
    line("A1",205000,"2026-04-01","LU1 1AA","T","10","A","C"),
    line("A1",205000,"2026-04-01","LU1 1AA","T","10","A","D"),
    line("A2",240000,"2026-04-01","LU1 1AA","S","11"),
  ].join("\n");
  const result = parsePricePaidCsv(text);
  assert.equal(result.rows.length,1);
  assert.equal(result.deletions,1);
  assert.equal(result.rows[0].transactionId,"A2");
});
test("same property changing hands cannot count twice as two comparable houses", () => {
  const data=parsePricePaidCsv([
    line("a",270000,"2025-05-01","LU1 2AA","T","10"),
    line("b",290000,"2026-05-01","LU1 2AA","T","10"),
    line("c",280000,"2026-03-01","LU1 2AA","S","11"),
  ].join("\n")).rows;
  const matches=suggestPricePaidComparables(data,{postcode:"LU1 2AA",propertyType:"house",assessedAt:"2026-11-01"});
  assert.deepEqual(matches.map(x=>x.price),[290000,280000]);
});
test("rejected types, suspicious rows and invalid limits fail closed", () => {
  const data=parsePricePaidCsv(rows).rows;
  assert.deepEqual(suggestPricePaidComparables(data,{postcode:"LU1 2AA",propertyType:"bungalow",assessedAt:"2026-11-01"}),[]);
  assert.throws(()=>parsePricePaidCsv(rows,2),/Too many/);
  assert.throws(()=>parsePricePaidCsv('"unfinished'),/Unclosed/);
  assert.throws(()=>suggestPricePaidComparables(data,{postcode:"LU1 1AA",propertyType:"house",assessedAt:"2026-02-30"}),/Invalid/);
});
