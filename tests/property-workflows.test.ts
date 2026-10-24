import test from "node:test";
import assert from "node:assert/strict";
import { parseStatementCsv, parseStatementLines, statementAmount, statementDate } from "../src/lib/statement-import.ts";
import { statementBatch, statementId } from "../src/lib/statement-batch.ts";

test("German CSV supports decimal commas, thousands, quoted separators and multiline text", () => {
 const { rows } = parseStatementCsv('Datum;Betrag;Name;Verwendungszweck\n24.10.2026;1.234,56;"Müller; GmbH";"Miete\nOktober"\n25.10.2026;-15,50;Bank;Gebühr');
 assert.equal(rows[0].amount, 1234.56); assert.equal(rows[0].counterparty, "Müller; GmbH"); assert.equal(rows[0].purpose, "Miete\nOktober"); assert.equal(rows[1].amount, -15.5);
});
test("UK CSV supports quoted thousands and escaped quotes", () => {
 const { rows } = parseStatementCsv('date,amount,counterparty,reference\n2026-10-24,"1,250.00","A ""B""",rent');
 assert.equal(rows[0].amount,1250); assert.equal(rows[0].counterparty,'A "B"');
});
test("invalid dates/amounts/headers and malformed rows fail closed", () => {
 for (const input of ['date,amount\n2026-02-30,100','date,amount\n2026-10-01,abc','name,amount\nA,100','date,amount\n2026-10-01,100,extra','date,amount\n2026-10-01,"100']) assert.throws(() => parseStatementCsv(input));
 assert.throws(() => statementDate("01/02/26")); assert.throws(() => statementAmount("1e3")); assert.throws(() => statementAmount(""));
});
test("duplicate rows are excluded visibly", () => {
 const result = parseStatementCsv('date,amount,reference\n2026-10-01,950,rent\n2026-10-01,950,rent');
 assert.equal(result.rows.length,1); assert.equal(result.warnings.length,1);
});
test("PDF accepts clear signed amounts and flags ambiguous balances", () => {
 const result = parseStatementLines(['2026-10-01 RENT +950.00','02.10.2026 Repair -38,50','2026-10-03 Rent +950.00 1,900.00','2026-10-04 Opening balance +1900.00']);
 assert.equal(result.rows.length,2); assert.equal(result.rows[1].amount,-38.5); assert.equal(result.warnings.length,3);
 assert.throws(() => parseStatementLines(['2026-10-01 Rent 950.00']));
});
test("server validation rejects invalid inputs independently of the UI", () => {
 assert.throws(() => statementBatch.parse({rows:[{booking_date:'2026-02-30',amount:10}]}));
 assert.throws(() => statementBatch.parse({rows:[{booking_date:'2026-10-01',amount:0.001}]}));
 assert.throws(() => statementBatch.parse({rows:[]}));
});
test("idempotency IDs are stable, tenant-scoped and change with transaction details", async () => {
 const row = statementBatch.parse({rows:[{booking_date:'2026-10-01',amount:950,reference:'Rent'}]}).rows[0];
 const id = await statementId('org-a', row);
 assert.equal(id, await statementId('org-a',row)); assert.notEqual(id, await statementId('org-b',row)); assert.notEqual(id, await statementId('org-a',{...row,amount:951}));
 assert.match(id,/^[\da-f]{8}-[\da-f]{4}-5[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/);
});

import { collectPages, summarizeRent } from "../src/lib/portfolio-summary.ts";
test("charge cohort includes partial receipts and arrears include earlier months", () => {
 const result = summarizeRent([
 {amount:1000,paid_amount:400,due_date:'2026-10-01',status:'due'},
 {amount:500,paid_amount:100,due_date:'2026-09-01',status:'overdue'},
 {amount:200,paid_amount:0,due_date:'2026-10-01',status:'waived'},
 {amount:900,paid_amount:900,due_date:'2026-10-01',status:'paid'},
 {amount:100,paid_amount:0,due_date:'2026-10-24',status:'due'},
 ],'2026-10','2026-10-24');
 assert.deepEqual(result,{expected:2000,received:1300,overdue:1000,overdueCount:2});
});
test("inconsistent paid status does not hide an outstanding balance", () => {
 assert.equal(summarizeRent([{amount:100,paid_amount:40,due_date:'2026-10-01',status:'paid'}],'2026-10','2026-10-24').overdue,60);
});
test("pagination reads beyond 500 and tolerates lower server row caps", async () => {
 const source = Array.from({length:1101}, (_,i)=>i);
 const rows = await collectPages(async (from,to)=>({data:source.slice(from,Math.min(from+250,to+1)),error:null}));
 assert.equal(rows.length,1101); assert.equal(rows[1100],1100);
 await assert.rejects(()=>collectPages(async ()=>({data:null,error:{message:'offline'}})),/offline/);
});

test("currency columns reject foreign-currency statements", () => {
 assert.throws(() => parseStatementCsv('date,amount,currency\n2026-10-24,10,USD', 'EUR'));
 assert.equal(parseStatementCsv('date,amount,currency\n2026-10-24,10,EUR', 'EUR').rows[0].amount,10);
});
