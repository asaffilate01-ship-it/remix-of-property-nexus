# Database release runbook

The Supabase migration directory is append-only. Applied SQL must never be edited, renamed,
reordered or deleted: `supabase/migration-manifest.json` pins every migration by filename and
SHA-256 digest.

## Add a migration

1. Create one new file in `supabase/migrations` using a unique UTC timestamp:
   `YYYYMMDDHHMMSS_description.sql`.
2. Make the migration forward-only and safe to retry where practical. Do not disable RLS or grant
   privileges to the PostgreSQL `PUBLIC` role.
3. Every new `public` table must enable row-level security. Add least-privilege policies for each
   application role that needs access.
4. Every `SECURITY DEFINER` function must set an explicit `search_path` and schema-qualify
   sensitive objects.
5. Run `npm run migrations:verify`. It should fail only because the new migration is not yet in
   the integrity manifest.
6. Review the SQL, then run `npm run migrations:manifest`. In the manifest diff, expect one new
   entry and no changed or removed hashes.
7. Run `npm run check` and obtain code-owner review for the SQL and manifest together.

Never use the manifest writer to legitimise an unexplained hash change. Restore the applied file
and put the correction in a new migration.

## Stage the release

1. Record the current hosted migration ledger, database version and backup identifier.
2. Compare the hosted ledger to all manifest entries that precede the new migration. Stop on any
   missing, extra, reordered or checksum-mismatched migration.
3. Take or verify a restorable backup and document the recovery point objective.
4. Apply the migration to a production-shaped staging project.
5. Test RLS using separate tenant, landlord, agent, contractor, buyer, conveyancer and
   platform-admin accounts. Include cross-agency record IDs and unauthenticated requests.
6. Exercise affected Stripe, email, document, signing and automation paths as applicable.
7. Capture query plans and lock duration for table rewrites, index builds and large updates.

## Production evidence

Record the release SHA, migration filename/hash, operator, start/end time, hosted ledger output,
backup ID, role/RLS matrix, provider tests and rollback decision. Run the production smoke workflow
against the exact deployed release after the application rollout.

For a failed forward-only migration, stop writers if data integrity is at risk, restore only under
the approved recovery procedure, and ship remediation as a new timestamped migration. Do not alter
the historical file to make local state appear consistent.
