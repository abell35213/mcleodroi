# McLeod ROI Builder

McLeod ROI Builder is a local-first internal sales tool foundation for McLeod Software team members. The MVP will help sellers create customer-specific business impact analyses for Truckload (LoadMaster) and Brokerage (PowerBroker) opportunities.

## MVP purpose

The application will eventually support this workflow:

Create Analysis → Select Opportunities → Complete Assessment → Review Value Story → Generate Presentation

P1-1 establishes only the repository foundation and local application bootstrap.

## Technology stack

- Next.js App Router
- TypeScript with strict mode
- Tailwind CSS
- shadcn/ui-compatible folder structure (`components/ui`)
- SQLite
- Prisma
- Zod
- Vitest
- Playwright
- PptxGenJS dependency installed for future work only

## Local prerequisites

- Node.js 20 (the supported local MVP version)
- npm
- nvm (recommended for using the included `.nvmrc`)

No Docker, cloud services, authentication provider, or external AI APIs are required.

## Fresh-clone setup

```bash
git clone <repository-url>
cd mcleodroi
nvm install
nvm use
npm install
npm run db:setup
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database setup

The app uses Prisma with a local SQLite database at `prisma/dev.db` by default. The included `.nvmrc` targets Node 20 for local development. The development database URL is stored in `.env`, and `npm run db:setup` creates `.env` from `.env.example` when `.env` is missing. Existing `.env` files are never overwritten.

```bash
DATABASE_URL="file:./dev.db"
```

Useful database commands:

```bash
npm run db:setup    # generate Prisma client and apply the initial migration
npm run db:generate # regenerate Prisma client
npm run db:migrate  # create/apply development migrations
npm run db:studio   # open Prisma Studio
```

## Development commands

```bash
npm run dev       # start the local Next.js app
npm run build     # create a production build
npm run lint      # run ESLint
npm run typecheck # run TypeScript without emitting files
npm run test      # run Vitest unit tests
npm run test:e2e  # run Playwright smoke tests
npm run verify    # lint, typecheck, unit tests, and build
```

## Current P1-1 scope

Implemented in this foundation task:

- Local Next.js App Router application shell
- Dashboard landing page for Business Impact Analyses
- Analysis workflow route shells
- Reusable typed workflow progress component
- Prisma SQLite setup with a minimal `Analysis` model
- Reusable Prisma client abstraction
- Zod create-analysis validation schema
- Unit tests for validation and workflow progress
- Playwright smoke test for the landing page

## Explicitly deferred functionality

P1-1 intentionally does **not** implement:

- ROI calculation formulas or Excel formula ports
- The 21 value module registry
- Value classification logic or overlap warnings
- LoadMaster or PowerBroker narrative registries
- Customer-specific narrative rendering
- PowerPoint or PDF generation
- Customer logo upload/rendering workflows
- Authentication, roles, or permissions
- CRM integrations
- AI or external benchmark services
- Cloud deployment, AWS, Postgres, Docker, Redis, or background workers

## P1-3 deterministic calculation engine

The calculation engine in `lib/calculations` provides pure TypeScript business validation and deterministic financial calculations for the 21 canonical value modules from `lib/modules`.

Key methodology rules:

- Percentage inputs use decimal representation: pass 2% as `0.02`, 17% as `0.17`, and 100% as `1`.
- `WEEKS_PER_MONTH` is fixed at `4.33` for the MVP methodology.
- Calculation functions preserve internal precision and do not perform display rounding.
- Capacity value is modeled recovered capacity; it is not automatically cash savings.
- Trailer avoided capital is reported as `informationalCapitalValue`, distinct from the recurring monthly equivalent.
- Driver turnover reports annual cost avoidance as `annualOnlyValue`; monthly equivalent is a derived metric only.

## Analysis Module Persistence and Aggregate Value Engine

The analysis domain persists only customer-specific state. Canonical value module metadata remains in the TypeScript registry under `lib/modules`; the database does not contain a `value_modules` table and does not duplicate module labels, input definitions, business applicability, value types, overlap groups, or category mappings.

Selected modules are stored per `Analysis` as `AnalysisModule` rows. Customer assumptions are normalized as `AnalysisModuleInput` key/value rows with one `numericValue` per canonical input key. P1-4 uses SQLite `Float`/REAL storage because the existing deterministic calculation engine uses JavaScript numbers; no Decimal arithmetic library is introduced in this phase.

Calculation results are intentionally not persisted. The analysis service reconstructs calculation inputs from persisted rows plus canonical registry defaults, calls `calculateValueModule(...)`, and derives module state from the current inputs. Default values are metadata only and are not automatically written as input rows. Trailer asset defaults use `asset_life_months = 60` and `residual_value_pct = 0.20`; Short Haul uses `transaction_cost_per_ticket = 0.25`.

Input saves use PATCH semantics: provided keys are inserted or updated, omitted keys remain unchanged, and clearing one field requires the explicit clear-input service. The service never treats a cleared or omitted input as zero.

Module status is derived centrally: `NOT_STARTED` means no customer inputs are persisted, `IN_PROGRESS` means inputs are partial or the deterministic calculation returns validation issues, and `COMPLETE` requires all required non-default inputs plus a successful calculation.

Aggregate totals include only selected modules that are `COMPLETE` with successful calculation outcomes. Monthly recurring totals sum only `financialOutputs.monthlyRecurringValue`; annual-only values such as Driver Turnover do not create synthetic monthly recurring totals. Total identified annual economic opportunity is `annualRecurringValueTotal + annualOnlyValueTotal`. Informational capital values, such as Trailer Asset Utilization avoided capital investment, are exposed separately and are excluded from total annual economic opportunity. Successful module value is also grouped by canonical `ValueType`.

Database-integrated Vitest coverage uses a temporary SQLite database per test file. Tests run `prisma migrate deploy` against that temporary database, instantiate an isolated Prisma client with the temporary datasource URL, reset data between tests, and remove the temporary database directory afterward.

## P1-6 Usable Analysis Workflow

The Business Impact Analyses dashboard now displays persisted analyses only. Each row calculates its current identified annual economic opportunity at render time and resumes the user at Opportunities, Assessment, or Review based on existing analysis readiness.

Users create a Business Impact Analysis from `/analyses/new` by entering company details, choosing Truckload or Brokerage, and submitting the existing create-analysis Zod validation. Customer logo upload is intentionally not exposed yet.

Opportunity selection at `/analyses/[id]/opportunities` is driven by the canonical module registry. Categories and module ordering come from registry metadata, business-type availability is enforced by domain services, and overlap notices render from the existing overlap service output without blocking selection.

Assessment at `/analyses/[id]/assessment` shows one selected module at a time. The module navigation uses calculated module ordering and derived statuses: Not Started, In Progress, and Complete. If no module is requested, the first incomplete module opens; when every module is complete, the first module opens.

Input forms are generated from canonical input definitions. Percentages are displayed as salesperson-friendly whole percentages, so `17` in the UI is persisted and calculated as `0.17`; persisted `0.17` displays as `17`. Canonical defaults are displayed as methodology defaults without being persisted merely by viewing a page.

The MVP uses an explicit **Save & Calculate** action. It sends current form values with PATCH-style semantics, clears emptied fields instead of converting them to zero, recalculates through the domain calculation layer, and displays validation issues, financial outputs, derived metrics, and default customer-specific narrative output from the narrative renderer.

Review remains a guarded handoff shell. Users can continue to Review only when all selected modules are complete; otherwise Review redirects back to the first incomplete assessment module.

## P1-7 Review Value Story

The Review Value Story workflow is the editorial checkpoint between calculated analysis and future customer presentation generation. The `/analyses/[id]/review` route is guarded by `calculateAnalysis`; it renders only when every selected module is complete and uses the same deterministic calculations and canonical module/category registry as Assessment.

Review displays total identified annual economic opportunity, recurring monthly value from `monthlyRecurringValueTotal`, recurring annual value, and annual-only opportunity separately. Canonical `ValueType` breakdown remains authoritative: Revenue & Margin Opportunity, Operating Cost Reduction, Labor Capacity Value, Net Capacity Value, Cost Avoidance, and Capital Avoidance / Economic Equivalent are shown only when they have value. Informational capital values are shown as a separate strategic callout and are not added to annual economic opportunity because the recurring equivalent is already represented in the analysis total.

Module review cards are grouped by canonical category and follow calculated analysis order. Users can reorder modules within their current category using Move Up / Move Down controls; category order and cross-category movement are not editable. Overlap notices from the existing calculation workflow appear in Assumption Review and do not block readiness.

Customer Analysis text is rendered from the deterministic narrative engine in TEMPLATE mode and is not persisted. Editing Customer Analysis saves CUSTOM text only when it differs from the current rendered default after whitespace normalization; saving default-equivalent text returns the module to TEMPLATE. Reset to Updated Default clears the custom narrative and immediately uses the current deterministic default.

CUSTOM narratives store a `customNarrativeSourceFingerprint`, a SHA-256 hash of deterministic source data: module key, business type, reconstructed calculation inputs, financial outputs, derived metrics, and `NARRATIVE_REGISTRY_VERSION` (`1.0.0`). If inputs or the narrative registry version source changes after editing, Review shows “Custom Narrative May Need Review” while preserving the custom narrative. CUSTOM rows with no fingerprint are treated as needing review.

Presentation Readiness summarizes calculation completion, narrative review status, product-review narrative counts, and blocking errors. The Generate Presentation CTA hands off to `/analyses/[id]/presentation`, which remains a guarded shell and does not generate PowerPoint or PDF files.

## P1-8 Presentation snapshot and PowerPoint foundation

P1-8 adds immutable presentation snapshots and the reusable PowerPoint design system. A presentation snapshot is created only from a review-ready analysis, stores both the presentation template version and narrative registry version, and remains historical state even if the analysis later changes. Slide components consume typed view models rather than Prisma records or live calculations; full automatic deck composition is deferred to P1-9.

See `docs/presentation-architecture.md` for snapshot persistence, 16:9 theme/layout constants, reusable PptxGenJS components, slide template primitives, generated-file path strategy, and the development-only golden fixture (`npm run presentation:golden`).

## ROI, payback, NPV, and IRR engine

`lib/calculations/roi.ts` adds a deterministic, purely additive ROI engine that turns an identified annual economic opportunity into investment-relative credibility metrics. It is independent of the existing module calculators and leaves all existing behavior unchanged when it is not called.

`calculateRoi(...)` returns a `CalculationOutcome<RoiMetrics>` using the same validation-issue pattern as the module calculators. Inputs:

- `annualValue` — gross identified annual economic opportunity (benefit).
- `investment` — one-time upfront investment; must be greater than zero.
- `annualRecurringCost` — optional ongoing yearly cost; defaults to `0`.
- `horizonYears` — optional whole-year horizon; defaults to `3`.
- `discountRatePct` — optional annual discount rate as a decimal (pass 10% as `0.1`); defaults to `0` in the pure engine. The analysis layer applies a seller-editable `DEFAULT_ANALYSIS_DISCOUNT_RATE` of `0.1` when a deal opts into ROI without specifying one.
- `adoptionSchedulePct` — optional per-year adoption ramp as decimal fractions (e.g. `[0.5, 0.8, 1]`). When present its length must equal `horizonYears`; each entry scales that year's gross benefit. Defaults to full (`1`) adoption every year, so omitting it leaves every scalar metric identical to a flat model.

Methodology rules:

- `netAnnualValue = annualValue - annualRecurringCost` (steady-state, full adoption).
- `paybackMonths` is simple (undiscounted, steady-state) payback and is `null` when the net monthly value is not positive, i.e. the investment never recoups.
- `firstYearRoiPct = (netAnnualValue - investment) / investment`.
- `horizonRoiPct = (netAnnualValue * horizonYears - investment) / investment`.
- ROI figures are decimal ratios, not percentage points: `3` means 300%.
- The scalar payback and ROI ratios use the steady-state net value; the adoption ramp is honored by NPV, IRR, and the cumulative benefit curve.
- Per horizon year `y`: `grossBenefit = annualValue * adoptionPct_y`, `netBenefit = grossBenefit - annualRecurringCost`, `discountedNetBenefit = netBenefit / (1 + discountRatePct)^y`.
- `npv = -investment + Σ discountedNetBenefit` across the horizon.
- `irr` is the decimal rate solving `NPV = 0` over the cash flows `[-investment, netBenefit_1, …, netBenefit_H]`, found by bisection. It is `null` when no rate brackets a sign change (e.g. every net annual benefit is non-positive).
- `cumulativeBenefitCurve` reports, per year, the adoption fraction, gross/net benefit, running net benefit, running net cash flow (including the upfront investment), discounted net benefit, and running NPV.
- Results preserve internal precision and are not display-rounded.

The analysis layer (`lib/analyses/service.ts`) persists seller-entered investment inputs on the `Analysis` record (`investmentOneTimeCost`, `investmentAnnualRecurringCost`, `investmentChangeManagementCost`, `roiHorizonYears`, `roiDiscountRatePct`, `adoptionSchedulePctJson` — all nullable) via `saveAnalysisInvestment(...)`. `calculateAnalysis(...)` then derives `roi` from `totalIdentifiedAnnualEconomicOpportunity` and the total investment (one-time + change-management). ROI stays `null` — and identified-opportunity analyses are unaffected — until a positive one-time investment is entered.

The engine is covered by hand-verified golden scenarios in `scripts/fixtures/roi-golden.ts`, asserted in `tests/unit/roi.test.ts` and printable for inspection with `npm run roi:golden`. Persistence and wiring are covered by `tests/integration/analysis-investment.test.ts`.
