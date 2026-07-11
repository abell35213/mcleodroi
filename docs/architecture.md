# Phase 1 Architecture

## System architecture

McLeod ROI Builder is a local Next.js App Router application backed by Prisma and SQLite. The browser submits workflow forms to server routes/actions, server services read canonical TypeScript registries, Prisma persists customer-specific analysis state, and generated customer artifacts are written to local filesystem storage.

Phase 1 remains local-first, single-user oriented, SQLite based, unauthenticated, without central backup, and not approved for broad production rollout.

## Analysis data flow

1. Company data creates an `Analysis` row.
2. Opportunity selection creates `AnalysisModule` rows for canonical module keys.
3. Assessment saves normalized `AnalysisModuleInput` numeric values.
4. `calculateAnalysis` reconstructs inputs, applies canonical defaults without persisting them merely by viewing, runs module calculators, aggregates complete modules, and derives readiness.
5. Review renders calculated results, narrative state, overlap state, benchmark provenance, investment/ROI, and charts from the same calculated analysis boundary.

## Calculation and aggregation boundary

The canonical registry under `lib/modules` defines module metadata, applicability, input schemas, value classifications, categories, benchmarks, and overlap groups. The calculation engine under `lib/calculations` owns formulas. Aggregation includes only complete selected modules with successful calculation outcomes. Informational capital is separate. Display layers may format and round but must not recalculate formulas.

## Narrative boundary

The narrative engine is deterministic and product-context specific. It consumes calculated module outputs and never performs formula math. TEMPLATE narratives are rendered from the registry; CUSTOM narratives are persisted with deterministic source fingerprints. No narrative fallback crosses LoadMaster/PowerBroker boundaries.

## Immutable snapshot boundary

Customer generation begins by creating a `PresentationGeneration` with stable serialized `snapshotJson`. The snapshot captures analysis metadata, summary totals, module outputs, effective narratives, overlap dispositions, ROI, chart data, branding, version constants, and benchmark provenance. Historical snapshots are not mutated if live analysis data later changes.

## Export generation boundary

PPTX, PDF, and HTML outputs consume the persisted snapshot only. Export composition must not query mutable module inputs or re-run live analysis after snapshot creation. Generated PPTX files are stored below `generated-presentations/`; PDF/HTML routes render from the same snapshot model.

## Version constants

- `PRESENTATION_SNAPSHOT_VERSION = "1.4.0"`: current snapshot schema includes corrected ROI semantics, overlap dispositions, and benchmark provenance.
- `PRESENTATION_TEMPLATE_VERSION = "1.1.0"`: current McLeod title/background assets and slide treatment.
- `NARRATIVE_REGISTRY_VERSION = "1.0.0"`: narrative text and fingerprint source.
- `OVERLAP_REGISTRY_VERSION = "1.0.0"`: overlap disposition fingerprint source.

Snapshot history: 1.2.0 corrected ROI semantics; 1.3.0 added overlap dispositions; 1.4.0 adds benchmark provenance as a traceability field. Template history: 1.0.0 was the initial reusable foundation; 1.1.0 reflects the P1 McLeod branded title/background and summary/opportunity layouts.

## Database entities

Primary entities include `Analysis`, `AnalysisModule`, `AnalysisModuleInput`, custom narrative fields on selected modules, overlap disposition rows, and `PresentationGeneration` records. Canonical module metadata is not duplicated into database tables.

## Local storage locations

- `prisma/dev.db` for the default local SQLite database.
- `generated-presentations/` for generated PPTX files.
- `customer-logos/` for customer logo uploads.
- `test-results/` for test and golden-output artifacts.

## Security limitations

Phase 1 has no authentication, roles, row-level authorization, central audit log, hosted backup, malware scanning, or cloud object-storage controls. Path containment and file validation protect local generated-file/logo paths, but the application should be used only in a controlled local environment.

## P2 deployment considerations

P2-0 should define production-readiness requirements before implementation: authentication/authorization, multi-user ownership, database platform, backup/restore, object storage, deployment target, monitoring, incident response, data retention, export lifecycle, and benchmark/narrative approval ownership.
