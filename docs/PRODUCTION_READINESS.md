# Estately production-readiness record

Updated: 14 August 2026

“100% production ready” cannot be established by a source-code build alone. This document
separates code gates that are enforced in the repository from deployment, provider and
assurance work that must be completed in the target environment.

## Enforced code gates

- Clean dependency installation with `npm ci`.
- Automated tests, TypeScript, ESLint and the production client/server/PWA build through
  `npm run check`.
- High-severity production dependency audit in GitHub Actions.
- Tracked runtime `.env` files removed and ignored; `.env.example` contains placeholders only.
- Shared-password demo-user creation endpoint removed; demo bank feed disabled by default.
- Public lead intake uses validated, rate-limited server functions. Anonymous direct database
  lead inserts are revoked by migration.
- Public AVM, nearby-place, AI-copy and signing endpoints are bounded and rate-limited.
- External database URLs are restricted to HTTP(S); open redirects, executable URL schemes and
  unsafe map-info HTML are blocked.
- Stripe webhook signatures, age and event shape are tested. Cron and automation endpoints fail
  closed without configured secrets/allowlists.
- Security headers include CSP, HSTS, clickjacking protection, MIME sniffing protection,
  referrer policy and permissions policy.
- Authenticated HTML is not cached by the PWA service worker.
- Bank matching is agency-scoped and atomic. Automatic matching now requires a unique amount
  plus a strong tenant/schedule reference; ambiguous credits remain for manual review.
- Contact and valuation forms use real database columns and report honest failure states.
- Dashboards use real counts for viewings, offers, inspections, repairs, saved searches,
  shortlists and unread user alerts.
- E-signing has a real request-creation flow, secure expiring capability links and signer status;
  signing requests are queued for email and only become “Sent” after provider acceptance.
- Transactional email uses atomic queue claiming, provider idempotency, safe server-rendered
  templates, bounded requests, exponential retry and a visible failed state.
- Signed Resend webhooks are size-bounded, schema-validated and idempotent; bounce, complaint and
  suppression events stop future sends without storing plaintext recipient addresses in event logs.
- Saved-search digests honour daily/weekly worker gates and queue real emails; the historical
  `instant` option is accurately described as delivery on the next worker run.
- A no-store health endpoint exposes the immutable release SHA, and production preflight validates
  core configuration without printing secret values.
- Canonical, Open Graph, structured-data, robots and sitemap URLs share one validated HTTPS origin;
  preview domains no longer leak into production metadata.
- Location landing pages report the true database result count, label sample-based price statistics
  honestly and limit repetitive cross-links to nearby/regional destinations.
- Public sign-up metadata is constrained to non-privileged roles; malformed roles fall back safely
  instead of failing account creation or granting platform access.
- Profile writes are column-scoped so users cannot edit or recreate their authorization-bearing
  primary role through the public database API.
- Platform-admin RLS access requires both explicit service-role authorization and an MFA-verified
  `aal2` session. The application includes TOTP enrollment, challenge and settings flows.
- Authenticated server functions now use the documented public Supabase key fallback, preventing a
  deployment-only failure caused by an undocumented duplicate environment variable.

## UI and flow changes

- Role-specific desktop and mobile navigation now points to the correct home and workflow pages.
- Bank reconciliation is reachable from relevant agent/landlord menus and the command palette.
- Active destinations expose `aria-current`; the public mobile menu has an accessible title.
- Duplicate public-menu destinations were removed.
- Cards, tabs and page headers use consistent radii, borders, spacing, touch targets, mobile
  wrapping and horizontal tab overflow.
- Saved-search email/push controls and “instant alert” claims were removed until a delivery
  service actually exists.
- The valuation page no longer manufactures a price or unsupported accuracy percentage.

## OWASP Top 10 coverage

| Area | Current controls | Required launch evidence |
| --- | --- | --- |
| Broken access control | Supabase RLS, agency membership checks, constrained signup roles, explicit platform-admin authorization, atomic bank-match authorisation | Test every role against a migrated staging database |
| Cryptographic failures | TLS/HSTS, server-only secrets, signed Stripe webhooks, random signing tokens | Rotate keys exposed in Git history; verify provider key scopes |
| Injection | Zod validation, parameterised Supabase queries, safe DOM construction, HTTP(S)-only URL handling | Independent DAST and penetration test |
| Insecure design | Fail-closed AVM, conservative bank reconciliation, idempotent payment processing | Threat-model workshop for payments, signing and document access |
| Security misconfiguration | CSP and browser headers, ignored env files, CI dependency audit | Verify production headers, CORS, Supabase Auth URLs and storage policies |
| Vulnerable components | Lockfile, clean `npm ci`, audit gate | Dependabot/Renovate and monthly upgrade ownership |
| Authentication failures | Supabase Auth, safe redirects, invitation tokens, mandatory admin TOTP/AAL2, no demo password endpoint | Password and account recovery tests in production Auth tenant |
| Integrity failures | Webhook HMAC validation, event idempotency, locked install | Protect `main`, require CI/review and sign releases |
| Logging/monitoring failures | Structured server errors and webhook records | Configure Sentry/log drain, alerts, retention and incident runbook |
| SSRF | HTTPS/allowlisted automation endpoints and HTTPS-only AVM endpoint | Egress controls at the hosting layer |

## External launch blockers

These cannot be completed safely from the repository alone:

1. Rotate every Supabase, Google Maps, Stripe and Lovable/provider credential that ever appeared
   in Git history. Removing `.env` from the current tree does not erase history.
2. Reconcile the three duplicated historical Supabase migrations against the hosted migration
   ledger, then apply `20260813223000_lock_down_public_leads.sql` and
   `20260813224500_atomic_bank_matching.sql`, followed by the email-delivery migrations and
   `20260814210000_admin_mfa_hardening.sql`, in staging and production.
3. Regenerate Supabase TypeScript types after migrations; run the role/RLS test matrix using
   real tenant, landlord, agent, contractor, buyer, conveyancer and admin accounts. Review every
   historical admin assignment and explicitly authorize only verified platform operators.
4. Configure and test sandbox Stripe subscription, customer-portal and rent-payment flows before
   enabling live Price IDs and webhook secrets.
5. Configure a real AVM adapter. Without it the valuation flow deliberately offers a manual
   appraisal and shows no invented estimate.
6. Integrate a regulated bank-feed provider/import job. The reconciliation screen works with
   imported credits; the demo feed remains off in production.
7. Verify the transactional-email sender domain, sending-only provider key, scheduled worker and
   signed Resend webhook in production; test bounce, complaint and suppression events end to end.
   Web Push still requires a subscription/VAPID implementation as a separate phase.
8. The product UI is currently English-only. Internationalisation needs message extraction,
   locale routing, translated legal/product copy, plural/date/currency rules and linguistic QA;
   the planned “Multi-language” add-on is explicitly marked as roadmap-only.
9. Complete accessibility testing with keyboard, screen reader, zoom and colour-contrast checks;
   complete independent penetration testing and UK legal/privacy review.
10. Configure monitoring, backups, recovery drills, data retention/deletion, support ownership,
    uptime checks and a rollback-tested deployment pipeline.

## Release command

```sh
npm ci
npm run check
npm audit --omit=dev --audit-level=high
npm run launch:preflight
```

Release only when those commands pass and every applicable external blocker above has recorded
evidence and an owner.
