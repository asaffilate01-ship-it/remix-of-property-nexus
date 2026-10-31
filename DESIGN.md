# Gabley product design contract

**Product:** Gabley, the UK property operating system and property marketplace.  
**Audience:** landlords, letting/sales agents, tenants, buyers, contractors, conveyancers and operational staff.  
**UI stack:** TanStack Router/Start, React, Tailwind v4, Radix/shadcn components.  
**Product lane:** trustworthy operational software, not an experimental marketing microsite.

This document records Gabley's **own** design decisions. The external reference
catalogues below are inspirations and review methods; they do not override this
product's brand, typography or task flows.

## Visual identity

- Existing "Emerald Prestige" palette is authoritative. Use the semantic CSS
  tokens in `src/styles.css`, not copied competitor hex codes.
- Deep emerald conveys trust and action; cream is the default canvas; restrained
  gold marks attention or brand character, **not** every icon and heading.
- Body typography is Epilogue; display headings use Urbanist/Epilogue. Preserve
  readable tabular numerals for rent, deposits, costs and reports.
- Prefer deliberate hierarchy, whitespace, concise labels, and real property
  imagery with attribution where needed. Avoid decorative dashboard blobs,
  repeated gradients, excessive glass, nested cards, and ornamental animation.
- Dark mode must preserve status meaning, focus rings and sufficient contrast.

## Components and interaction

1. Use the existing `src/components/ui` primitives for dialogs, buttons, tabs,
   inputs and alerts; do not add a second competing UI framework.
2. A card may have a **single stretched navigation link** or an explicit linked
   region; secondary controls (save, compare, contact) must be outside that link.
   No clickable `div` substitutes for buttons.
3. Every icon-only control needs an accessible name; toggles expose
   `aria-pressed`; meaningful focus rings remain visible on keyboard navigation.
4. Minimum mobile touch target: 44 by 44 CSS pixels. Respect safe-area insets
   and reduced-motion preferences. No essential functionality on hover alone.
5. Tables must work in 320px viewports with a labeled horizontal scroll region
   or a deliberate mobile card transformation. Never truncate money or status.
6. Inputs must have labels, validation text, clear submit outcomes and recoverable
   errors. Loading, error, empty and success states are four distinct views.
7. UK money defaults to GBP with `en-GB` formatting. Show whether a figure is
   a charge, cash receipt, estimated amount or outstanding amount.
8. Never turn failed database requests into fabricated `0`, `£0`, `No records`,
   or `All paid` states. Let the user retry without losing form context.
9. Apply Gabley's role-aware navigation and server-side RLS independently:
   hiding a menu item is not an authorization boundary.
10. Reuse the existing four-primary-tabs-plus-More mobile navigation; test
    the full task path, not only screenshots.

## Product IA and task hierarchy

- **Landlord:** portfolio → rent and arrears → compliance and inspections →
  repairs → statements and documents.
- **Agent:** pipeline → leads and viewings → listings → offers → tenancy setup
  and ongoing management.
- **Tenant:** tenancy and address → charges and actual payments → repair requests
  → documents and deposit status.
- **Buyer:** marketplace → saved searches/listings → viewings/offers → handoff.
- **Contractor:** assigned jobs → visit scheduling → proof and job updates.
- **Admin:** scoped organisations, role approvals, production health and audit.

Present the next meaningful action before generic charts. On finance and
compliance screens, provenance, dates, permissions and pending actions matter
more than decorative KPI collections.

## Agent-assisted design workflow

Use an **audit-first, non-destructive** pass informed by:

- Taste Skill: https://github.com/Leonxlnx/taste-skill
- Impeccable: https://github.com/pbakaus/impeccable
- Awesome DESIGN.md: https://github.com/VoltAgent/awesome-design-md
- Awesome Design Skills: https://github.com/bergside/awesome-design-skills

Review the existing component and task, choose one concrete improvement, preserve
routes and form contracts, implement, and validate at desktop plus 320/375/768px.
Use Impeccable's audit → harden → adapt → polish thinking; use Taste's
redesign-first hierarchy and contrast discipline. Extract patterns into
`src/components/ui` rather than copying third-party visuals verbatim.

**Quality gates:** npm run check; accessible names and keyboard operation;
a real browser smoke run for affected roles; correct loading/error states;
review of RLS/consent and third-party licences where relevant. Do not mark a
task shipped because a design-agent skill returned a positive score.

## Scope boundaries

- Gabley is the UK system of record. Immoviq is the independent German product:
  share patterns and permissioned interfaces, not unreviewed database queries.
- Gabley YourFirstFlip/property arbitrage must keep its own product and deal
  governance; a design reference does not authorize investment, introductions
  or cross-product sharing of landlord or buyer data.
- No external skill or MCP receives production credentials by default.
- The Gabley deployment must be verified independently of GitHub merges.
