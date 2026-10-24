import { useRef, useState } from "react";
import { readStatement } from "@/lib/read-statement";
import { statementKey, type StatementPreview, type StatementRow } from "@/lib/statement-import";

export function StatementImport({ german = false, currency = "GBP", onConfirm }: { german?: boolean; currency?: "GBP" | "EUR"; onConfirm: (rows: StatementRow[]) => Promise<{ inserted: number; duplicates?: number }> }) {
  const tr = (en: string, de: string) => german ? de : en;
  const [preview, setPreview] = useState<StatementPreview | null>(null);
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const rows = preview?.rows.filter((_, i) => !excluded.has(i)) ?? [];
  const repeated = new Set<string>();
  const duplicateIndices = new Set<number>();
  preview?.rows.forEach((r, i) => { const key = statementKey(r); if (repeated.has(key)) duplicateIndices.add(i); repeated.add(key); });
  return <section className="space-y-4 rounded-xl border bg-card p-5" aria-label={tr("Statement import", "Kontoauszug importieren")}>
    <h2 className="text-lg font-semibold">{tr("Import → review → confirm", "Importieren → prüfen → bestätigen")}</h2>
    <p className="text-sm text-muted-foreground">{tr("PDF or CSV, up to 10 MB / 500 transactions. Files are read in your browser. Nothing is saved until you confirm. PDF support is limited to text statements with full dates and explicitly signed amounts; use CSV for other layouts or scans.", "PDF oder CSV, bis 10 MB / 500 Buchungen. Die Datei wird im Browser gelesen. Erst nach Bestätigung wird gespeichert. PDF: Textauszüge mit vollständigem Datum und vorzeichenbehafteten Beträgen. Für andere Layouts oder Scans bitte CSV verwenden.")}</p>
    <label className="block text-sm font-medium">{tr("Choose a statement", "Kontoauszug auswählen")}<input className="mt-2 block max-w-full text-sm" type="file" accept=".csv,.pdf" disabled={busy} onChange={async e => {
      const file = e.target.files?.[0]; e.target.value = ""; if (!file || lock.current) return;
      lock.current = true; setBusy(true); setError(""); setMessage(""); setPreview(null); setReviewed(false); setExcluded(new Set());
      try { const result = await readStatement(file, currency); const seen = new Set<string>(); const duplicates = new Set<number>(); result.rows.forEach((r, i) => { const key = statementKey(r); if (seen.has(key)) duplicates.add(i); seen.add(key); }); setExcluded(duplicates); setPreview(result); }
      catch (e) { setError(e instanceof Error ? e.message : tr("Import failed", "Import fehlgeschlagen")); }
      finally { lock.current = false; setBusy(false); }
    }} /></label>
    {busy && <p role="status">{tr("Working…", "Wird bearbeitet…")}</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {message && <p role="status" className="text-sm">{message}</p>}
    {preview && <>
      {preview.warnings.length > 0 && <div className="rounded-md border p-3 text-sm"><strong>{tr("Check against the original", "Mit dem Original vergleichen")}</strong><ul className="mt-2 list-disc pl-5">{preview.warnings.slice(0, 10).map((w, i) => <li key={i}>{w}</li>)}</ul>{preview.warnings.length > 10 && <p>{preview.warnings.length - 10} {tr("more warnings: use CSV for a complete import.", "weitere Hinweise: CSV für vollständigen Import verwenden.")}</p>}</div>}
      <div className="max-h-96 overflow-auto rounded-md border"><table className="w-full text-left text-sm"><caption className="p-3 text-left">{tr("Review proposed transactions. Exclude unwanted entries.", "Vorgeschlagene Buchungen prüfen. Unerwünschte Einträge abwählen.")}</caption><thead><tr><th className="p-2">{tr("Include", "Übernehmen")}</th><th className="p-2">{tr("Date", "Datum")}</th><th className="p-2">{tr("Reference", "Referenz")}</th><th className="p-2">{tr("Amount", "Betrag")}</th></tr></thead><tbody>{preview.rows.map((r, i) => <tr key={i} className="border-t"><td className="p-2"><input type="checkbox" aria-label={`${tr("Include row", "Zeile übernehmen")} ${i + 1}`} disabled={busy || duplicateIndices.has(i)} checked={!excluded.has(i)} onChange={() => { setExcluded(old => { const next = new Set(old); if (next.has(i)) next.delete(i); else next.add(i); return next; }); setReviewed(false); }} /></td><td className="whitespace-nowrap p-2">{r.booking_date}</td><td className="p-2">{r.counterparty} {r.reference || r.purpose}{duplicateIndices.has(i) && <span> · {tr("duplicate excluded", "Duplikat ausgeschlossen")}</span>}</td><td className="whitespace-nowrap p-2 tabular-nums">{new Intl.NumberFormat(german ? "de-DE" : "en-GB", { style: "currency", currency }).format(r.amount)}</td></tr>)}</tbody></table></div>
      <p className="text-sm">{rows.length} {tr("selected transactions. Matching is a separate step after import.", "ausgewählte Buchungen. Die Zuordnung erfolgt nach dem Import.")}</p>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={reviewed} disabled={busy} onChange={e => setReviewed(e.target.checked)} />{tr("I checked the dates, amounts, signs and transaction count against my statement.", "Ich habe Datum, Beträge, Vorzeichen und Anzahl mit meinem Kontoauszug verglichen.")}</label>
      <div className="flex flex-wrap gap-3"><button type="button" disabled={busy || !reviewed || !rows.length} className="rounded-md bg-foreground px-4 py-2 text-sm text-background disabled:opacity-50" onClick={async () => {
        if (lock.current) return; lock.current = true; setBusy(true); setError("");
        try { const result = await onConfirm(rows); setPreview(null); setMessage(`${result.inserted} ${tr("imported", "importiert")} · ${result.duplicates ?? 0} ${tr("duplicates skipped", "Duplikate übersprungen")}`); }
        catch (e) { setError(e instanceof Error ? e.message : tr("Import failed", "Import fehlgeschlagen")); }
        finally { lock.current = false; setBusy(false); }
      }}>{tr("Confirm import", "Import bestätigen")}</button><button type="button" disabled={busy} className="rounded-md border px-4 py-2 text-sm" onClick={() => { setPreview(null); setError(""); }}>{tr("Discard preview", "Vorschau verwerfen")}</button></div>
    </>}
  </section>;
}
