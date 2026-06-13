# Wire Everything — Implementation Plan

Four areas across all roles (agent, landlord, tenant, admin), done in dependency order.

## Phase 1 — Shared infra
- Add public `listing-photos` bucket; RLS: owner writes, anyone reads.
- `useUploader` hook around `supabase.storage`.
- `useCurrentAgency()` hook (picks first agency the user owns/belongs to).

## Phase 2 — Listings (create / edit / photos / compliance)
- New routes: `_authenticated/listings.new.tsx`, `_authenticated/listings.$id.edit.tsx`.
- Form binds every column on `public.listings` (HMO toggle, rent, deposit, EPC, gas/electric expiries, description, address, photos[]).
- Photo multi-upload → `listing-photos` → persisted to `listings.photos`.
- Rooms editor: inline CRUD on `public.rooms`.
- Compliance block: CRUD on `public.compliance_records` for the listing's property.
- Save → toast → invalidate listings query → redirect.

## Phase 3 — Properties + tenants
Property detail tabs persist:
- **Tenants**: list tenancies → contacts; edit bio/notes; add/remove tenancies.
- **Compliance**: full CRUD on `compliance_records` with doc upload to `documents` bucket.
- **Documents**: list + upload to `documents` table + bucket (scope=property).

## Phase 4 — Dashboards + expiry widgets
Each role dashboard pulls live counts (listings, active tenancies, open work orders, viewings, rent due, compliance ≤60d).
`ExpiryWidget` real query on `compliance_records` joined to `properties`, grouped by expired / expiring / ok.

## Phase 5 — Marketplace flows
- Card click → `/marketplace/$id` detail (gallery, rooms, agent contact).
- **Save** → toggles `saved_listings` row.
- **Enquire** → inserts a `leads` row (source=`marketplace`).
- **Offer** → inserts an `offers` row.
- Signed-out CTAs render inline "Sign in to enquire" (no redirect).

## Technical
- New table `public.saved_listings (user_id, listing_id, created_at, PK(user_id, listing_id))`, RLS `auth.uid()=user_id`, GRANT authenticated + service_role.
- All mutations via direct supabase client under RLS; `createServerFn` only where elevation is needed (cross-owner lead insert with validation).
- `react-hook-form` + zod, `useMutation`, sonner toasts, standardised query keys.

## Out of scope
Theming, payments, AI features, admin moderation queues.

Multi-step build — I'll land each phase and report back. Reply "go" to start with Phase 1, or tell me to reorder.