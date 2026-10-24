export type StatementRow = { booking_date: string; amount: number; counterparty: string; reference: string; purpose: string; iban: string };
export type StatementPreview = { rows: StatementRow[]; warnings: string[] };

export function statementKey(row: StatementRow) {
  return JSON.stringify([row.booking_date, Math.round(row.amount * 100), row.counterparty.trim(), row.reference.trim(), row.purpose.trim(), row.iban.replace(/\s/g, "").toUpperCase()]);
}
export function statementDate(value: string) {
  const s = value.trim();
  const parts = /^(\d{2})[./](\d{2})[./](\d{4})$/.exec(s);
  const iso = parts ? `${parts[3]}-${parts[2]}-${parts[1]}` : s;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || !Number.isFinite(Date.parse(iso)) || new Date(iso).toISOString().slice(0, 10) !== iso) throw new Error(`Invalid date: ${s}`);
  return iso;
}
export function statementAmount(value: string) {
  let s = value.trim().replace(/[£€\s]/g, "");
  if (/^[+-]?\d{1,3}(\.\d{3})*,\d{2}$/.test(s) || /^[+-]?\d+,\d{2}$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^[+-]?\d{1,3}(,\d{3})+(\.\d{2})?$/.test(s)) s = s.replace(/,/g, "");
  if (!/^[+-]?\d+(\.\d{1,2})?$/.test(s)) throw new Error(`Invalid amount: ${value}`);
  const n = Number(s);
  if (!Number.isFinite(n) || Math.abs(n) > 9999999999.99) throw new Error("Amount out of range");
  return n;
}
function csvRecords(text: string, separator: string): string[][] {
  const records: string[][] = []; let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (!quoted && c === separator) { row.push(cell); cell = ""; }
    else if (!quoted && (c === "\n" || c === "\r")) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); if (row.some(v => v.trim())) records.push(row); row = []; cell = "";
    } else cell += c;
  }
  if (quoted) throw new Error("CSV has an unclosed quoted field");
  row.push(cell); if (row.some(v => v.trim())) records.push(row);
  return records;
}
export function parseStatementCsv(text: string, currency = "GBP"): StatementPreview {
  const clean = text.replace(/^\uFEFF/, "");
  const header = clean.split(/\r?\n/, 1)[0];
  const separator = header.includes(";") ? ";" : ",";
  const records = csvRecords(clean, separator);
  if (records.length < 2) throw new Error("No transaction rows found");
  const columns = records[0].map(v => v.trim().toLowerCase());
  const field = (aliases: string[]) => columns.findIndex(v => aliases.includes(v));
  const date = field(["date", "booking_date", "booking date", "datum", "buchungstag", "buchungsdatum"]);
  const amount = field(["amount", "betrag", "umsatz"]);
  if (date < 0 || amount < 0) throw new Error("CSV requires Date/Datum and Amount/Betrag columns");
  const cp = field(["counterparty", "name", "gegenpartei", "beguenstigter/zahlungspflichtiger"]);
  const ref = field(["reference", "referenz", "ref"]), purpose = field(["purpose", "description", "verwendungszweck"]), iban = field(["iban"]);
  const currencyColumn = field(["currency", "währung", "waehrung"]);
  const rows: StatementRow[] = [], warnings: string[] = []; const seen = new Set<string>();
  if (records.length > 501) throw new Error("Import up to 500 rows at a time");
  for (let i = 1; i < records.length; i++) {
    const r = records[i];
    if (r.length !== columns.length) throw new Error(`Row ${i + 1}: incorrect number of columns`);
    const get = (n: number) => n < 0 ? "" : r[n].trim();
    if (currencyColumn >= 0 && get(currencyColumn).toUpperCase() !== currency) throw new Error(`Row ${i + 1}: currency must be ${currency}`);
    const amountText = get(amount);
    if ((currency === "EUR" && amountText.includes("£")) || (currency === "GBP" && amountText.includes("€"))) throw new Error(`Row ${i + 1}: wrong currency`);
    const row = { booking_date: statementDate(get(date)), amount: statementAmount(get(amount)), counterparty: get(cp), reference: get(ref), purpose: get(purpose), iban: get(iban) };
    const key = statementKey(row);
    if (seen.has(key)) { warnings.push(`Row ${i + 1}: repeated transaction excluded; compare with your statement.`); continue; }
    seen.add(key); rows.push(row);
  }
  return { rows, warnings };
}

// Intentionally conservative: only full dates and explicitly signed single amounts.
// Unsigned debit/credit columns and scanned PDFs require a bank CSV export instead.
export function parseStatementLines(lines: string[]): StatementPreview {
  const rows: StatementRow[] = []; const warnings: string[] = [];
  for (const line of lines) {
    const date = /^(\d{4}-\d{2}-\d{2}|\d{2}[./]\d{2}[./]\d{4})\s+/.exec(line.trim());
    if (!date) continue;
    const rest = line.trim().slice(date[0].length);
    const amounts = [...rest.matchAll(/[+-]\s*[£€]?\s*\d[\d.,]*[.,]\d{2}(?!\d)/g)];
    if (amounts.length !== 1) { warnings.push(`Review in original PDF (ambiguous amount): ${line}`); continue; }
    const token = amounts[0];
    const description = rest.slice(0, token.index).trim();
    if (!description || /balance|saldo|opening|closing/i.test(description) || rest.slice((token.index ?? 0) + token[0].length).trim()) { warnings.push(`Review in original PDF (unsupported layout): ${line}`); continue; }
    rows.push({ booking_date: statementDate(date[1]), amount: statementAmount(token[0]), counterparty: "", reference: description, purpose: "", iban: "" });
  }
  if (!rows.length) throw new Error("No supported transaction lines found. Use a bank CSV export with full dates and signed amounts.");
  if (rows.length > 500) throw new Error("Import up to 500 rows at a time");
  warnings.unshift("PDF extraction may omit rows. Compare every entry and the transaction count with the original statement before confirming.");
  return { rows, warnings };
}
