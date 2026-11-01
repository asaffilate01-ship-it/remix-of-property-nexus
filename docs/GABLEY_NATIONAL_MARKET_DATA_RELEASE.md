# Gabley Deal Scout — UK market data, official completed sales and licensed portal sourcing
Release prepared: 1 November 2026 · England/Wales HMLR + opt-in PropertyData commercial API.

## What is actually implemented

| Source | Coverage | Gabley implementation | Activation |
| --- | --- | --- | --- |
| Existing Gabley marketplace | Published Gabley for-sale listings | Already live in source: `scanPublishedSaleListings`, signed-in agent permission, research shortlist | Actual production inventory and RLS still need browser checks |
| **HM Land Registry Price Paid Data** | Registered completed sales from 1995, England and Wales | **New:** persistent normalized price history, streaming 15/16-column importer, A/C/D corrections and tombstones, release-order guard, outcode/standard sale indexes, verified price comparisons | **Not yet populated**. Deploy migration, backfill, then enable weekly official monthly-update job |
| **PropertyData** | Specialist investment listings originating from major UK portals (including Rightmove, Zoopla and OnTheMarket) | **New:** server-only real API calls, 12 investment strategies, no third-party images, provider URL validation, current price reductions, source expiry/recheck, database-backed per-agency daily call quota | Requires the user's paid PropertyData API subscription and explicit server-side licence acknowledgement |
| Direct Rightmove | Rightmove agent listings | **Not a scrape:** Rightmove's publicly documented automated datafeed is an **upload/update** API for an agent's own inventory, not an unrestricted bulk consumer listing/search API | Direct reading requires separately issued contractual rights / feed spec |
| Direct Zoopla | Zoopla listings | No public listings API; direct data collection prohibited by its terms | Commercial data access agreement required |
| Direct OnTheMarket | OnTheMarket listings | No direct copying/deeplinking/scraping built | Written commercial agreement required |
| **Sprift** | UK property profiles, sold comps, planning, EPC and optional AVM | Provider is identified for future separately licensed advanced comparable valuation; Gabley has a provider-neutral research model | Commercial Sprift subscription and agreed product permissions required |
| **Registers of Scotland** | Scottish sale and price statistics | Public aggregate UKHPI/median benchmarking can be added; English/Welsh transaction records **do not** cover Scotland | Transaction-level RoS data requires separate agreement |
| **Northern Ireland LPS** | NI House Price Index aggregated | Public regional HPI could inform benchmarking, **not** individual sold comparable addresses | Individual transaction access to be licensed/verified separately |

**The software is merged only after successful CI. GitHub is not the live database.** These new importers/API adapters are not evidence of a production subscription, imported transactions or active provider feed.

## Safely connecting the two big sources

### 1. Official HMLR price data (open data, no vendor API subscription)

The source: https://www.gov.uk/government/statistical-data-sets/price-paid-data-downloads

The HMLR file has 15 columns in complete/yearly extracts and a 16th `Record Status` in monthly change-only releases:
- A: add
- C: correct
- D: delete

**Do not sum monthly files as if they are a full housing-market snapshot.** First backfill full yearly or complete files, then apply monthly updates. Official data can arrive weeks/months after a sale, and the most recent sales are materially incomplete.

In Gabley's repo:
1. Apply the new append-only migration `20261101121000_hmlr_deal_scout_price_history.sql` following `docs/DATABASE_RELEASE_RUNBOOK.md`. Back up DB and verify the hosted migration ledger first.
2. Confirm quota and role RLS in staging; provision production through approved release controls.
3. Download the required original official yearly/complete CSVs from GOV.UK.
4. Set **server-only** `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to the **Gabley** project; never add keys to source or web clients.
5. Validate a sample:
   ```sh
   npm ci
   npm run hmlr:import -- --file ./pp-2025.csv --release 2026-10-28 --dry-run
   ```
6. Import after checking the file and release metadata:
   ```sh
   npm run hmlr:import -- --file ./pp-2025.csv --release 2026-10-28 --confirm
   ```
7. In Gabley Deal Scout, choose a qualifying house/flat and click **Suggest Land Registry comparables**. This queries the stored official data; no CSV re-upload is required.
8. Configure GitHub Actions **repository secrets** `GABLEY_SUPABASE_URL` and `GABLEY_SUPABASE_SERVICE_ROLE_KEY` after operator approval. The job `.github/workflows/hmlr-price-paid-sync.yml` checks the stable official monthly CSV weekly (Mondays), uses the official file's Last-Modified metadata to order changes, and safely skips while secrets are missing.

Caution: full historic HMLR backfill is multi-GB/millions of records; choose appropriate database size, operational budget, backups and load window. The scheduled workflow refreshes *monthly corrections*; it **does not substitute for first-time historical backfill**. No migration or national data has been applied in this ChatGPT session.

Data attribution, as required by HMLR:

> Contains HM Land Registry data © Crown copyright and database right 2021. This data is licensed under the Open Government Licence v3.0.

**Important Address Data condition:** the OGL does not necessarily cover third-party OS/Royal Mail address database rights. HM Land Registry confirms that the address fields can be used to display residential property price information services; broader uses may require Royal Mail permission. Do not use Price Paid addresses to generate unsolicited owner marketing or export address directories without a separate rights review. The UPRN/INSPIRE lookup datasets have separate licences.

### 2. Licensed commercial sourcing via PropertyData

PropertyData documentation and licensing:
- https://propertydata.co.uk/api/documentation/sourced-properties
- https://propertydata.co.uk/api/documentation/sourced-property
- https://propertydata.co.uk/api/documentation/licensing
- https://propertydata.co.uk/api/documentation/property-lists

Its terms permit using the API as an *input into a value-added, customer-facing SaaS*, but prohibit reselling/reproducing substantially all raw data or creating a substitute search feed. Results cached from the API must be removed or refreshed within 60 days. Third-party photos are excluded from this build.

To enable:
1. Obtain a commercial PropertyData API subscription.
2. Confirm the account agreement covers Gabley's exact product use and set the following on the **server**, not the client:
   ```text
   PROPERTYDATA_API_KEY=(secret)
   PROPERTYDATA_COMMERCIAL_USE_CONFIRMED=true
   PROPERTYDATA_DAILY_API_LIMIT=15
   ```
3. Run the new HMLR/usage quota migration first. Per agency, only 15 provider requests per day are allowed by default; quota enforcement **fails closed** on database errors.
4. Log in as an authorised Gabley agent, open **Deal Scout**, choose a full postcode, radius and sourcing strategy (reduced, repossessed, auctions, cash buyers, short lease, slow-to-sell and others).
5. Gabley requests **only 10 matching opportunities per paid API call**, shows clearly marked asking prices and reduction history, and excludes the third-party photos/summaries.
6. Shortlisting re-fetches a property by its provider ID. Only a derived research case is retained; its *current source evidence expires after 60 days* and blocks valuation/introduction until it is refreshed through the licensed API.
7. Buyer introduction and commission invoicing still require agency AML/redress approval, seller authority, buyer terms, adequate evidence and human review.

PropertyData output is a *specialist subset of listed properties*, not a complete Rightmove/Zoopla/OnTheMarket inventory. Having a Rightmove/Zoopla logo on a source record is **not** proof Gabley has a direct contract with those portals.

### 3. Finding properties that may be undervalued

Deal Scout intentionally separates:
- **Asking-price evidence** (Gabley published inventory or PropertyData specialist API);
- **Recorded sold comparables** (official Price Paid data or separately verified agent sale evidence);
- **Indicative financial underwriting** (transaction costs, stamp duty, legal, finance, works, contingency, resale costs, sourcing fee, required investor profit);
- **Buyer mandate suitability** (budget, area, strategy, willingness to refurbish, funding evidence);
- **Legal/commercial gates** (estate agency AML supervision, redress, seller authority, agreed fee, buyer terms and auditable documents).

A listing being cheapest in a postcode is **not proof** it is under market value. HMLR Price Paid data does not tell Gabley condition, lease defects, bedrooms, internal area or whether a purchase is currently possible; evaluate on independent professional evidence as needed. The algorithm must fail closed when three usable sold comparable transactions are absent.

## Review of relevant GitHub projects

These were used as **design/architecture references**, not unreviewed package installs:
- [jonnyshaw89/house-price-importer](https://github.com/jonnyshaw89/house-price-importer): narrow precedent for importing HMLR Price Paid data.
- [laurarodrigues3/uk-property-sales-etl-olap-pipeline](https://github.com/laurarodrigues3/uk-property-sales-etl-olap-pipeline): ingestion → warehouse → analysis architecture; not suitable to install wholesale because Gabley uses Postgres/TanStack rather than MySQL/Pentaho.
- [light-vp/uk-land-registry-mcp](https://github.com/light-vp/uk-land-registry-mcp): reference for source-grounded price queries and MCP; review licences/coverage before any production use.
- [epimorphics/ukhpi](https://github.com/epimorphics/ukhpi): official UK HPI publication patterns and regional trends; an HPI index is not an individual sale valuation.
- [ideal-postcodes/postcodes.io](https://github.com/ideal-postcodes/postcodes.io): UK postcode validation/lookup and future geography/distance support. It is **not** a property price source.
- [tamarasaurus/immo-feed](https://github.com/tamarasaurus/immo-feed): illustrates real-estate feed-normalisation ideas, but copying its site-scraping implementation would violate the data sourcing principles here and is **not used**.

Other property scraping repositories were deliberately not installed. Gabley's data providers must be licensed, official, first-party or user-authorised, with source rights recorded.

## Release gates

- `npm run check`: existing property, tenant, owner and deal tests; new HMLR CSV integrity and licensed-provider normalization; database migration manifest audit; TypeScript; application build; role routing.
- `npm audit --omit=dev --audit-level=high` and GitHub CodeQL.
- Stage two agencies, authenticated agents, nonagents, unknown roles, expired licence credentials, provider failure and quota exhaustion.
- Test 15/16 column Price Paid data; multiline quoted addresses; A/C/D update replay; stale historical import cannot resurrect a deleted transaction; category B cannot count as ordinary category A comparable.
- Test external ask freshness, source status, high-priced homes, sold subject to contract, current licence and TTL, no photos, SSRF/security URL allowlists, and API cost caps.
- Confirm that live-source data is legally retained and that source fields expire or refresh by the contractual deadline.
- Verify deployed `/api/public/health` release SHA, monitoring and backup before calling the feature live.

### Operating limits and next priorities

This release is an **operational integration foundation**. It does not activate a Rightmove wholesale data licence, obtain any provider API key, scrape web pages, import the 5GB historic dataset automatically, or supply transaction-level Scottish and Northern Irish property sales. Supplier agreements, full historical backfill, deal-room approval workflows, independent valuation data and bank-verified commissions remain separate activation/expansion work.
