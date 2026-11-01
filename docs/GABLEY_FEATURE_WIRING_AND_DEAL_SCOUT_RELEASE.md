# Gabley feature wiring and Deal Scout release
**Source audit:** 1 November 2026  
**Repository:** asaffilate01-ship-it/remix-of-property-nexus  
**Delivery:** GitHub code, PR and CI only. No Lovable prompts or credits.

## Existing platform wiring inventory

| Module | Evidence in source | What can be claimed | Next verified acceptance |
|---|---|---|---|
| Public property listings | `fetchListings`, `fetchListing`, marketplace/search, media/signing components | Publication-scoped listings and search implemented in code | Published inventory, SEO, mobile, provider permissions |
| Agency/landlord properties | Property, compliance, HMO and landlord dashboard routes | CRUD and portfolio read workflows present | End-to-end role/RLS, exports, 1000+ row testing |
| Sales/lettings CRM | Leads, viewings, offers, buyers, sellers, sales and pipeline routes | Sales and letting pipeline surfaces present | Real tenant scope, signed agreement workflow, conversion |
| Client portals | Tenant/landlord routes, rent schedule, repairs, documents | UI and server queries exist, including partial-rent safeguards | Role matrix, Stripe sandbox session and document links |
| Finance and owner reporting | `rent_schedule`, bank statement parser, reconciliation and owner charge report | Charge-cohort review and statement import code present | Actual bank receipt ledger, reversal/matching, live sandbox |
| Contracts, e-sign, referencing | Contracts/e-sign/referencing provider adapters | Adapter and workflow code present | Supplier approvals, credentials, webhook and document acceptance |
| AI and automations | `copilot.functions`, AI copy/search, tracks, alerts, scheduled hooks | AI and automation routes present | Usage entitlements, model evals, cron, prompt-injection tests |
| Public matching | `src/lib/property-matching.ts`, `/property-matches` | Deterministic published-listing ranking by buyer/renter criteria | Browser tests, listing volume, intent mapping |
| **Deal Scout** | `/deal-scout`, `deal-scout.functions`, `deal-screening.ts` | Public Gabley listing discovery, shortlist, comparable review and conservative costs in code | Live migrated DB, RLS, source licence, browser test |
| **Deal Intelligence** | `/deal-intelligence`, Omniqora adapter | Agency-scoped deal research and buyer matching code | Omniqora tenant mapping/approved server credentials |
| **Investor mandates** | `/deal-investors`, investor profiles and match constraints | Account-scoped buyer mandate criteria, verified-funding flag and scoring | Buyer consent, proof of funds, introductions (approved agency only) |
| **Fees & compliance** | `/deal-commissions`, `deal_commissions`, regulatory gates | Disclosed proposed fee, manual invoice/receipt evidence lifecycle | Independent AML/redress review, completed sale proof, finance reconciliation |
| DOMUREVA link | `domureva-bridge.server.ts`, review-only endpoint | Token-gated approved funding assessment bridge in source | End-to-end signed payloads with DOMUREVA, scoped network rules |

**Not verified:** deployment, live Gabley Supabase migrations, production role/RLS, external data supplier permissions, live AI requests, payment settlement and automated buyer introductions. Source code is not operational proof.

## The previously agreed UK sourcing and flip model

Two independent but connected engines operate in **Gabley**:

1. **Deal Scout:** search licenced/authorised published properties, flag the lowest asking prices, store provenance, attach completed sold-price comparables, estimate a conservative resale value, model purchase costs/works/contingency/finance/stamp duty/sales and sourcing fee, then screen margin and uncertainty.
2. **Buyer matching:** match reviewed opportunities against buyer/investor mandates, with hard budget/geography/strategy/refurb constraints and documentary funding evidence. No cross-agency leakage or autonomous communications.

Commercial arrangement: Gabley/its agency customer **does not purchase, take title to, or require equity in the property**. A written, disclosed sourcing/introduction fee may be recorded separately, with the party who pays it and VAT treatment. The ledger keeps proposed, invoiced and evidence-of-receipt states. No client-money holding or automated commission capture is implemented.

### What “worth buying” means in the application

An output of `potential_candidate` is a **screening result** only, requiring: at least three independently identifiable sold comparable records; meaningful asking-price discount; room for all entered costs and target investor profit; and a lower-quartile valuation buffer. Its valuation is not a RICS valuation or a guarantee. Without evidence the system displays `insufficient_evidence`; it must never invent a buyer, final market value, comparable transaction, equity return or completion date. Staff must confirm seller authority, actual condition, legal title, lease, planning, EPC, taxes and source licence before proceeding.

### Actual automatic source coverage

- **Connected for research:** existing Gabley published marketplace sale listings; no scrape of Rightmove, Zoopla, Bayut, Land Registry private addresses or unlicensed portals.
- **Sold-price inputs:** staff-entered evidence **or browser-local import of an official HM Land Registry Price Paid CSV extract** (15 MB limit, 100k-row parser limit). The importer suggests only recent standard sales with matching broad type/outcode and unique addresses; staff must review actual subtype, condition and source evidence. Uploaded files are never persisted as bulk source datasets or automatically verified against the live HMLR feed. It cannot derive bedrooms, exact area or RICS market value from PPD alone.
- **Next data integration:** monthly, attributed HM Land Registry Price Paid Data CSV under OGL v3, with lawful ingestion, correct transaction date, update/delete handling, UPRN when appropriately licensed, geocoding and outlier QA. HM Land Registry does **not** provide a free ready-made real-time per-address Price Paid API. A licensed AVM is an additional potential provider, not wired.
- **Off-market/auction and seller introductions:** require lawful, contracted feeds and authority from the seller/agent. Do not infer seller motivation from personal data.

## Introduction and compliance gating

In the DB this release adds immutable cross-agency scope and introduction checks. A suggested buyer is **not an authorised introduction**. The following must be satisfied before proceeding:

- Verified estate agency HMRC AML registration and approved redress evidence reviewed by a platform compliance operator (not self-approved);
- documented seller instruction/authority and sourcing fee/fee payer/VAT disclosure;
- accepted buyer terms and independently reviewed buyer funding readiness;
- human-reviewed comparable valuation and relevant material property information;
- role-gated agency workspace and audited data access;
- signed contract references; disputes and complaints handling.

The fee ledger cannot move to invoiced/paid based only on a model score; it requires a completed deal, completion evidence, invoice reference and (for manual paid status) a bank receipt reference. A user-entered receipt is **not** independent bank confirmation; finance must verify.

Official legal references (verify live before commercial rollout):
- https://www.gov.uk/hmrc-internal-manuals/anti-money-laundering-guidance-for-supervised-businesses/amlg2200
- https://www.gov.uk/guidance/registration-guide-for-estate-agency-businesses
- https://commonslibrary.parliament.uk/research-briefings/cbp-10692/
- https://www.gov.uk/government/consultations/material-information-in-property-listings/material-information-in-property-listings

Data:
- https://www.gov.uk/government/statistical-data-sets/price-paid-data-downloads

## Release and test matrix

1. `npm ci && npm run check && npm audit --omit=dev --audit-level=high`.
2. Review the 3 append-only SQL migrations and the SHA256 manifest; do not edit applied migrations.
3. Reconcile live Gabley Supabase migration ledger/backups, deploy in order, regenerate typed DB schema and check RLS with: agency A owner/agent, agency B owner/agent, buyer, tenant, anonymous, platform admin AAL2.
4. Verify public scanner never returns private/unpublished properties; test current listing status while shortlisting; concurrent duplicate saves must not create multiple opportunities.
5. Verify valuations fail closed with stale/no comps, incorrect postcode/type, fake dates, unsupported fee assumptions, missing stamp duty and unacceptable profit.
6. Verify investor matching rejects over-budget/cross-agency/refurb-unwilling/unverified funds and that introduced status fails without seller terms/agency compliance.
7. Verify only platform compliance staff can approve dossiers using service-role review; ensure ordinary API clients cannot set `approved_at`.
8. Verify invoice/paid transitions cannot run before verified completed sale evidence, matching disclosed fees, VAT, invoice and receipt references. Reconcile manually to bank/Stripe records.
9. Browser acceptance at 320px, tablet and desktop; keyboard/screenreader; error/loading/empty/retry states.
10. Review `.env` tracked history, deploy separate server-only secrets for Omniqora/DOMUREVA, confirm `/api/public/health` release SHA and production monitoring.

## Next development releases

- Automate vetted Price Paid Data bulk ingestion, versioned add/change/delete corrections, provenance, region refresh and outlier correction. The current CSV feature is **local preview only**, not scheduled ingestion. Integrate licensed AVM providers where permitted, never unlicensed scraping.
- Document vault integration for seller/buyer authority, AML evidence and valuation/source files (encrypted storage and signed URLs).
- Human-approval deal room with buyer/seller messaging, viewing and conveyancing stages; separate consent for investor campaigns.
- Automated workflow reminders, deal status transitions, commission invoices and independent bank reconciliation with idempotent evidence.
- Omniqora enrichment with scoped, redacted inputs, test evals, attributable model outputs and no autonomous client contact.
- DOMUREVA/Gabley Retrofit rehab, Craftvaro contractor estimates and Dokuvera evidence with separate tenant boundaries and approval.
