import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { siteUrl } from "@/lib/site-url";
import { ACCEPT_ALL, ESSENTIAL_ONLY, clearConsent, useConsent, writeConsent } from "@/lib/consent";
import { toast } from "sonner";

export const Route = createFileRoute("/cookies")({
  component: CookiesPage,
  head: () => ({
    meta: [
      { title: "Cookie Policy — Gabley" },
      { name: "description", content: "Which cookies Gabley uses, why, and how to change your preferences." },
      { property: "og:title", content: "Cookie Policy — Gabley" },
      { property: "og:description", content: "Cookies used by Gabley and how to manage them." },
      { property: "og:url", content: siteUrl("/cookies") },
    ],
    links: [{ rel: "canonical", href: siteUrl("/cookies") }],
  }),
});

const CATEGORIES: { key: "preferences" | "analytics" | "marketing"; title: string; body: string }[] = [
  { key: "preferences", title: "Preferences", body: "Language, theme, saved filters and layout choices." },
  { key: "analytics", title: "Analytics", body: "Aggregated usage stats so we can improve the product." },
  { key: "marketing", title: "Marketing", body: "Campaign measurement and relevant off-site property content." },
];

function CookiesPage() {
  const { consent, ready } = useConsent();
  const [draft, setDraft] = useState({ preferences: false, analytics: false, marketing: false });

  useEffect(() => {
    if (consent) {
      setDraft({
        preferences: consent.preferences,
        analytics: consent.analytics,
        marketing: consent.marketing,
      });
    }
  }, [consent]);

  const save = (choice: typeof ACCEPT_ALL) => {
    writeConsent(choice);
    toast.success("Cookie preferences saved");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-1 container mx-auto px-4 py-16 max-w-3xl prose prose-slate dark:prose-invert">
        <h1>Cookie Policy</h1>
        <p className="text-muted-foreground text-sm">Last updated: {new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })}</p>

        <p>Cookies are small text files stored on your device. We use them to keep you signed in, remember your preferences, and (with your consent) understand how the Service is used.</p>

        <h2>Categories we use</h2>
        <ul>
          <li><strong>Strictly necessary:</strong> authentication session, security, load balancing. Always on.</li>
          <li><strong>Preferences:</strong> language, theme, layout choices.</li>
          <li><strong>Analytics (optional):</strong> aggregated usage to improve the product. Only set with your consent.</li>
          <li><strong>Marketing (optional):</strong> campaign measurement. Only set with your consent.</li>
        </ul>

        <h2>Your current choices</h2>
        <div className="not-prose rounded-xl border divide-y">
          <div className="flex items-start justify-between gap-4 p-4">
            <div className="text-sm">
              <div className="font-medium">Strictly necessary</div>
              <p className="text-muted-foreground">Sign-in, security and core functionality.</p>
            </div>
            <Switch checked disabled aria-label="Strictly necessary cookies (always on)" />
          </div>
          {CATEGORIES.map((c) => (
            <div key={c.key} className="flex items-start justify-between gap-4 p-4">
              <div className="text-sm">
                <div className="font-medium">{c.title}</div>
                <p className="text-muted-foreground">{c.body}</p>
              </div>
              <Switch
                checked={draft[c.key]}
                disabled={!ready}
                onCheckedChange={(v) => setDraft((d) => ({ ...d, [c.key]: v }))}
                aria-label={`${c.title} cookies`}
              />
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-2 p-4">
            <Button onClick={() => save({ necessary: true, ...draft })}>Save preferences</Button>
            <Button variant="outline" onClick={() => save(ACCEPT_ALL)}>Accept all</Button>
            <Button variant="outline" onClick={() => save(ESSENTIAL_ONLY)}>Reject non-essential</Button>
            <Button variant="ghost" onClick={() => { clearConsent(); toast("Cookie banner reopened"); }}>
              Reopen cookie banner
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground not-prose mt-2">
          {consent
            ? `Last updated ${new Date(consent.at).toLocaleString("en-GB")}.`
            : "No choice recorded yet — only strictly necessary cookies are active."}
        </p>

        <h2>Managing cookies in your browser</h2>
        <p className="mt-6">You can also clear cookies in your browser settings. Disabling strictly-necessary cookies will break sign-in and core features.</p>

        <h2>Third parties</h2>
        <p>We use a small set of sub-processors for hosting and (optionally) analytics. These are listed in our <a href="/privacy">Privacy Policy</a>.</p>
      </main>
      <PublicFooter />
    </div>
  );
}
