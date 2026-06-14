# Contracts, E-signature, Holiday Gantt & Expiry Alerts

## 1. Seed contract templates (DB)
Insert 8 system templates into `templates` with full UK-compliant body, fields and signer roles:
1. **AST – Full property** (Assured Shorthold Tenancy, England & Wales)
2. **HMO – Joint AST** (multiple tenants jointly liable)
3. **HMO – Room-only licence**
4. **Holiday let agreement** (short-term, dated booking)
5. **Seller MoU** (memorandum of sale + commission %)
6. **Sales agency agreement** (sole / multi-agency, fees, term)
7. **Maintenance / contractor agreement** (scope, rates, insurance)
8. **3rd-party services contract** (cleaning / gardening / generic)

Each template's `fields` JSON declares which system entities auto-fill it (property, landlord, tenant(s)/buyer/seller, agency, booking).

## 2. Auto-fill from system data
In the template "Generate" dialog, pick **property / tenancy / contact / booking**. The server fn `prepareTemplateValues` queries all related rows and returns a merged values object (landlord name from `agencies`/`profiles`, tenant bio from `tenants`, property address from `properties`, rent from `tenancies`, dates from `holiday_bookings`, etc.). User can override before generating.

## 3. Built-in e-signature
New table `template_signatures` (id, instance_id, signer_role, signer_name, signer_email, signed_at, ip, user_agent, signature_png_path, status).

Flow:
- Generate instance → status `sent`, create one signature row per signer (token-based).
- Public route `/sign/$token` shows contract preview, draw/type signature, captures IP+UA, stores PNG in `documents` bucket.
- When all signers signed → instance status `signed`, server fn renders final PDF (text + embedded signatures) into `documents` bucket, creates a `documents` row (scope = relevant entity) with `expires_on` from the instance.

## 4. Expiry & alerts
- Add `expires_on` + `reminder_days int[] default '{30,14,7,1}'` to `template_instances`.
- New view-style server fn `listExpiries` unions: `template_instances.expires_on`, `documents.expires_on`, `compliance_records.expires_on`, `tenancies.end_date`. Powers a new **`/alerts`** page (inbox-style) and a dashboard widget.
- Cron job `/api/public/hooks/expiry-reminders` runs daily; for each item due in 30/14/7/1 day, enqueues an email via Lovable Emails (deduped by `email_send_log.message_id`).

## 5. Holiday-let Gantt
New tables:
- `holiday_bookings` (property_id, guest_name, guest_email, check_in, check_out, nightly_rate, total, status, source, notes, agency_id).
- `property_blocks` (property_id, kind: owner/maintenance, start, end, notes).
- Extend existing `cleaning_jobs` with `booking_id` FK; auto-create a cleaning job on booking insert (trigger) for the morning after checkout.

New route **`/holiday-lets`**:
- Multi-property stacked Gantt (one row per property, coloured bars: booking=blue, cleaning=green, owner-block=amber, maintenance=red).
- Drag to reschedule (updates dates), click to edit, "New booking" dialog with overlap validation.
- Lightweight pure-CSS timeline (no new dep): horizontal scroll, day columns, absolute-positioned bars.

## 6. UI changes
- `templates.tsx` — generate dialog gains entity-picker + auto-fill button, signer email inputs, expiry date.
- New `/sign/$token` (public, unauth).
- New `/_authenticated/holiday-lets`.
- New `/_authenticated/alerts`.
- Sidebar: add "Holiday lets" under Operations, "Alerts" under top section.
- Dashboard: small expiry widget (count by bucket).

## 7. Email infra
Use existing Lovable Emails (already set up per instructions). Reminder route enqueues to `transactional_emails` queue via `enqueue_email` RPC. Templates: `contract-expiry-reminder`, `signature-request`.

## Order
1. Migration: new tables, columns, seeds, GRANTs, RLS, triggers.
2. Server fns: `signing.functions.ts`, `holiday.functions.ts`, `alerts.functions.ts`, extend `persistence.functions.ts` with `prepareTemplateValues`.
3. UI: rewrite templates dialog, create sign/holiday/alerts routes, sidebar + dashboard widget.
4. Cron route + pg_cron schedule.
5. Verify build.

## Out of scope
- DocuSign (built-in only).
- SMS reminders.
- iCal sync for bookings (future).
- Drag-to-resize on Gantt (drag-to-move only).
