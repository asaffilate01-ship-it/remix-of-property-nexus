## Goals

You raised 9 things on the Properties page. Here is how I'll group and ship them.

## 1. Bug fixes (do first)

- **"Can't add properties"** — investigate why your Save isn't working. Likely culprits: missing required field surfacing silently, or the dialog closing before insert. I'll add inline error display, validate required fields visibly, and log/show the actual database error so it stops failing silently. If reproducible, I'll fix the root cause (e.g. `owner_id` not being set, or `listing_purpose` enum mismatch).
- **"Can't assign / add tenants"** — currently tenants live on the Tenancies page and the Property detail drawer's Tenancies tab. I'll add an explicit **"Add tenant"** button inside the property drawer with a proper tenant form (name, email, phone, start date, rent, deposit, room if HMO), wired to the existing `tenancies` table. Same flow exposed from the Tenancies page with a property picker.

## 2. Property model improvements

- **HMO room numbers**: when `is_hmo` is on, the Rooms tab gets a "Room number" field in addition to "Name", and tenancy assignment requires picking a room.
- **Property features (dropdown / multi-select)**: add a `features text[]` column with a multi-select (parking, garden, furnished, pets-allowed, EPC-A/B, lift, balcony, garage, washing-machine, dishwasher, wifi, smart-meter, etc.). Filterable on the Properties list.
- **Short-let / Airbnb-style option**: extend `listing_purpose` to include `short_let`. When chosen, the property gets a nightly rate, min-stay, cleaning fee, and a calendar/availability view instead of a long-term tenancy.

## 3. Search

- **Postcode dropdown**: search box becomes an autocomplete that suggests postcodes already present in your portfolio, plus area prefixes (e.g. `SW1`, `M14`). I'll also keep free-text search.

## 4. Scheduling

- **Gantt-style schedule** on a new "Schedule" tab inside each property (and a global one): horizontal timeline showing tenancies, cleanings (for short-lets), inspections, compliance renewals, and work orders. Drag to move dates. Built with a lightweight custom Gantt (no heavy dep) over the existing tables.
- **Cleaning jobs**: new `cleaning_jobs` table (property_id, scheduled_at, duration, assignee, status, notes). Auto-suggested between short-let bookings.

## 5. Docs & compliance per property

- Both already exist as global pages. I'll surface them inside the property drawer as **"Documents"** and **"Compliance"** tabs scoped to that property, with one-click upload and "add record" buttons that prefill `property_id`.

## Technical plan

**Migrations**
- `properties.features text[] not null default '{}'`
- Extend `listing_purpose` enum with `short_let`
- `properties.nightly_rate numeric, min_stay_nights int, cleaning_fee numeric` (nullable)
- `rooms.room_number text` (nullable)
- `cleaning_jobs` table + RLS (owner / agency member)

**UI**
- `properties.tsx`: feature multi-select, postcode autocomplete, short-let fields, fix add bug
- New `PropertyScheduleGantt.tsx` component
- New tabs in detail drawer: Schedule, Documents, Compliance, plus existing Rooms / Tenancies / Rent
- "Add tenant" CTA in Tenancies tab opens a proper sheet form

**Order of work**
1. Reproduce + fix add-property and add-tenant bugs (smallest, unblocks you)
2. Migration: features, short_let, room_number, cleaning_jobs
3. Properties form: features multi-select, short-let fields, room number
4. Postcode autocomplete search
5. Property drawer: Documents + Compliance tabs (reuse existing components scoped by property_id)
6. Schedule Gantt + cleaning jobs

## One question before I start

Scope is big — roughly 6 chunks above. Want me to:

- **(A)** Ship all 6 in one go (longer turn, more changes at once), or
- **(B)** Start with (1) bug fixes + (2)+(3) data model + form changes this turn, then do postcode / schedule / docs in a follow-up?

Reply A or B and I'll go.