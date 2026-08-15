# Phase 7 release: launch evidence and runtime response hardening

Date: 15 August 2026

## Delivered

- Production preflight now blocks sandbox or incomplete live Stripe wiring, missing Price IDs,
  invalid payment tokens/webhook secrets, missing Maps connections, weak referencing secrets,
  placeholder provider values and Supabase service/public key reuse.
- All SSR HTML and catastrophic error responses now override upstream cache headers with
  `private, no-store` and add CSP, HSTS, frame, MIME, referrer, permissions, cross-domain and
  opener-policy controls.
- A read-only production smoke runner verifies the exact immutable release, health response,
  security/cache headers, protected-route redirects, robots declaration and canonical sitemap.
- A manually gated GitHub production-smoke workflow records post-deploy evidence against a supplied
  HTTPS origin and release SHA.
- Quality CI now generates and retains a CycloneDX software bill of materials.
- CI uses the current Node 24-based checkout, setup-node and artifact action generations.
- Known TanStack/shadcn mixed-export modules are explicitly documented in the Fast Refresh lint
  policy; the route error component was separated, leaving ESLint with zero errors and warnings.

## Verified

- 63 tests passed across 18 suites.
- TypeScript and ESLint passed with zero errors and zero warnings.
- Production client, SSR, Nitro and PWA builds passed.
- The live client graph retained 192 reachable chunks and removed 116 orphaned generated chunks.
- Largest production client chunk: 264,907 bytes against a 500,000-byte blocking budget.
- The PWA precache contains only static assets and no authenticated HTML or route JavaScript.
- The generated CycloneDX 1.5 SBOM contains 703 dependency components.

## Deployment boundary

The smoke workflow and stronger preflight make launch evidence repeatable, but they do not replace
hosted database/RLS role tests, real Stripe and email-provider transaction matrices, credential
rotation, monitoring/on-call setup, backup/restore drills, accessibility testing, penetration testing
or UK legal/privacy approval.
