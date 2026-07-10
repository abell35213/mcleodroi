# Presentation Snapshot and PowerPoint Design System

P1-8 establishes the presentation-generation foundation only. It does not implement the final automatic deck-composition algorithm, a Generate PowerPoint action, downloads, PDF conversion, AI summarization, or external image acquisition.

## Immutable snapshot source of truth

Generated presentations consume a reviewed immutable `PresentationGeneration.snapshotJson` record. The snapshot is created from the current analysis through `calculateAnalysis`, `renderAnalysisNarratives`, and the Review workflow's TEMPLATE/CUSTOM effective narrative resolution. Once persisted, `snapshotJson` is never updated; if analysis inputs or narratives change, a new `PresentationGeneration` row is created.

SQLite persistence stores `snapshotJson` as a stable serialized `String` rather than Prisma `Json`. This keeps the implementation reliable across the current SQLite/Prisma setup while preserving deterministic source data for future composition.

## Version domains

`PRESENTATION_TEMPLATE_VERSION` tracks the PowerPoint template/design system version. `NARRATIVE_REGISTRY_VERSION` tracks deterministic narrative copy and fingerprint source data. Both are stored in every snapshot because they change independently.

## Data and design separation

Slide template primitives accept explicit typed view models. They do not query Prisma, call `calculateAnalysis`, or calculate module financial values. P1-9 will map `PresentationSnapshot` data into those view models and then call the reusable builders.

## Visual system

The canonical design system uses a 16:9 widescreen layout, deep midnight/navy anchors, warm canvas content backgrounds, selective sunrise-gold accents, muted blue/forest secondary accents, strong metric hierarchy, generous whitespace, and Office-safe fonts. The approved highway/mountain/sunrise image is supported through the centralized theme asset path and is used for the cover visual and restrained panoramic brand/header treatment where configured. Content slides should not become full-image backgrounds.

## Approved presentation assets

Approved presentation assets live in `public/presentation-assets/` and are referenced through `presentationTheme.assets` rather than duplicated across templates.

- `public/presentation-assets/highway-sunrise.webp` is the approved highway/mountain/sunrise theme image.
- `public/presentation-assets/mcleod-logo.png` is the approved McLeod logo for the cover treatment.

The golden fixture requires both approved assets and fails clearly if either file is missing. Production presentation components still support graceful missing-image behavior where appropriate, so generic component usage can render clean navy/text fallbacks. Approved brand imagery must not be replaced with externally sourced, generated, redrawn, or substitute logo artwork without product-owner approval.

## Reusable PowerPoint foundation

`lib/presentation/pptx/create-presentation.ts` centralizes PptxGenJS initialization. `lib/presentation/layout.ts` defines the primary geometry grid. `lib/presentation/pptx/components.ts` provides reusable header, footer, hero metric, assumption grid, narrative block, value card, summary band, disclaimer, and category-label treatments. `lib/presentation/slides/templates.ts` provides cover, executive summary, single-module, dual-module, category overview, and opportunity summary primitives.

## Generated files

Future production PPTX files should be written beneath `generated-presentations/`, which is git-ignored. `getGeneratedPresentationPath` sanitizes company names and generation IDs and prevents path traversal.

## Golden fixture

`npm run presentation:golden` writes `test-results/presentation-golden.pptx` from fixture-only West Side-style data. This validates reusable components, approved presentation assets, and package generation but is not a production analysis-to-deck composer and does not query Prisma.
