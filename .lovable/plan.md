# Persistence Audit & Migration Plan

Goal: every entity in the app reads/writes Lovable Cloud (Postgres + Storage), with RLS, and pages work together via real foreign keys.

## What already persists (no work needed)
Properties, listings, tenancies, rooms, contacts, leads, offers, deals, sales_deals, viewings, work_orders, compliance_records, documents (+ storage), job_media, survey_captures, saved_searches, saved_listings, agencies, branches, agency_members, rent_schedule, bank_transactions, profiles, user_roles, referencing_cases.

## What's currently mock / not persistent (will fix)
1. **Templates** (`templates.tsx`) — entire `TEMPLATES` array hard-coded; no instances saved when "sent". Needs `templates` + `template_instances` tables, seed the system templates, and wire generate/sign flow.
2. **Buyers & Sellers** — currently inferred from `contacts.kind` strings and `sales_deals` columns. Promote to first-class with `buyer_profiles` and `seller_profiles` linked to `contacts` + `properties` + `sales_deals`.
3. **Property types taxonomy** — `properties.property_type` / `listings.property_type` are free strings. Add `property_types` lookup with seed data, keep text column but validated against lookup.
4. **Tenants as first-class** — today `tenancies.tenant_name` is a string with optional `tenant_user_id`. Add a real `tenants` table (linkable to a user) and use it from `tenancies.tenant_id`.
5. **Photo persistence audit** — confirm `listing-photos`, `job-media`, `survey-media` buckets are wired everywhere (listings editor, work orders, inspections, captures). Replace any in-memory previews with uploads.
6. **Inspections** — verify rooms/captures persist (already partly wired via survey).
7. **Saved searches alert toggle** (route `saved-searches.tsx`) — uses local state, no DB flag.
8. **Cookie banner / branch switcher** — `localStorage` only; that's correct (UI prefs), leave alone.

## Schema migration (one big migration)
- **property_types** (lookup): code, label, category (residential/commercial/land), order. Seed ~30 UK types.
- **tenants**: id, full_name, email, phone, user_id (nullable FK to auth.users), agency_id, dob, notes. Backfill from `tenancies.tenant_name`.
- **buyer_profiles**: id, contact_id, agency_id, budget_min, budget_max, areas[], property_types[], bedrooms_min, finance_status (cash/mortgage/aip), chain_status, notes.
- **seller_profiles**: id, contact_id, property_id, agency_id, asking_price, reason, target_completion, chain_status, notes.
- **templates**: id, code (unique), name, category, jurisdiction, authority, description, body_md, fields jsonb, signers text[], pages int, is_system bool, agency_id (null = system), version int, active bool.
- **template_instances**: id, template_id, agency_id, property_id, tenancy_id, deal_id, recipient_contact_ids uuid[], values jsonb, status (draft/sent/signed/void), pdf_storage_path, created_by, sent_at, signed_at.
- Add FKs: `tenancies.tenant_id -> tenants.id` (keep `tenant_name` for back-compat), `properties.property_type_code -> property_types.code`, `listings.property_type_code -> property_types.code`.
- GRANTs + RLS for every new table (authenticated owner/agency scoped, service_role full).
- Seed: property_types, system templates (AST, Section 21, Section 8, Deposit prescribed info, Right to Rent check, Sales memo of sale, Inventory, Gas Safety reminder, EPC request, Maintenance work order, Offer letter, Completion statement, ~15 total).

## Code changes
- New server fns: `src/lib/templates.functions.ts`, `src/lib/tenants.functions.ts`, `src/lib/buyers-sellers.functions.ts`, `src/lib/property-types.functions.ts`.
- Rewrite `routes/_authenticated/templates.tsx` to read from DB, allow agency-scoped clones, render send dialog that creates a `template_instances` row + PDF in `documents` bucket.
- Rewrite `routes/_authenticated/contacts.tsx` to show buyer/seller tabs sourced from new tables.
- Add `routes/_authenticated/buyers.tsx` and `sellers.tsx` (lightweight CRUD).
- Update property/listing forms to use `property_types` select.
- Update `tenancies` create/edit dialog (`AddTenancyDialog.tsx`) to pick/create a `tenants` row instead of free-text name.
- `saved-searches.tsx`: persist `alerts_enabled` toggle to DB column (already exists as `notify_email` — just wire it).

## Out of scope (this turn)
- Custom template editor UI (just CRUD for now, body_md is editable textarea).
- E-sign provider integration (status flow only; PDF stored in documents).
- Multi-currency.

## Order of execution
1. Run schema migration (creates tables, GRANTs, RLS, seeds).
2. After approval & types regen, add server fns.
3. Rewrite pages (templates, contacts, tenancies dialog, listings/property forms, add buyers/sellers routes).
4. Verify build + spot-check pages.

## Technical details
- Use `is_agency_member(agency_id, auth.uid())` for RLS scoping on new agency-owned tables.
- System templates: `is_system = true AND agency_id IS NULL`, readable by all authenticated users; agency clones are writable by agency members only.
- `tenant_id` on `tenancies` nullable initially; backfill creates a tenant per existing tenancy where `tenant_name` non-null.
- Keep existing `tenant_name` column to avoid breaking the many places it's read; new code writes both.
