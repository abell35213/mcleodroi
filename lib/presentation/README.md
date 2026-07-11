# Presentation package

This package contains Phase 1 presentation version constants, immutable snapshot creation/parsing, snapshot-to-slide composition, PPTX generation, PDF/HTML export helpers, asset-path containment, and customer-logo utilities.

Customer-facing generation must follow the immutable boundary: live Analysis → persisted `PresentationGeneration.snapshotJson` → snapshot-only PPTX/PDF/HTML output. Do not recalculate mutable analysis state inside export code after a snapshot has been created.
