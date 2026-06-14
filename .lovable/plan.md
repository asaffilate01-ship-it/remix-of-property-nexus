# Marketplace upgrade + Corporate split + Public polish

Big-picture: today `/` redirects to `/marketplace`, and corporate pages (for-agents, for-landlords, platform, business) are scattered. We'll restructure into two clear products — a Rightmove-style **portal** and a separate **corporate site** — then polish.

## 1. New route architecture

```text
/                       Corporate landing (NEW — replace the redirect)
/about                  Company / mission / team
/products               Product overview (umbrella for agents / landlords / platform)
/products/agents        (move from /for-agents)
/products/landlords     (move from /for-landlords)
/products/platform      (move from /platform)
/pricing                (new — pulled from /business)
/customers              Case studies (new — light placeholder content)
/contact                Contact form + offices
/legal/privacy, /legal/terms, /legal/cookies, /legal/complaints   (moved under /legal)

/marketplace            Property portal (was /)
/marketplace/$slug      Listing detail
/marketplace/saved      Saved searches & alerts (logged in)
```

Old URLs (`/for-agents` etc.) keep working via `redirect()` so existing links don't break.

## 2. Rightmove-style marketplace upgrades

**Browse page (`/marketplace`)**
- **Split map + list view**: toggle Grid / List / Map. Map uses the existing Google Maps loader with pins clustering by price; clicking a pin opens a mini card; hovering a list item highlights its pin.
- **Sticky filter bar**: price range, beds (1+/2+/3+/4+), property type, purpose (sale/rent/room), added-since (24h/7d/14d/auto), radius around postcode, "must include" keywords, sort (newest / price asc / price desc).
- All filter state moves into URL search params via `validateSearch` + `zodValidator` so links are shareable and back/forward works.
- "Save this search" button → writes to existing `saved_searches` table with current filters; signed-out users get an inline "sign in to save" CTA.

**Listing detail (`/marketplace/$slug`)**
- Photo gallery lightbox (keyboard nav, fullscreen, swipe on mobile).
- Tabs: Overview · Floorplan · Map & nearby · EPC.
- Key features chips + room dimensions table for HMOs.
- "Nearby" section: schools, stations, supermarkets (Google Places Nearby via gateway, cached).
- Mortgage calculator (sale listings only): deposit / term / rate sliders → monthly payment.
- "Similar properties" rail (same city, ±20% price, same beds).
- Sticky bottom action bar (mobile): Save · Share · Contact agent.

**Saved searches & alerts (`/marketplace/saved`)**
- List of the user's saved searches with last-run match count.
- Toggle email alerts per search (writes `notify` flag).
- Reuses existing `saved_search_matches` table; new public cron endpoint `/api/public/cron/match-saved-searches` triggers daily (existing hook already exists — we just expose UI).

## 3. Polish pass — public pages

Keeping the current palette/fonts. Tightening:
- **Consistent page shell**: shared `<PublicHeader />` (logo, primary nav, sign in CTA) + `<PublicFooter />` used on every public page.
- **Spacing rhythm**: 96px top section padding desktop / 56px mobile, 24px gutters, max-w-6xl content.
- **Typography**: H1 clamp(2rem,5vw,3.5rem), H2 clamp(1.5rem,3vw,2.25rem), body 16px/1.6, muted captions 13px.
- **Cards & buttons**: single shadow token (`--shadow-card`), single radius token (`rounded-2xl` for cards, `rounded-lg` for inputs/buttons), consistent hover lift.
- **Forms** (auth, contact, valuation, referencing): unified `<Field>` wrapper with consistent label/help/error layout; large 44px touch targets.
- **Empty states & loading**: skeletons not spinners for grids; friendly empty illustrations.
- **SEO**: per-route `head()` with title, description, og:title, og:description — leaf pages also get `og:image` (existing first-listing photo for marketplace, hero image for corporate).
- **Mobile**: every header row uses the responsive `grid-cols-[minmax(0,1fr)_auto]` pattern so labels don't clip.

## 4. Technical notes

- All filter state on `/marketplace` uses `validateSearch` + `zodValidator` + `loaderDeps`; the loader primes a Query cache keyed on the filter object.
- Map uses the existing `loadGoogleMaps()` helper (already loads `places` library). Listings without lat/lng are geocoded on save via a small server fn so the map always has coordinates.
- Listing detail loader uses `ensureQueryData`; "similar properties" is a non-blocking `prefetchQuery`.
- Saved-search alerts: the existing `/api/public/hooks/match-saved-searches.ts` already does the matching; we add a UI to enable/disable per search and a small server fn to upsert `saved_searches.notify_email`.
- No schema changes needed beyond a single `saved_searches.notify` boolean column (default false) and an optional `last_match_count` int — one tiny migration.

## 5. Suggested rollout order

1. Route restructure + redirects (no UI change, just plumbing).
2. New corporate landing `/` + `/about` + `/contact` (replaces redirect).
3. Marketplace filter bar in URL state + sort.
4. Marketplace map view + list/grid/map toggle.
5. Listing detail upgrades (gallery, tabs, nearby, similar, mortgage).
6. Saved-searches UI + alert toggle + tiny migration.
7. Public polish pass (shared shell, typography, spacing, SEO heads).

This is ~7 focused PRs of work. I'll do them in order in subsequent turns — happy to start with step 1+2 (the corporate split) since that unblocks everything else, or jump straight to the marketplace map+filters if you'd rather see the user-visible wins first.
