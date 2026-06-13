## P1 Phase Plan — Power Features

Billing is parked. Four feature areas, sequenced for safe delivery. Each ships UI + minimal backend so it works end-to-end with seeded data.

---

### 1. Saved searches + alerts + draw-on-map polygon search

What you'll see:
- Marketplace gets a list ↔ map toggle. Map shows listing pins (Google Maps). A "Draw area" button lets buyers lasso a polygon; results filter to listings inside it.
- "Save this search" on the marketplace persists to the database (not localStorage). Logged-out users get an inline "Sign in to save" CTA.
- `/saved-searches` lists DB-backed searches per user with email/push toggles and instant/daily/weekly frequency.
- A scheduled job (pg_cron + `/api/public/hooks/match-saved-searches`) finds new matching listings and queues alerts; daily/weekly digests batched. Email send uses Lovable AI Gateway template + transactional email infra (existing).

Backend:
- New table `saved_searches` (user_id, name, criteria jsonb, polygon jsonb, alert_email bool, alert_push bool, frequency enum, last_notified_at).
- New table `saved_search_matches` (saved_search_id, listing_id, notified_at) — idempotency.
- Server fns: `listSavedSearches`, `saveSearch`, `deleteSavedSearch`, `updateAlertSettings`.
- Public route `/api/public/hooks/match-saved-searches` (apikey-guarded) for pg_cron.

---

### 2. Tenant referencing flow (Goodlord-style) + open-banking arrears auto-reconcile

What you'll see:
- `/referencing` rebuilt as multi-step wizard: ID upload → employment → income → previous landlord → credit consent → review. Persists per applicant.
- Agent view `/_authenticated/referencing-cases` (new): kanban of pending/in-review/approved/declined, document viewer, decision notes.
- `/_authenticated/arrears` gets an "Auto-reconcile" panel: connect a sandbox open-banking source, view recent inbound payments, auto-match to `rent_schedule` by amount + reference, mark paid.

Backend:
- Table `referencing_cases` (tenant_id, status, applicant jsonb, employment jsonb, income_monthly, credit_consent, decision, decided_at, notes).
- Table `referencing_documents` (case_id, doc_type, storage_path).
- Storage bucket `referencing-docs` (private; RLS to tenant + agency members).
- Table `bank_transactions` (agency_id, posted_at, amount, reference, raw jsonb, matched_rent_schedule_id) — seeded with realistic mock feed; real OB integration is stubbed behind a "Connect bank" button.
- Server fns: `submitReferencingStep`, `decideReferencing`, `reconcileTransactions`.

---

### 3. AI listing description generator + 360° tour / floorplan upload

What you'll see:
- `/_authenticated/ai-copy` upgraded: pick a listing, photos + facts auto-fill, "Generate" calls Lovable AI Gateway (Gemini 3 flash) and streams 4 outputs (short summary, full description, 5 bullet highlights, social caption). One-click apply to listing.
- Listing edit drawer gets new tabs: **Floorplan** (PDF/PNG upload, preview) and **360° tour** (URL to Matterport/Kuula/Cupix + uploaded equirectangular JPG, simple `pannellum` viewer on listing detail page).
- Public `/marketplace/$slug` shows floorplan thumbnail and "Take 360° tour" button when present.

Backend:
- Columns added to `listings`: `floorplan_url text`, `tour_url text`, `tour_image_path text`, `ai_copy_short text`, `ai_copy_long text`, `ai_copy_highlights jsonb`, `ai_copy_caption text`, `ai_copy_generated_at timestamptz`.
- Storage buckets `listing-floorplans`, `listing-tours` (public read, agency-write RLS).
- Server fn `generateListingCopy(listingId)` — uses LOVABLE_API_KEY, returns structured output.
- Server fn `saveListingAssets(listingId, floorplan_url?, tour_url?, tour_image_path?)`.

---

### 4. Vendor login portal + branch switcher + role permissions matrix

What you'll see:
- `/_authenticated/vendor-portal` rebuilt for sellers: list of their sales deals, timeline (memo of sale → searches → enquiries → mortgage offer → exchange → completion), chain visualisation, messages to agent, document downloads.
- `BranchSwitcher` (currently a stub) becomes a working header dropdown for users with multiple branches; selection persisted in localStorage + applied as a filter context across listings/leads/pipeline.
- `/_authenticated/settings` gets a **Roles & permissions** matrix: rows = roles (owner, manager, agent, accounts, viewer), columns = capabilities (manage listings, view financials, edit compliance, invite users, manage branches). Owner-only edit.

Backend:
- Table `branches` (agency_id, name, address, postcode, is_primary).
- Table `agency_member_branches` (member_id, branch_id) — many-to-many.
- Column on `listings`, `leads`, `properties`, `sales_deals`: `branch_id` (nullable, backfilled to agency primary).
- Table `role_permissions` (agency_id, role text, capability text, allowed bool); seeded defaults.
- `has_capability(_user, _agency, _capability)` security-definer function for RLS gates.
- Server fns: `listBranches`, `saveBranch`, `assignMemberToBranches`, `updatePermission`, `listMyVendorDeals`, `messageAgent`.

---

### Execution order

1. Branches + role permissions schema (foundation for the rest).
2. Saved searches schema + cron hook.
3. Referencing + bank reconciliation schema.
4. Listing assets + AI copy schema.
5. UI for each, in the same order, behind the existing routes.
6. Smoke-test in preview after every chunk.

### Technical notes

- Maps: Google Maps Platform connector (`VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY`) for marketplace map + polygon draw. Geocoding via gateway.
- AI: Lovable AI Gateway, `google/gemini-3-flash-preview`, structured output for listing copy.
- 360° viewer: `pannellum` (CDN script) — lightweight, no native deps.
- Open banking: stubbed feed table with realistic mock data; integration point clearly marked so a real provider (Plaid/TrueLayer) can be slotted in later via connector.
- Every new public table follows the GRANT → RLS → POLICY pattern.

### Out of scope (next pass)

- Real Plaid/TrueLayer integration (kept as stub).
- Stripe billing for per-branch subscriptions (parked at user request).
- Mobile inspection offline-first app.
- White-label microsites.

Approve to start with #1 (branches + permissions schema).