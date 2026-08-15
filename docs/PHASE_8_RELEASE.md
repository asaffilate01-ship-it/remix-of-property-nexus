# Phase 8 release: repository recovery and migration integrity

Date: 15 August 2026

## Source baseline

Phase 8 is based on GitHub `main` commit `078d1cb`, preserving its repeated-request-abort
handling while restoring production gates that had been dropped from the live repository.

## Delivered

- Repaired the npm dependency contract: `package.json` and `package-lock.json` are synchronised,
  npm 11.9.0 is declared, and clean `npm ci` installation works again.
- Restored the missing `check`, test, typecheck, preflight and verified production-build commands.
- Restored clean-build, unreachable-chunk pruning, 500 kB client budget and auth-safe PWA
  verification.
- Restored current GitHub Action generations, CycloneDX SBOM retention and the manually gated
  production smoke workflow.
- Removed tracked runtime environment files from the release tree; values that appeared in Git
  history still require rotation.
- Added a deterministic SHA-256 manifest for all 65 Supabase migrations.
- Added CI-blocking migration checks for immutable history, unique ordering/content, public-table
  RLS coverage, safe SECURITY DEFINER search paths, RLS disablement and PUBLIC grants.
- Added a database release runbook covering review, staging, RLS role evidence, backups and
  incident handling.

## Verified

- Clean npm install succeeded from the synchronised lockfile.
- 68 tests passed across 19 suites.
- TypeScript and ESLint passed with zero errors and zero warnings.
- Migration integrity verification passed for all 65 SQL files.
- The production dependency audit reports zero vulnerabilities after lockfile-only remediation.
- Production client, SSR, Nitro and PWA builds passed; 192 reachable client chunks remain.
- Largest client chunk: 265,057 bytes against the 500,000-byte blocking budget.
- The PWA precache contains 18 static entries and no HTML or route JavaScript.
- The CycloneDX SBOM contains 702 dependency components.

## Deployment boundary

The manifest proves repository integrity, not hosted database state. Production release still
requires a hosted-ledger comparison, real multi-role RLS tests, backup/restore evidence, credential
rotation, provider transaction tests, monitoring, accessibility, penetration testing and UK
legal/privacy approval.
