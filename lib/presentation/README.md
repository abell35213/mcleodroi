# Presentation design system

This package contains the reusable PowerPoint theme, layout constants, slide models, and PPTX template helpers used by the approved P1-8 presentation snapshot fixture.

## Cover logo support

No approved McLeod logo image asset is currently present in this repository outside dependency folders. The cover template therefore exposes a configurable `coverLogoPath` slot on `CoverSlideModel`, with `presentationTheme.assets.coverLogoPath` as the default fallback. When an approved logo asset is added to repository/sample assets, pass its file path through that slot rather than fabricating or replacing it with unapproved artwork.

## Content controls

Value slides are designed to consume controlled narrative fields such as `valueNarrative`, `effectiveCustomerAnalysis`, `presentationCallout`, and `presentationDisclaimer`. Templates do not perform AI summarization or alter ROI calculations.
