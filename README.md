# McLeod ROI Builder

McLeod ROI Builder is a local-first Phase 1 sales-support application for building customer-specific business impact analyses for McLeod Software Truckload (LoadMaster) and Brokerage (PowerBroker) conversations.

## 1. Product overview

The application guides a seller from company setup through opportunity selection, assessment, review, and generation of customer-facing PPTX/PDF/HTML artifacts. Phase 1 is intentionally single-user, SQLite-based, and local-first; it is not a cloud or multi-user production deployment.

## 2. Current Phase 1 status

Phase 1 is consolidated as release-gate ready with known local/E2E environment limitations documented in `docs/p1-completion-report.md`. Implemented P1 capabilities include the canonical 21-module methodology, controlled narratives, overlap governance, investment/ROI metrics, immutable presentation snapshots, PowerPoint generation, PDF export, HTML export, local bootstrap, and regression tests.

## 3. Supported business types

- **Truckload** / LoadMaster
- **Brokerage** / PowerBroker

Business type can be chosen before opportunity selection. Once modules are selected, changing business type is blocked to preserve analysis integrity.

## 4. Workflow

1. **Company** — create an analysis with company, contact, business type, preparer, date, and optional customer-logo storage.
2. **Opportunities** — select from the canonical value-module registry filtered by business type.
3. **Assessment** — enter customer assumptions for selected modules; values are saved with PATCH semantics and recalculated through the deterministic engine.
4. **Review** — verify totals, narratives, overlap notices, assumptions/provenance, investment/ROI, and readiness gates.
5. **Presentation** — create an immutable snapshot, persist a `PresentationGeneration`, and generate/download PPTX, PDF, and HTML from snapshot data only.

## 5. Calculation methodology summary

The methodology contains exactly **21** canonical value modules: **8 Truckload-only**, **3 Brokerage-only**, and **10 shared**. Percentages are decimals internally, the weekly-to-monthly constant is `4.33`, internal precision is preserved, and rounding is display-only. Driver Turnover is annual-only. Trailer Asset Utilization keeps avoided capital separate from its recurring economic equivalent. Short Haul net capacity can be negative and must reconcile through totals and exports.

## 6. Value classifications

The value classifications are Revenue & Margin Opportunity, Operating Cost Reduction, Labor Capacity Value, Net Capacity Value, Cost Avoidance, and Capital Avoidance / Economic Equivalent. Informational capital is reported separately and excluded from total identified annual economic opportunity.

## 7. Controlled narratives

Narratives are deterministic TypeScript templates keyed by module and product context. There are 31 narrative variants with no cross-product fallback. `BROKERAGE_LTL` and `SHORT_HAUL_EFFICIENCY` remain `NEEDS_PRODUCT_REVIEW`; other current variants are draft-approved. Custom narratives store deterministic fingerprints and remain visible when stale until a seller reviews or resets them.

## 8. Overlap governance

Overlap notices are registry-driven. `INFORMATION` notices are non-blocking. `REVIEW` notices require a current persisted disposition before customer generation. Stale acknowledgments and `NEEDS_REVISION` block generation. `EXCLUDE_FROM_TOTALS` is not accepted in this release; sellers remove modules instead.

## 9. Investment and ROI methodology

ROI, payback, NPV, and IRR use one canonical cash-flow series: Year 0 is negative initial investment; each horizon year is identified annual opportunity multiplied by adoption minus annual recurring investment cost. First-year ROI uses year-1 adoption, horizon ROI uses the scheduled horizon, payback uses adoption-aware monthly interpolation without extrapolating beyond the horizon, and zero or absent investment is shown as not applicable rather than fabricated.

## 10. Benchmark and sensitivity caveats

Benchmarks are planning references only and never populate customer assumptions or change calculations. Public-aligned ranges without precise metadata remain `DIRECTIONAL_PLANNING`; McLeod ranges are labeled McLeod planning references. Illustrative Sensitivity is Review-only by default, uses centralized Lower Realization — 85%, Base Realization — 100%, and Higher Realization — 115% factors, scales canonical benefits only, and is not a probability-weighted forecast. Customer exports exclude it.

## 11. PowerPoint/PDF/HTML generation

Production generation follows: Analysis → immutable snapshot → persisted `PresentationGeneration` → snapshot-only PPTX/PDF/HTML composition. The title slide uses `McLeodTitlePage.png`; non-title PPT slides use `themepages.png`. PDF and HTML use the same snapshot totals and terminology.

## 12. Snapshot/versioning architecture

Version domains are independent:

- `PRESENTATION_SNAPSHOT_VERSION = "1.4.0"` — current schema includes ROI/charts/branding, overlap dispositions, and benchmark provenance.
- `PRESENTATION_TEMPLATE_VERSION = "1.2.0"` — current McLeod visual template and slide treatment.
- `NARRATIVE_REGISTRY_VERSION = "1.0.0"` — deterministic narrative/fingerprint source.
- `OVERLAP_REGISTRY_VERSION = "1.0.0"` — overlap-disposition fingerprint source.

Older persisted snapshots are not rewritten; optional fields remain parseable where practical.

## 13. Local requirements

- Node.js 20 (`.nvmrc` contains `20`; package engines require `>=20 <21`)
- npm
- SQLite via Prisma
- No global Prisma install required
- No Docker, cloud service, authentication provider, or AI API required for Phase 1

## 14. Setup instructions

```bash
nvm use
npm ci
npm run db:setup
npm run dev
```

`npm run db:setup` creates `.env` from `.env.example` if missing, preserves existing `.env`, invokes project-local Prisma, generates the Prisma client, and applies migrations. Do not use `npm update` as routine setup.

## 15. Test commands

```bash
npm ci
npm run db:setup
npm run db:generate
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
npm run methodology:workbook
npm run presentation:golden
```

## 16. Generated-file locations

- `generated-presentations/` — generated PPTX files; git-ignored.
- `test-results/` — Playwright and golden-generation outputs; git-ignored.
- `customer-logos/` — local customer-logo storage; git-ignored.
- `prisma/dev.db` and generated E2E databases are git-ignored.

## 17. Data/storage limitations

Phase 1 stores data in a local SQLite database and local filesystem directories. There is no central backup, no object storage, no encryption-at-rest layer beyond the host environment, and no multi-user ownership model.

## 18. Known limitations

Phase 1 remains local-first, single-user oriented, SQLite-based, unauthenticated, and not approved for broad production rollout. Manual product-owner validation is still required before pilot use, especially for product-review narratives and benchmark source-owner review.

## 19. Phase 2 scope

Phase 2 should begin with P2-0: production-readiness planning and risk acceptance. Potential P2 topics include authentication, multi-user ownership, PostgreSQL/cloud deployment, object storage, backup/restore, CRM integration, and broader operational controls. None of those are implemented in Phase 1.

## Custom Opportunities

The ROI Builder supports customer-specific custom opportunities for direct-value planning inputs that are outside the governed standard modules. Custom opportunities require financial details and a rationale, while narrative fields are optional and do not block presentation generation. See `docs/methodology/custom-opportunities.md`.
