# Phase 10 release: continuous security analysis

Date: 15 August 2026

## Delivered

- CodeQL JavaScript/TypeScript analysis using the security-extended query suite on pull requests,
  every push to `main` and a weekly schedule.
- Pull-request dependency review that rejects newly introduced high-severity vulnerabilities.
- Least-privilege workflow permissions, concurrency control and bounded job timeouts.
- Regression tests that keep both security gates wired to supported action generations.
- A deterministic package/lockfile integrity check that runs before `npm ci`, repairing the broken
  live-repository dependency contract and preventing silent recurrence.
- Restored clean-build, unreachable-chunk pruning and 500 kB client-bundle enforcement that had
  dropped from `main` despite the Phase 8 release record.
- Correct PWA emission into `.output/public`; `/sw.js` now ships with the deployable artifact and
  precaches only static non-JavaScript assets while authenticated navigation always reaches SSR.

## Verified

- A clean `npm ci` completed from the repaired lockfile.
- 72 automated tests passed across 19 suites; TypeScript and ESLint completed with zero errors.
- All 66 immutable migrations passed integrity, RLS and secure-function checks.
- The production client, SSR, Nitro and PWA build passed; 192 reachable client chunks remain.
- The largest client chunk is 265,254 bytes against the 500,000-byte blocking budget.
- The PWA precache contains 19 static entries and no HTML or JavaScript.
- Production and full dependency audits report zero known vulnerabilities.

## Repository configuration required

Protect `main` and require both the Quality and Security workflows before merge. Review CodeQL
alerts in GitHub's Security tab and assign remediation ownership; a passing workflow is not a
substitute for independent penetration testing or production monitoring.
