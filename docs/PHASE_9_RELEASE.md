# Phase 9 release: UK GDPR privacy operations

Date: 15 August 2026

## Delivered

- A Privacy & data settings area for access, portability, erasure, restriction and objection
  requests.
- One active request per user/type, a one-month target, safe withdrawal rules and visible request
  history.
- A dedicated RLS-protected request table plus append-only status events.
- A platform privacy queue restricted by database policy and server verification to explicitly
  authorised administrators with an MFA (`aal2`) session.
- Mandatory response summaries for completed or refused requests.
- Updated public privacy wording and an operational runbook for identity checks, lawful retention,
  export, erasure, session revocation and staging drills.

## Deployment boundary

The workflow records and governs requests but deliberately does not perform instant account
deletion. The operator must approve a retention schedule, apply the migration, train the privacy
team and complete staged access/export and erasure drills before launch.
