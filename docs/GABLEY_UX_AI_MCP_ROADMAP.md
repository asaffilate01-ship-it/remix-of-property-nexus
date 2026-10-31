# Gabley: repository-backed UX, AI and MCP improvement roadmap
Audit baseline: 31 October 2026  
Repository: https://github.com/asaffilate01-ship-it/remix-of-property-nexus

## Confirmed baseline

This is a React 19 / TanStack Start / Tailwind v4 property SaaS using
Supabase, Stripe, Google Maps, Radix and Capacitor. Present source includes
role-specific dashboards, authenticated role gating, listings, public
marketplace, tenants, work orders, documents, E-sign, bank-statement review,
rent summaries, a command palette and mobile navigation.

The recent landlord/statement-preview work is represented by merged PR #6.
GitHub source does not establish production deployment, real supplier approval,
tenant-specific live database wiring, or real-world browser acceptance.

### Issues identified from actual code

| Priority | Finding | Action |
| --- | --- | --- |
| P1 | Marketplace `ListingCard` embeds Save inside an outer link; click propagation workarounds do not make nested interactives safe for keyboard users | This branch: make separate focusable controls with an accessible 44px Save toggle |
| P1 | `AgentDashboard` previously used zero counts after failed requests | This branch: loading, fail-closed error state and explicit retry |
| P1 | `TenantDashboard` ignored `paid_amount` and treated status strings as payment truth; queries silently failed | This branch: calculate outstanding minor units, paginate results, error/retry, use the actual tenant portal for schedule |
| P1 | `statements.tsx` reports full `amount` as received when `paid_at` is set; source also aggregates by displayed address rather than a stable property ID | Next: reconcile amount/paid_amount, choose charge-cohort vs cash-ledger language and scope statements to the correct owner; finance acceptance tests |
| P1 | `portal.tenant.tsx` also derives next rent by status and lacks complete query-error and pagination checks | Next: reuse tenant rent summary and add repair/payment end-to-end tests |
| P1 | Root repository includes tracked `.env` and `.env.development` despite ignore rules | Verify key restrictions and platform environment injection, then remove tracked runtime files safely and rotate any exposed secret; historical Git exposure persists |
| P1 | Gabley YourFirstFlip/arbitrage repository and live inter-product data contract were not verified in this audit | Keep separate until source and consented integration contract are reviewed |
| P2 | Many role pages use very similar gradient hero/card patterns | Follow DESIGN.md and consolidate purpose-driven headers, statuses and action hierarchy |
| P2 | Product claims and empty states should distinguish live inventory from marketing copy | Browser-check public listing and search routes before claiming volume or freshness |

## Selected design/repository sources — not wholesale installs

| Source | Best Gabley application | Selection rule |
| --- | --- | --- |
| [Taste Skill](https://github.com/Leonxlnx/taste-skill) | Audit-first redesign of public marketplace and dashboard hierarchy | Apply its design rules only; preserve Gabley's emerald/cream identity |
| [Impeccable](https://github.com/pbakaus/impeccable) | Accessibility, responsive checks, UX copy and error-state polish | Review authoring scripts before execution; prefer repo-owned tests |
| [Awesome DESIGN.md](https://github.com/VoltAgent/awesome-design-md) | Study design-token composition and documentation patterns | Do not substitute another brand's design document for Gabley's |
| [Awesome Design Skills](https://github.com/bergside/awesome-design-skills) | Curated specialist reference for interaction/brand skills | Pick named vetted files instead of bulk-installing dozens |
| [axe-core](https://github.com/dequelabs/axe-core) | Automated a11y scans on critical routes | Add CI only after a working browser fixture and approved fixture users |
| [Playwright MCP](https://github.com/microsoft/playwright-mcp) | Agent-operated desktop/mobile QA of journeys and semantic controls | Test/staging accounts only, no unattended production writes |
| [MapLibre GL JS](https://github.com/maplibre/maplibre-gl-js) | Potential neighbourhood and portfolio map view | Assess Google Maps features and tile licensing before any migration |
| [Langfuse](https://github.com/langfuse/langfuse) | Trace AI predictions, refusals, approvals and cost | Scrub personal and financial data before exporting traces |
| [promptfoo](https://github.com/promptfoo/promptfoo) | Regression and prompt-injection tests for AI assistants | Treat test fixtures as executable content; isolate environment |
| [Model Context Protocol servers](https://github.com/modelcontextprotocol/servers) | MCP reference implementation and least-privilege patterns | Allowlist tools, hosts, identities and audit events |

The catalogs contain many hundreds of candidates; the table is a curated
shortlist based on this product's verified stack, not a claim of source-level
review or installation of thousands of packages.

## Property-grade AI agents (future staged delivery)

1. **Portfolio copilot (read-only first):** grounded answers on occupancy,
   work orders, statement statuses, evidence gaps and upcoming renewals;
   show source record and timestamp. No invisible updates.
2. **Compliance triage:** draft EPC, gas and electrical checklists with
   jurisdiction, expiry/proof links, alert confidence and human verification.
   Do not represent the model as a legal or safety certifier.
3. **Maintenance triage:** group duplicate requests, suggest urgency and
   trades, recognise emergencies for immediate human escalation; contractor
   selection, approval and payments stay permissioned.
4. **Listing assistant:** propose title, highlights and photo order with
   discriminatory language guardrails, owner approval and provenance.
5. **Deal Detective / YourFirstFlip advisor:** assemble comparables, explain
   uncertainty, carrying/renovation cost assumptions, taxes and disclosed fees;
   review property rights and source licences; never autonomously submit
   offers or contact sellers.
6. **Reconciliation reviewer:** propose matches from bank statement lines to
   rent charges with confidence and audit trace, but require explicit signed-in
   finance-role confirmation before a write or settlement.

### Tool/MCP boundaries

- **GitHub:** current connector for read/review, branches, PRs and CI evidence.
- **Supabase MCP:** development/staging with read-only allowlisted SQL by default;
  production schema, RLS, migrations and service-role access require separate
  operator approval and existing migration runbooks.
- **Playwright MCP:** browser role-matrix, touch, keyboard, failures and visual
  snapshots. Ensure test users are isolated from real tenants.
- **UK property data:** evaluate official HM Land Registry Price Paid Data
  (open bulk data, not necessarily a free real-time API) and official England/
  Wales EPC developer API with published terms and updated timestamps.
  Property estimates must include confidence, methodology and source date.
- **Omniqora, Dokuvera, DOMUREVA, Immoviq:** future cross-product integrations
  through explicit server-to-server identity, scopes, tenant boundaries,
  consent, audit, throttling and revocation; do not share Supabase credentials.
- **External services:** do not transfer tenant/landlord private documents or
  property valuations to unapproved models, MCP servers or tracing vendors.

### Implementation sequence

**Phase 1 — trustworthy core (this PR):** listing-card controls; agent
dashboard failure handling; tenant rent remaining-balance logic; accessible
loading/empty/retry screens; regression tests; design contract.

**Phase 2 — integrity:** owner/tenant statement accuracy, separate payments
from charges, role-based finance acceptance suite, tenant portal reuse,
single property detail deep links, 320–768px browser and keyboard tests.

**Phase 3 — operator workflows:** repairs triage, maintenance SLAs, compliance
evidence/expiry tasks, owner reporting, authenticated end-to-end scenarios,
preview/live release SHA matching.

**Phase 4 — intelligence:** read-only, sourced property copilot and market
comparable pipeline with evals and prompt-injection protection; explicit
human-gated mutations and full traceability.

**Phase 5 — property network:** permissioned links to YourFirstFlip,
DOMUREVA, Gabley Retrofit, and Immoviq with separate legal/data models.

### Release acceptance

1. `npm ci && npm run check` plus `npm audit --omit=dev --audit-level=high`.
2. Test marketplace Save/Details by keyboard, pointer and touch without
   accidental navigation, including signed-out redirect.
3. Test all dashboards as empty, loaded, partial-rent, failed-network and
   permission-denied users; verify errors never show a fabricated zero.
4. Review production RLS migration state and external API consent boundaries.
5. Confirm deployed `/api/public/health` release SHA, frontend visual
   acceptance and Stripe sandbox; merging GitHub is not deployment proof.

## Public references

- https://www.gov.uk/government/publications/hm-land-registry-data/public-data
- https://use-land-property-data.service.gov.uk/api-information
- https://get-energy-performance-data.epb-integration.digital.communities.gov.uk/
- https://supabase.com/features/mcp-server
- https://github.com/microsoft/playwright-mcp
