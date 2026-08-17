import { createFileRoute } from "@tanstack/react-router";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { Button } from "@/components/ui/button";
import { siteUrl } from "@/lib/site-url";

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

const KEY = "gabley.cookie-consent.v1";

function CookiesPage() {
  const reset = () => {
    try { localStorage.removeItem(KEY); } catch { /* privacy mode */ }
    window.location.reload();
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
          <li><strong>Analytics (optional):</strong> aggregated usage to improve the product. Only set after you click "Accept all".</li>
        </ul>

        <h2>Managing your choices</h2>
        <p>You can change your choice any time:</p>
        <div className="not-prose"><Button onClick={reset}>Reopen cookie banner</Button></div>

        <p className="mt-6">You can also clear cookies in your browser settings. Disabling strictly-necessary cookies will break sign-in and core features.</p>

        <h2>Third parties</h2>
        <p>We use a small set of sub-processors for hosting and (optionally) analytics. These are listed in our <a href="/privacy">Privacy Policy</a>.</p>
      </main>
      <PublicFooter />
    </div>
  );
}
