# Presentation Snapshot and Export Architecture

Generated customer artifacts consume reviewed immutable `PresentationGeneration.snapshotJson` records. Snapshot creation is the only step that reads the live analysis: it calls `calculateAnalysis`, resolves controlled narratives, records overlap dispositions, captures benchmark provenance, embeds logo data when available, and serializes the resulting `PresentationSnapshot`. After that boundary, PPTX/PDF/HTML generation must use the snapshot only.

## Version domains

- `PRESENTATION_SNAPSHOT_VERSION = "1.4.0"` — current snapshot contract. History: 1.2.0 corrected ROI semantics; 1.3.0 added overlap dispositions; 1.4.0 added benchmark provenance for traceability.
- `PRESENTATION_TEMPLATE_VERSION = "1.2.0"` — current McLeod visual template. History: 1.0.0 was the reusable foundation; 1.1.0 covers the P1-9B through P1-9D title treatment, content-slide background, Executive Summary redesign, final opportunity layout, branding, and footer treatment; 1.2.0 makes production decks one opportunity per detail slide, changes final summaries to module cards with pagination, renames the brokerage display category, and removes proprietary/confidential footer text.
- `NARRATIVE_REGISTRY_VERSION = "1.0.0"` and `OVERLAP_REGISTRY_VERSION = "1.0.0"` change independently and are recorded/fingerprinted where relevant.

Older persisted snapshots are not rewritten. Optional fields such as ROI, charts, branding, overlap dispositions, and benchmark provenance remain optional so historical snapshots can still be parsed where practical.

## Design and composition boundary

Slide template primitives accept typed view models and never query Prisma or recalculate module formulas. Composition maps the immutable snapshot into title, executive summary, category/module, opportunity summary, and assumptions appendix models.

## Visual system

The approved P1 template uses `public/presentation-assets/McLeodTitlePage.png` for the title slide and `public/presentation-assets/themepages.png` for non-title slides. The title slide has no blue overlay. The Executive Summary uses one large heading, a combined opening paragraph, bold underlined opportunity headings with supporting bullets, and no monthly/yearly totals band at the bottom. The final summary slide title is “The Identified Opportunities.”

`public/presentation-assets/mcleod-logo.png` remains available where components still need a logo asset. Approved brand imagery must not be replaced with generated, externally sourced, redrawn, or substitute artwork without product-owner approval.

## Generated files

Production PPTX files are written beneath `generated-presentations/`, which is git-ignored. Path builders sanitize company/generation segments and enforce directory containment. Downloads require `PresentationGeneration.status = COMPLETE`; failed generations must not expose misleading file paths.

## Golden fixture

`npm run presentation:golden` writes `test-results/presentation-golden.pptx` from deterministic fixture data. It validates required assets, package generation, and the current visual/template version without mutating production analyses.


## P1-9E production composition

Production decks use one opportunity per detail slide. Category membership controls deterministic ordering and labels, but it does not merge multiple opportunities onto a dual-module slide. The reusable dual-module template remains available for fixtures or future development, but production value-opportunity composition does not select it.

The final “The Identified Opportunities” section is module-based: every included opportunity appears as exactly one summary card using the same hero-metric selection logic as its detail slide. Summary cards paginate at four cards per slide. Additional pages use a continued title, and the final summary slide contains the totals band for Monthly Recurring Economic Opportunity and Annual Identified Economic Opportunity. Informational capital, when present, remains separately labeled and is not added to the annual total.

Generated PowerPoint slides no longer emit the proprietary/confidential footer text. Footer-free background treatment conceals the legacy embedded footer region without changing the approved title or theme artwork.

The brokerage display category is now “Brokerage Operational Efficiencies”; the internal `BR_SHIPPER_SALES` category key remains unchanged for compatibility.
