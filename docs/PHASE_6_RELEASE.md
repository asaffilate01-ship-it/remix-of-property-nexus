# Phase 6 release: framework and delivery hardening

Date: 15 August 2026

## Delivered

- Migrated all 93 TanStack server-function declarations from deprecated `inputValidator` calls
  to the supported `validator` API.
- Upgraded Recharts from the end-of-life 2.x line to 3.8.1 and aligned `react-is` with React 19.2.
- Updated the shared chart wrapper for Recharts 3 tooltip, legend and data-key types.
- Split the browser shell into execution-order-safe React, TanStack, data and UI dependency groups.
- Added production build pruning based on the live TanStack server/client module graph.
- Added a 500 kB uncompressed client-chunk budget. The largest production client chunk is now
  264,888 bytes, down from 729,195 bytes.
- Restricted PWA generation to the client environment and added final-artifact checks that reject
  cached SSR navigation fallbacks, precached HTML/route JavaScript and an invalid app manifest.
- Expanded the regression suite to cover deprecated framework APIs, chart/runtime compatibility,
  build verification and the declared npm toolchain.

## Verified

- 52 tests passed.
- TypeScript passed with no errors.
- ESLint passed with no errors and eight existing Fast Refresh development warnings.
- Production client, SSR, Nitro and PWA builds passed.
- PWA precache contains 23 static entries and no route JavaScript or HTML.
- Production dependency audit reports zero vulnerabilities.

## Deployment boundary

This phase improves repository-enforced readiness. Hosted Supabase migration/RLS checks, credential
rotation, provider sandbox tests, monitoring, accessibility QA, penetration testing and legal/privacy
review remain external launch evidence and are tracked in `PRODUCTION_READINESS.md`.
