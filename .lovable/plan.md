## Goal
Bring Estately up to Rightmove / Bayut / Arthur quality across visuals, marketplace, HMO workflow, and UK (England & Wales) compliance — done in calm, sequenced phases so nothing breaks.

## Phase 1 — Isometric 3D icon system
Generate a cohesive set of isometric icons (transparent PNG, brand-tinted) used across modules, features, dashboards and empty states.

Icons (12, all consistent style):
- House (sale), Key (lettings), Door-room (HMO), Storefront (commercial)
- Shield-check (compliance), Flame (gas safety), Bolt (EICR), Leaf (EPC)
- People (tenants), Briefcase (agents), Chart (pipeline), Wrench (maintenance)

Wire a `<IsoIcon name="..." />` component that swaps Lucide on landing, module pages, dashboard tiles, and empty states.

## Phase 2 — UK (E&W) Compliance hub
Database (one migration):

```text
compliance_item_type   enum  gas_safety, eicr, epc, pat, legionella,
                              hmo_licence, selective_licence, fire_risk_assessment,
                              emergency_lighting, fire_door_check,
                              right_to_rent, ast, how_to_rent, deposit_protection,
                              inventory, cmp, redress, aml, pi_insurance, ico

compliance_records   add:  item_type, reference, issued_at, expires_at,
                            document_url, status (valid/expiring/expired/missing),
                            scope (property/tenancy/agency/tenant), scope_id

agency_compliance    table for agent-level items (CMP, redress, AML, PI, ICO)
tenancy_compliance   table for tenancy items (RtR, AST, deposit, HtR, inventory)
```

Logic:
- Server fn computes status from `expires_at` (≤30 days = expiring).
- Renewal rules table seeded with UK cadences (Gas 12mo, EICR 60mo, EPC 120mo, PAT 12mo, Legionella 24mo, HMO licence 60mo, FRA 12mo).
- Dashboard widget per role: Landlord/Agent see property+agency items; Tenant sees their tenancy docs.

UI:
- `/_authenticated/compliance` overhauled: filters (role, status, type), expiring-soon bar, upload doc, set expiry.
- Empty-state CTA with isometric shield icon.

## Phase 3 — HMO workflow add-on
- `rooms` extended: weekly_rent, deposit, available_from, photos[], size_sqm, en_suite, bills_included.
- `tenancies` table: room_id/property_id, tenant_id, start/end, rent, frequency, deposit_scheme, deposit_ref, status.
- `rent_schedule` table generated from tenancy (period_start, due_date, amount, paid_at, status).
- Page `/_authenticated/hmo`: room board (Available / Reserved / Let / Notice), tenancy drawer, rent ledger, arrears badge.
- Gated by `agencies.hmo_module_enabled` (already exists).

## Phase 4 — Marketplace polish (Rightmove/Bayut feel)
- Filters: price min/max, beds, type tabs (already), radius (text postcode for now), keyword, sort.
- Listing card: photo carousel (first 3), price prominence, agency badge, "Added today" pill, save heart.
- Listing detail `/marketplace/$slug`: full gallery grid, key features, EPC badge, floor plan placeholder, similar listings, sticky agent contact card with "Request viewing" lead form (writes to `leads`).
- Map view stub (list ↔ map toggle; map = placeholder with pins from lat/lng if present, else hidden).

## Phase 5 — Cross-cutting polish
- Tighter responsive grid (header uses `grid-cols-[minmax(0,1fr)_auto]` pattern).
- Skeleton loaders on marketplace + dashboard.
- Refined module landing pages with isometric icon hero badges.
- Animated subtle hover/scale on cards.

## Out of scope (next turn if you want)
- Live UK postcode autocomplete (needs postcodes.io key)
- Stripe rent collection
- DocuSign-style e-sign for AST
- Tenant portal sign-up flow (auth already supports tenants)

## Order of execution
1. Migration: compliance + tenancies + rent_schedule + room fields
2. Generate 12 isometric icons in parallel
3. `IsoIcon` component + replace key icons on landing/modules/dashboard
4. Compliance hub UI + server fns
5. HMO workflow UI + server fns
6. Marketplace filters + listing detail + lead form
7. Visual polish pass + skeletons + responsive audit

I'll execute phases sequentially, validating after each so the preview stays green throughout.