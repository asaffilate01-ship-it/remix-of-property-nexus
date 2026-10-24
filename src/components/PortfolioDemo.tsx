import { useState } from "react";

export function PortfolioDemo({ german = false }: { german?: boolean }) {
  const [selected, setSelected] = useState(0);
  const [view, setView] = useState("rent");
  const [category, setCategory] = useState("review");
  const tr = (en: string, de: string) => german ? de : en;
  const names = german ? ["Lindenstraße 12", "Gartenstraße 8", "Parkstraße 24"] : ["12 Linden Close", "8 Garden Road", "24 Park Avenue"];
  const currency = (n: number) => new Intl.NumberFormat(german ? "de-DE" : "en-GB", { style: "currency", currency: german ? "EUR" : "GBP" }).format(n);
  const properties = [
    { rent: 950, received: 950, status: tr("Paid", "Bezahlt"), detail: tr("No action needed. Your tenant's payment is recorded.", "Keine Aktion nötig. Die Mietzahlung ist erfasst.") },
    { rent: 825, received: 400, status: tr("Part paid", "Teilzahlung"), detail: tr("A partial payment is recorded. Review the remaining balance before sending a reminder.", "Eine Teilzahlung ist erfasst. Prüfen Sie den Restbetrag vor einer Erinnerung.") },
    { rent: 1100, received: 1100, status: tr("Paid", "Bezahlt"), detail: tr("Rent is up to date. An inspection document needs your attention.", "Die Miete ist bezahlt. Ein Prüfbericht benötigt Ihre Aufmerksamkeit.") },
  ];
  const p = properties[selected];
  return <section id="portfolio-demo" className="scroll-mt-24 border-b bg-muted/20 px-4 py-12 md:py-20">
    <div className="mx-auto max-w-6xl">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{tr("Interactive sample · no account needed", "Interaktives Beispiel · ohne Anmeldung")}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">{tr("Your next action, made clear.", "Ihre nächste Aufgabe. Klar im Blick.")}</h2>
      <p className="mt-3 max-w-2xl text-muted-foreground">{tr("Select a property. Check rent, repairs and documents. All names, balances and actions below are examples; nothing is sent or saved.", "Wählen Sie eine Immobilie. Prüfen Sie Miete, Reparaturen und Dokumente. Alle Namen, Beträge und Aktionen sind Beispiele; nichts wird versendet oder gespeichert.")}</p>
      <div className="mt-8 grid gap-5 md:grid-cols-[1fr_1.6fr]">
        <div className="space-y-3" aria-label={tr("Example properties", "Beispielimmobilien")}>
          {names.map((name, i) => <button key={name} type="button" aria-pressed={selected === i} onClick={() => setSelected(i)} className={`w-full rounded-xl border p-5 text-left transition-colors ${selected === i ? "border-foreground bg-card ring-1 ring-foreground" : "bg-background hover:bg-muted"}`}>
            <span className="block font-semibold">{name}</span><span className="mt-2 block text-sm text-muted-foreground">{i === 0 ? tr("Rent paid · all clear", "Miete bezahlt · alles erledigt") : i === 1 ? tr("Partial rent · repair reported", "Teilzahlung · Reparatur gemeldet") : tr("Document review needed", "Dokument prüfen")}</span>
          </button>)}
        </div>
        <div className="rounded-2xl border bg-card p-5 md:p-7">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{tr("Sample property", "Beispielimmobilie")}</p><h3 className="mt-2 text-2xl font-semibold">{names[selected]}</h3>
          <div className="my-5 flex flex-wrap gap-2" aria-label={tr("Property views", "Immobilienansichten")}>
            {[["rent", tr("Rent", "Miete")], ["repairs", tr("Repairs", "Reparaturen")], ["documents", tr("Documents", "Dokumente")]].map(([key, label]) => <button key={key} type="button" aria-pressed={view === key} onClick={() => setView(key)} className={`rounded-full border px-4 py-2 text-sm ${view === key ? "bg-foreground text-background" : "hover:bg-muted"}`}>{label}</button>)}
          </div>
          <div aria-live="polite" className="min-h-44">
            {view === "rent" && <><dl className="grid grid-cols-2 gap-4"><div><dt className="text-sm text-muted-foreground">{tr("Expected", "Soll")}</dt><dd className="text-2xl font-semibold">{currency(p.rent)}</dd></div><div><dt className="text-sm text-muted-foreground">{tr("Received", "Erhalten")}</dt><dd className="text-2xl font-semibold">{currency(p.received)}</dd></div></dl><p className="mt-4 font-medium">{p.status} · {currency(p.rent - p.received)} {tr("outstanding", "offen")}</p><p className="mt-2 text-sm text-muted-foreground">{p.detail}</p></>}
            {view === "repairs" && <><p className="font-medium">{selected === 1 ? tr("Heating repair · visit requested", "Heizungsreparatur · Termin angefragt") : tr("No open repairs", "Keine offenen Reparaturen")}</p><p className="mt-3 text-sm text-muted-foreground">{tr("Report → review → arrange a visit → record completion. Photos and messages stay with the property.", "Melden → prüfen → Termin vereinbaren → Abschluss dokumentieren. Fotos und Nachrichten bleiben bei der Immobilie.")}</p></>}
            {view === "documents" && <><p className="font-medium">{selected === 2 ? tr("Inspection record · review required", "Prüfbericht · Prüfung erforderlich") : tr("Tenancy documents · up to date", "Mietunterlagen · aktuell")}</p><p className="mt-3 text-sm text-muted-foreground">{tr("Keep the document, deadline and person responsible together. Review the evidence before marking a task complete.", "Dokument, Frist und verantwortliche Person an einem Ort. Prüfen Sie den Nachweis vor dem Abschluss.")}</p></>}
          </div>
        </div>
      </div>
      <div className="mt-5 rounded-xl border bg-card p-5 sm:flex sm:items-center sm:justify-between sm:gap-6">
        <div><h3 className="font-semibold">{tr("Try a statement review", "Kontoauszug prüfen – ausprobieren")}</h3><p className="mt-1 text-sm text-muted-foreground">{tr("Example credit", "Beispieleingang")}: {currency(950)} · {tr("Choose a category before confirming.", "Kategorie vor der Bestätigung auswählen.")}</p></div>
        <label className="mt-3 block text-sm sm:mt-0">{tr("Category", "Kategorie")}<select className="ml-3 rounded-md border bg-background px-3 py-2" value={category} onChange={(e) => setCategory(e.target.value)}><option value="review">{tr("Needs review", "Zu prüfen")}</option><option value="rent">{tr("Rent payment", "Mietzahlung")}</option><option value="other">{tr("Other receipt", "Sonstiger Eingang")}</option></select></label>
      </div><p aria-live="polite" className="mt-2 text-sm text-muted-foreground">{category === "review" ? tr("No classification selected.", "Keine Kategorie ausgewählt.") : tr("Sample classification updated. No real transaction has changed.", "Beispielkategorie geändert. Keine echte Buchung wurde verändert.")}</p>
    </div>
  </section>;
}
