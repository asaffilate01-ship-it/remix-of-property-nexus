# Estately operations runbook

## Deployment order

1. Rotate any credential that has ever been committed and configure the values from `.env.example`
   in the hosting provider. Never re-add runtime `.env` files to Git.
2. Back up the database and reconcile the hosted Supabase migration ledger before applying new
   migrations. Apply `20260814090000_email_delivery_worker.sql`, then
   `20260814110000_email_delivery_events.sql`, then
   `20260814203243_7a63a560-48cb-492c-8edd-192116675765.sql` before deploying this release.
3. Set `PUBLIC_RELEASE_SHA` to the immutable Git commit being deployed.
4. Use npm (the repository intentionally has one lockfile). Run `npm ci`, `npm run check`, the
   high-severity production audit, and
   `npm run launch:preflight` in the release environment.
5. Deploy, then verify `GET /api/public/health` returns the expected release SHA and security
   headers. Run the GitHub `Production smoke` workflow with the exact HTTPS origin and deployed
   release SHA. Complete the role/RLS smoke-test matrix and a sandbox payment test before promotion.

## Automated production smoke evidence

The read-only smoke command verifies the immutable health release, no-store policy, browser security
headers, safe protected-route behavior, robots discovery and canonical sitemap. It never submits a
form, creates data or prints a credential.

Run it locally or through the manually gated `Production smoke` GitHub workflow:

```sh
SMOKE_BASE_URL=https://app.estately.co.uk \
SMOKE_EXPECTED_RELEASE_SHA=YOUR_DEPLOYED_COMMIT \
npm run smoke:production
```

Use an origin only: no path, query string, credentials or non-HTTPS URL. Preserve the successful
workflow run with the release record. The quality workflow also retains a CycloneDX dependency SBOM
for 30 days; retain the promoted release's SBOM with the longer-lived release evidence.
The Security workflow runs CodeQL on pull requests, `main` and weekly, and blocks pull requests that
introduce high-severity vulnerable dependencies. Protect `main` so Quality and Security are required
checks before merge.

## Privacy rights operations

Apply `20260815203000_privacy_rights_requests.sql` before enabling the Privacy & data settings tab.
Users can submit and track access, portability, erasure, restriction and objection requests. An
active request of the same type cannot be duplicated, and users may withdraw only requests that
have not entered processing.

The operations queue is visible only to an explicitly authorised platform administrator using an
MFA-verified session. Before moving a request to `in_progress`, verify the requester's identity
using an approved out-of-band procedure and record the verification evidence in the case-management
ticket. Do not copy identity documents into the response summary.

Review each request against tenancy, payment, tax, fraud-prevention and legal-hold duties. A
completed or refused request requires a plain-language response summary. Complete the request by
its one-month target unless a documented lawful extension applies. Preserve the append-only
`privacy_request_events` history with the release and support evidence.

For erasure, export the eligible data first, remove only data approved by the retention schedule,
revoke active sessions and confirm any retained categories and expiry dates to the requester. Test
one access/export and one erasure request end to end in staging before launch.

## Platform administrator provisioning

Public sign-up metadata can only select non-privileged product roles. Platform administrators are
fail-closed: an `admin` role alone is insufficient. The account must also have an active row in
`platform_admin_authorizations` and use an MFA-verified (`aal2`) session.

After independently verifying the operator and confirming they have enrolled a TOTP factor, use
the Supabase SQL editor or another service-role-only process to provision access. Never expose this
operation through a browser or ordinary authenticated RPC:

```sql
begin;
insert into public.user_roles (user_id, role)
values ('OPERATOR_USER_UUID', 'admin')
on conflict (user_id, role) do nothing;

update public.profiles
set primary_role = 'admin'
where id = 'OPERATOR_USER_UUID';

insert into public.platform_admin_authorizations (user_id, authorized_by, reason)
values ('OPERATOR_USER_UUID', 'AUTHORIZER_USER_UUID', 'Identity and employment verified')
on conflict (user_id) do update
set authorized_by = excluded.authorized_by,
    reason = excluded.reason,
    authorized_at = now(),
    revoked_at = null;
commit;
```

For the first platform administrator only, `authorized_by` may be `NULL` when no previously
verified operator exists. Record the bootstrap approver and ticket in `reason`, then require a
second operator to review the row as soon as they are provisioned.

Revoke immediately with `UPDATE public.platform_admin_authorizations SET revoked_at = now()
WHERE user_id = 'OPERATOR_USER_UUID';`, then revoke active Auth sessions from the Supabase admin
console. Review every historical `user_roles.role = 'admin'` row before granting an authorization;
the migration intentionally does not trust or backfill historical admin assignments.

## Scheduled workers

Send either `Authorization: Bearer <CRON_SECRET>` or `X-Cron-Secret: <CRON_SECRET>` with every
request. The endpoints fail closed when the secret is absent.

| Schedule           | Endpoint                                      | Purpose                                         |
| ------------------ | --------------------------------------------- | ----------------------------------------------- |
| Every minute       | `POST /api/public/hooks/process-email-outbox` | Claims, sends and retries transactional email   |
| Every five minutes | `POST /api/public/hooks/match-saved-searches` | Records property matches and queues due digests |
| Every minute       | `POST /api/public/hooks/process-tracks`       | Runs due workflow steps                         |
| Daily at 07:00 UTC | `POST /api/public/hooks/expiry-reminders`     | Queues contract and tenancy reminders           |

The saved-search value historically named `instant` means “on the next worker run”; with the
recommended schedule its delivery target is within five minutes, not real-time.

## Email delivery

Use a Resend sending-only API key and a verified sender domain. The worker claims rows with
database locks, uses a stable provider idempotency key, times out provider calls, retries transient
errors with exponential backoff, and moves permanent or fifth-attempt failures to `failed`.

Review failed rows from the admin email outbox. After correcting a provider or recipient issue,
an authorised operator may set a specific row back to `queued`, clear `error`, and set
`next_attempt_at = now()`. Never bulk-requeue without checking whether the provider accepted the
original request; provider idempotency lasts for a limited window.

Configure a Resend webhook at `POST /api/public/webhooks/resend` with the exact
`RESEND_WEBHOOK_SECRET`. Subscribe to sent, delivered, delivery-delayed, bounced, complained,
suppressed, failed, opened and clicked events. The endpoint verifies the raw signed payload,
deduplicates on the Svix event ID and records only a recipient hash plus a masked address.

Bounce, complaint and provider-suppression events add the recipient to the local suppression list.
The worker checks that list before every send and fails closed if the check is unavailable. Review
suppressed rows rather than manually retrying them; only remove a suppression after the recipient
or provider has resolved the underlying issue. A queued or provider-accepted message is not proof
that the recipient read it.

## Canonical URLs and indexing

Set `APP_URL` and `VITE_SITE_URL` to the same HTTPS origin. The first drives server-generated
robots and sitemap responses; the second drives page canonical, Open Graph and structured-data
URLs. Verify `/robots.txt`, `/sitemap.xml` and a sample of listing, agency and location pages after
every domain change.

## Rollback and recovery

- Keep the previous immutable application release available for one-click rollback.
- Prefer forward database fixes. Do not reverse a migration that may already contain production data.
- After rollback, keep the email worker disabled if its code is older than the applied outbox schema.
- Verify point-in-time database recovery and storage backup restoration on a scheduled cadence.
- Record the release SHA, migration ledger, smoke-test evidence, operator and rollback result for
  every production promotion.
