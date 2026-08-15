import { createFileRoute } from "@tanstack/react-router";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { siteUrl } from "@/lib/site-url";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Privacy Policy — Estately" },
      {
        name: "description",
        content: "How Estately collects, uses and protects your personal data under UK GDPR.",
      },
      { property: "og:title", content: "Privacy Policy — Estately" },
      { property: "og:description", content: "How Estately handles personal data under UK GDPR." },
      { property: "og:url", content: siteUrl("/privacy") },
    ],
    links: [{ rel: "canonical", href: siteUrl("/privacy") }],
  }),
});

function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-1 container mx-auto px-4 py-16 max-w-3xl prose prose-slate dark:prose-invert">
        <h1>Privacy Policy</h1>
        <p className="text-muted-foreground text-sm">Last updated: 15 August 2026</p>

        <p>
          Estately Ltd ("we", "us") is the data controller for personal data we process about you.
          We are registered with the UK Information Commissioner's Office.
        </p>

        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>Account data:</strong> name, email, phone, role.
          </li>
          <li>
            <strong>Property data:</strong> addresses, listings, tenancy details, compliance
            records.
          </li>
          <li>
            <strong>Operational data:</strong> work orders, photos and videos (with embedded
            location and timestamp when you allow it), messages.
          </li>
          <li>
            <strong>Technical data:</strong> IP, device, browser, log data.
          </li>
        </ul>

        <h2>Lawful bases</h2>
        <p>
          We process personal data on the bases of contract performance, legitimate interests
          (running and improving the Service), legal obligation (e.g. AML, Right-to-Rent), and
          consent where required (e.g. analytics cookies, marketing).
        </p>

        <h2>How we use it</h2>
        <p>
          To deliver the Service, support customers, ensure security, meet legal obligations, and
          improve the platform.
        </p>

        <h2>Sharing</h2>
        <p>
          With sub-processors strictly necessary to run the Service (hosting, email, analytics), and
          where required by law. We do not sell personal data.
        </p>

        <h2>Retention</h2>
        <p>
          Account data while your account is active and for up to 7 years afterwards for legal/tax
          reasons. You can request earlier deletion subject to legal retention obligations.
        </p>

        <h2>International transfers</h2>
        <p>
          Where data is transferred outside the UK we rely on appropriate safeguards such as the UK
          Addendum to the EU Standard Contractual Clauses.
        </p>

        <h2>Your rights</h2>
        <p>
          Access, rectification, erasure, restriction, portability, objection, and the right to
          lodge a complaint with the ICO. Signed-in users can submit and track a request in the{" "}
          <a href="/settings?tab=privacy">privacy centre</a>. We may need to verify your identity
          and will normally respond within one month. You may also email{" "}
          <a href="mailto:privacy@estately.app">privacy@estately.app</a>.
        </p>

        <h2>Contact</h2>
        <p>
          Data Protection Officer: <a href="mailto:privacy@estately.app">privacy@estately.app</a>
        </p>
      </main>
      <PublicFooter />
    </div>
  );
}
