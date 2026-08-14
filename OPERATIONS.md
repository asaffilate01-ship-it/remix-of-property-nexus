# Estately operations runbook

## Deployment order

1. Rotate any credential that has ever been committed and configure the values from `.env.example`
   in the hosting provider. Never re-add runtime `.env` files to Git.
2. Back up the database and reconcile the hosted Supabase migration ledger before applying new
   migrations. Apply `20260814090000_email_delivery_worker.sql`, then
   `20260814110000_email_delivery_events.sql`, then
   `20260814210000_admin_mfa_hardening.sql` before deploying this release.
3. Set `PUBLIC_RELEASE_SHA` to the immutable Git commit being deployed.
4. Run `npm ci`, `npm run check`, the high-severity production audit, and
   `npm run launch:preflight` in the release environment.
5. Deploy, then verify `GET /api/public/health` returns the expected release SHA and security
   headers. Complete the role/RLS smoke-test matrix and a sandbox payment test before promotion.

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

| Schedule | Endpoint | Purpose |
| --- | --- | --- |
| Every minute | `POST /api/public/hooks/process-email-outbox` | Claims, sends and retries transactional email |
| Every five minutes | `POST /api/public/hooks/match-saved-searches` | Records property matches and queues due digests |
| Every minute | `POST /api/public/hooks/process-tracks` | Runs due workflow steps |
| Daily at 07:00 UTC | `POST /api/public/hooks/expiry-reminders` | Queues contract and tenancy reminders |

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
