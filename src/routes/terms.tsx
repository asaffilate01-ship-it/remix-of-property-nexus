import { createFileRoute } from "@tanstack/react-router";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { siteUrl } from "@/lib/site-url";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: "Terms of Service — Gabley" },
      { name: "description", content: "Gabley terms of service governing the use of our property management platform and marketplace." },
      { property: "og:title", content: "Terms of Service — Gabley" },
      { property: "og:description", content: "Gabley terms of service for our property management platform." },
      { property: "og:url", content: siteUrl("/terms") },
    ],
    links: [{ rel: "canonical", href: siteUrl("/terms") }],
  }),
});

function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-1 container mx-auto px-4 py-16 max-w-3xl prose prose-slate dark:prose-invert">
        <h1>Terms of Service</h1>
        <p className="text-muted-foreground text-sm">Last updated: {new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })}</p>

        <h2>1. Acceptance</h2>
        <p>By accessing or using Gabley ("the Service"), you agree to be bound by these Terms. If you do not agree, do not use the Service.</p>

        <h2>2. The Service</h2>
        <p>Gabley provides software-as-a-service tools for estate and letting agencies, landlords, tenants and prospective property buyers/renters, including a marketplace of listings, CRM, HMO management, compliance tracking, work-order management and related features.</p>

        <h2>3. Accounts</h2>
        <p>You are responsible for safeguarding your account credentials and for all activity that occurs under your account. You must provide accurate information and notify us immediately of any unauthorised use.</p>

        <h2>4. Acceptable use</h2>
        <ul>
          <li>No unlawful, fraudulent or misleading listings.</li>
          <li>No scraping, reverse engineering or interference with the Service.</li>
          <li>No upload of content that infringes intellectual-property or privacy rights.</li>
        </ul>

        <h2>5. Fees</h2>
        <p>Paid plans are billed in advance and are non-refundable except as required by law. We may change pricing on 30 days' notice.</p>

        <h2>6. Property data</h2>
        <p>Agencies are responsible for the accuracy of listings and tenant/landlord data they upload. Gabley is a platform and does not act as estate agent or principal in any property transaction unless expressly stated.</p>

        <h2>7. Liability</h2>
        <p>To the maximum extent permitted by law, Gabley is not liable for indirect or consequential loss. Our aggregate liability is capped at the fees you paid in the 12 months preceding the claim.</p>

        <h2>8. Termination</h2>
        <p>Either party may terminate on 30 days' notice. We may suspend immediately for material breach.</p>

        <h2>9. Governing law</h2>
        <p>These Terms are governed by the laws of England and Wales. Disputes are subject to the exclusive jurisdiction of the English courts.</p>

        <h2>10. Contact</h2>
        <p>Questions? Email <a href="mailto:legal@gabley.co.uk">legal@gabley.co.uk</a>.</p>
      </main>
      <PublicFooter />
    </div>
  );
}
