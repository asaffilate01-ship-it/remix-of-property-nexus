
# Implementation plan — gaps + not-started

Scope confirmed: automations runner, notifications/reminders, AI copy, saved-search matcher, vendor portal token route, reports CSV, Stripe rent collection, tenant/landlord portals, messaging. I'll ship in 4 phases so each is testable before moving on.

## Phase 1 — Foundation (this turn)
Highest-leverage backend wiring. No new UI surface, but unlocks every existing feature.

1. **Automations runner**
   - Server route `src/routes/api/public/hooks/run-automations.ts` — apikey-guarded, calls `claim_due_track_steps(25)`, executes each step by `action_type` (send_email, create_task, update_field, wait, webhook), marks `track_run_steps.status` complete/failed.
   - pg_cron every minute → POST to that route.

2. **AI Copy → Lovable AI Gateway**
   - `src/lib/ai-gateway.server.ts` (provider helper).
   - `src/lib/ai-copy.functions.ts` — `generateListingDescription`, `generateEmailDraft`, `generatePropertyBlurb` server fns using `google/gemini-2.5-flash`.
   - Wire existing `ai-copy.tsx` UI to call them via `useServerFn`.

3. **Notifications/reminders**
   - New `alerts` rows already exist; add cron `src/routes/api/public/hooks/scan-expiries.ts` that scans `compliance_records.expires_at`, `referencing_cases.right_to_rent_expires_at`, `tenancies.end_date` for <30 days and inserts dedup alerts.
   - pg_cron daily 06:00 UTC.

## Phase 2 — Quick wins (next turn)
4. **Saved-search matcher** — cron route reads new listings since last run, matches against `saved_searches` criteria, inserts into `saved_search_matches`. Daily at 07:00.
5. **Vendor portal public route** — `src/routes/vendor/$token.tsx` (public, token-gated via `work_order_share_tokens`). Vendor sees work order, can post `work_order_updates` and upload media. No auth required — token is the auth.
6. **Reports CSV export** — `src/lib/reports.functions.ts` returns server-generated CSV blobs; download buttons added to existing reports page.

## Phase 3 — Stripe rent collection (next turn)
7. **Stripe payments** via Lovable's built-in integration.
   - Migration: `rent_invoices` table linked to `rent_schedule`, `stripe_payment_intents`.
   - Server fn `createRentPaymentLink({ rentScheduleId })` → returns Stripe Checkout URL.
   - Webhook `src/routes/api/public/webhooks/stripe.ts` marks paid + creates `bank_transactions` row.
   - "Pay rent" button on tenant tenancy view.

## Phase 4 — Portals + messaging (final turn)
8. **Tenant portal** — `src/routes/_authenticated/portal/tenant/` subtree gated by `has_role(user,'tenant')`. Dashboard shows: their tenancy, upcoming rent, work-order history with "Report issue" form, documents.
9. **Landlord portal** — `src/routes/_authenticated/portal/landlord/` subtree. Dashboard shows: their properties, current tenants, this-month rent collected, open compliance items, statement download.
10. **Messaging** — `messages` + `message_threads` tables, threaded inbox at `/inbox`, send via server fn. No email transport this round — in-app only with realtime via Supabase channels.

## Out of scope (deferred — call out separately if you want them)
- E-sign ceremony with audit trail (kept as-is: simple signature capture)
- Bank-feed import (manual entry only)
- Calendar sync (Google/Outlook)
- Push notifications

## Technical notes (skim)
- All cron jobs use `apikey` header pattern, never custom shared secrets.
- All public routes under `/api/public/*` to bypass published-site auth.
- AI calls server-only via `createServerFn`, never expose `LOVABLE_API_KEY`.
- Stripe: use `payments--enable_stripe_payments` (Lovable built-in), not BYOK.
- Messaging realtime: subscribe on browser client only.
- Every new table follows: CREATE → GRANT → RLS → POLICY in one migration.

Confirm and I'll start Phase 1 immediately.
