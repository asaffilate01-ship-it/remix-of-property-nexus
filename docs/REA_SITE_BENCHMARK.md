# Ahmed Property public-site benchmark and REA inspection

Research date: 25 October 2026. Reference: https://www.ahmedproperty.co.uk/

## Evidence already confirmed

- Public homepage: landlord-centred language, selectable example properties, rent/document/tenancy views, an interactive categorisation example and a property-count slider.
- Public pricing page: property-band tiers, monthly/annual presentation, free trial and capabilities listed by tier. The prices belong to Ahmed Property and **are not proposed prices for this app**.
- The observable website does **not** establish its backend, database, hosting platform, source repository or actual payment integrations. No claims about its exact framework are verified by the text-only public inspection.
- The site’s marketing UX is the benchmark, not a source of code, copyrighted artwork, business data, branding or proprietary assets to copy.

## This repo: independently implemented improvements

- Product: Gabley. Customer-facing locales: GBP / en-GB.
- Public pages: src/routes/index.tsx and src/routes/for-landlords.tsx.
- Existing portfolio sample and guarded real CSV/text-PDF statement importer were present before this change.
- Added the `StatementWalkthrough` marketing component and `demo-statement` pure utilities for a five-line, mobile-friendly sample statement review.
- Every row requires explicit categorisation; credit and debit categories are distinct; demo totals are calculated in minor units; Reset is available.
- The sample is browser-state-only, with explicit confirmation and a notice that categorising entries is not rent settlement. It does not call Supabase, send transactions or access bank accounts.
- Added regression tests to `tests/property-workflows.test.ts` for totals, invalid direction choices, partial review and malformed rows.

## Reproduce the deeper REA website inspection on an authorised workstation

REA project: https://github.com/morluto/rea and official browser guide: https://github.com/morluto/rea/blob/main/docs/browser-observation.md

REA can inspect a Chrome-family browser over a **local** debugging port and report scripts, DOM structure, network observations and candidate routes. This step was not executed from the current environment: direct browser network access and a compatible REA CLI runtime are unavailable. Therefore stack attribution remains unverified.

Use a supported Node.js release (as documented by REA), install its CLI and open a **disposable browser profile**. Do not sign in or collect personal data or credentials during competitor benchmarking.

```bash
npm install --global rea-agents
google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/rea-public-benchmark https://www.ahmedproperty.co.uk/
rea list-browser-targets http://127.0.0.1:9222 --json
# Replace TARGET_ID with the matching public page target from the prior result.
rea inspect-web-page http://127.0.0.1:9222 TARGET_ID --observation-ms 1000 --json
rea analyze-web-bundle http://127.0.0.1:9222 TARGET_ID --json
rea capture-web-screenshot http://127.0.0.1:9222 TARGET_ID --json
```

Save only evidence necessary to compare publicly accessible UX: navigation labels, interaction states, script framework hints, screenshot differences at desktop/mobile widths, accessibility names and UX flow. Do not copy code/assets or use a debug port accessible from the Internet. Source maps, exposed library names and client URLs cannot prove a private backend implementation. Report them as observed hints with confidence and limitations.

## Release checklist

1. Run `npm run check` on the feature branch (this runs the existing statement/property tests, TypeScript and production build).
2. Run `npm run lint` and review browser behaviour in mobile/desktop layouts.
3. Test that sample review cannot be confirmed until all five rows are categorised, and that Reset clears all choices.
4. Verify the existing **authenticated** statement importer separately with test data, including finance permission, RLS and manual rent matching.
5. Merge only after code review; deployment to Lovable and live Supabase changes are separate decisions.

## Scope / remaining work

- Benchmarking the exact stack of Ahmed Property needs the above REA capture; we have not asserted React, Next.js, Vercel or Supabase for it.
- Trial lengths, property-based billing and subscriptions are intentionally **not** imitated: they need local commercial decisions and billing validation.
- No production application data, migrations, secrets, environment files or deployment configuration were modified in this feature.
