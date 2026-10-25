import { useState } from "react";
import {
  DEMO_STATEMENT_ROWS,
  optionsForDemoRow,
  summarizeDemoReview,
  summarizeDemoStatement,
  type DemoReviewCategory,
} from "@/lib/demo-statement";

const categoryLabels: Record<DemoReviewCategory, { en: string; de: string }> = {
  unassigned: { en: "Choose category", de: "Kategorie wählen" },
  rent: { en: "Rent received", de: "Mieteingang" },
  other_income: { en: "Other income", de: "Sonstige Einnahme" },
  maintenance: { en: "Repairs / maintenance", de: "Reparatur / Instandhaltung" },
  utilities: { en: "Utilities / service costs", de: "Nebenkosten / Versorgung" },
  other_expense: { en: "Other expense", de: "Sonstige Ausgabe" },
};

/** Public, local-state-only walkthrough: never writes to a real bank or rent ledger. */
export function StatementWalkthrough({ german = false }: { german?: boolean }) {
  const [categories, setCategories] = useState<Record<string, DemoReviewCategory>>({});
  const [confirmed, setConfirmed] = useState(false);
  const tr = (en: string, de: string) => german ? de : en;
  const locale = german ? "de-DE" : "en-GB";
  const currency = german ? "EUR" : "GBP";
  const money = (minor: number) => new Intl.NumberFormat(locale, { style: "currency", currency }).format(minor / 100);
  const progress = summarizeDemoReview(DEMO_STATEMENT_ROWS, categories);
  const totals = summarizeDemoStatement(DEMO_STATEMENT_ROWS);

  return (
    <section id="statement-walkthrough" aria-labelledby="statement-walkthrough-title" className="scroll-mt-24 border-y bg-background px-4 py-14 md:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">{tr("From statement to sorted · interactive sample", "Vom Kontoauszug zur Übersicht · interaktives Beispiel")}</p>
          <h2 id="statement-walkthrough-title" className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">{tr("Review five transactions. Know what needs attention.", "Fünf Buchungen prüfen. Klar sehen, was ansteht.")}</h2>
          <p className="mt-3 text-muted-foreground">{tr("Explore a sample rent and expense review. Choose a category for each entry, then confirm the example. No file, account or bank connection is needed.", "Prüfen Sie beispielhaft Mietzahlungen und Ausgaben. Wählen Sie für jede Buchung eine Kategorie und bestätigen Sie das Beispiel. Keine Datei, kein Konto und keine Bankverbindung nötig.")}</p>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(260px,0.75fr)]">
          <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
              <div>
                <p className="font-semibold">{tr("Example bank statement", "Beispiel-Kontoauszug")}</p>
                <p className="text-xs text-muted-foreground">{tr("Illustrative transactions only · October", "Nur Beispielbuchungen · Oktober")}</p>
              </div>
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium tabular-nums">{progress.reviewed}/{progress.total} {tr("reviewed", "geprüft")}</span>
            </div>
            <div className="h-1 bg-muted" role="progressbar" aria-label={tr("Review progress", "Fortschritt der Prüfung")} aria-valuenow={progress.reviewed} aria-valuemin={0} aria-valuemax={progress.total}>
              <div className="h-full bg-primary transition-[width]" style={{ width: String(Math.round(progress.reviewed / progress.total * 100)) + "%" }} />
            </div>
            <ol className="divide-y">
              {DEMO_STATEMENT_ROWS.map((row) => {
                const chosen = categories[row.id] ?? "unassigned";
                return (
                  <li key={row.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center md:p-5">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{row.day} {tr("Oct", "Okt")}</p>
                      <p className="mt-1 text-sm font-semibold">{german ? row.descriptionDe : row.descriptionEn}</p>
                      <p className={"mt-1 text-sm font-semibold tabular-nums " + (row.amountMinor > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-foreground")}>
                        {row.amountMinor > 0 ? "+" : ""}{money(row.amountMinor)}
                      </p>
                    </div>
                    <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-muted-foreground" htmlFor={"sample-category-" + row.id}>
                      {tr("Category", "Kategorie")}
                      <select
                        id={"sample-category-" + row.id}
                        value={chosen}
                        onChange={(event) => {
                          const category = event.target.value as DemoReviewCategory;
                          setCategories((prev) => ({ ...prev, [row.id]: category }));
                          setConfirmed(false);
                        }}
                        className="w-full max-w-full rounded-lg border bg-background px-3 py-2.5 text-sm text-foreground sm:w-52"
                      >
                        {optionsForDemoRow(row).map((category) => (
                          <option key={category} value={category}>
                            {german ? categoryLabels[category].de : categoryLabels[category].en}
                          </option>
                        ))}
                      </select>
                    </label>
                  </li>
                );
              })}
            </ol>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/20 p-5">
              <div role="status" aria-live="polite" className="text-sm text-muted-foreground">
                {confirmed
                  ? tr("Example review completed. No real transactions were changed.", "Beispielprüfung abgeschlossen. Keine echten Buchungen wurden verändert.")
                  : progress.ready
                    ? tr("All example rows classified. Ready to confirm the sample.", "Alle Beispielbuchungen kategorisiert. Bereit zur Bestätigung.")
                    : tr("Classify every example row to enable confirmation.", "Kategorisieren Sie alle Beispielbuchungen, um zu bestätigen.")}
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => { setCategories({}); setConfirmed(false); }} className="rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-muted">
                  {tr("Reset", "Zurücksetzen")}
                </button>
                <button type="button" disabled={!progress.ready || confirmed} onClick={() => setConfirmed(true)} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
                  {tr("Confirm sample", "Beispiel bestätigen")}
                </button>
              </div>
            </div>
          </div>

          <aside className="h-fit rounded-2xl border bg-card p-5 md:p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{tr("Sample overview", "Beispielübersicht")}</p>
            <dl className="mt-5 space-y-4">
              <div className="flex items-center justify-between gap-3"><dt className="text-sm text-muted-foreground">{tr("Money in", "Eingänge")}</dt><dd className="text-lg font-semibold tabular-nums">{money(totals.incomeMinor)}</dd></div>
              <div className="flex items-center justify-between gap-3"><dt className="text-sm text-muted-foreground">{tr("Money out", "Ausgänge")}</dt><dd className="text-lg font-semibold tabular-nums">{money(totals.expensesMinor)}</dd></div>
              <div className="flex items-center justify-between gap-3 border-t pt-4"><dt className="text-sm font-semibold">{tr("Net sample movement", "Beispielsaldo")}</dt><dd className="text-lg font-semibold tabular-nums">{money(totals.netMinor)}</dd></div>
            </dl>
            <div className="mt-6 space-y-3 border-t pt-5 text-sm">
              <p className="font-semibold">{tr("How the real workflow differs", "So funktioniert der echte Ablauf")}</p>
              <p className="text-muted-foreground">{tr("Real statement imports require account access, transaction validation and an explicit review before saving.", "Echte Kontoauszug-Importe benötigen eine Anmeldung, Transaktionsprüfung und eine ausdrückliche Kontrolle vor dem Speichern.")}</p>
              <p className="text-muted-foreground">{tr("Categorising a payment never automatically settles a rent charge. Matching and reconciliation must be checked separately.", "Eine Kategorisierung begleicht niemals automatisch eine Mietforderung. Zuordnung und Abgleich müssen separat geprüft werden.")}</p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
