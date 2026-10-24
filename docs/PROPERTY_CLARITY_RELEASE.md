# Property clarity release — 24 October 2026

## Delivered
- Interactive public sample portfolio (rent, repairs, documents and categorisation), clearly separated from customer data.
- Task-focused homepage copy, attention-first dashboards and grouped landlord navigation.
- Browser-local CSV and text-PDF statement preview with explicit confirmation, row exclusion, input limits, currency checks and server-side validation.
- Deterministic organisation/agency-scoped transaction IDs make retries and concurrent imports of identical entries idempotent. Existing transactions from other import methods are not retroactively deduplicated. Indistinguishable same-day transactions with identical details require manual investigation; the importer excludes repeated entries.
- Bank imports do not settle rent automatically. Existing reconciliation is a separate workflow.
- Dependency lockfile repaired/generated, current TanStack validator API and error boundary types, and encrypted preview sessions migrated to iron-session.

## Product-specific changes
Gabley: complete paginated rent data, selected charge month, partial receipts, money and count for arrears, waived charges excluded, conditional first-property onboarding, loading/error/retry states. The received figure measures allocations to the selected month's charges, NOT cash received during that month: the current rent_schedule data is not a receipt ledger.

Immoviq: unsupported portfolio-size claim removed; module directory collapsed; correct count metadata and query-error propagation in dashboard; bank review opens first in Finance+; Nebenkosten workflow guidance; amount-only automatic settlement removed.

## Validation
Focused tests cover UK/German CSV, malformed rows, dates, amounts, PDF extraction decisions, duplicate IDs, currency validation; Gabley also tests partial-payment summaries and pagination beyond 500 rows. TypeScript and production builds pass.

## Release and remaining work
No production database changes or deployment performed. Test authenticated imports and permissions against the connected Lovable environment before publishing. Public desktop/mobile browser checks passed for both sites (no page errors or horizontal overflow). A browser component test passed review gating, no premature writes, CSV confirmation, actual PDF-worker extraction, discard without saving, foreign-currency rejection, and EUR display in English.

Preview sessions now use a new v2 cookie name; users must re-enter the preview password. SESSION_SECRET must be configured with at least 32 characters. Supabase user authentication is unchanged.

PDF support is intentionally conservative: text PDFs with full dates and explicitly signed amounts; scanned statements, unsigned multi-column layouts and ambiguous lines require CSV or manual review. No OCR or AI classification is claimed.

This release does not implement a new landlord subscription price, ledger-level split allocations/reversal audit workflow, or comprehensive guided SEPA/handover/document-redesign flows. Those require separate accounting and billing changes; existing workflows remain available.
