# Custom Opportunities

Custom opportunities are customer-specific planning inputs and are not part of the governed standard McLeod opportunity-module methodology.

They let a seller document a financial opportunity not covered by the 21 governed modules without adding a free-form formula engine.

## Required Fields

A custom opportunity is financially complete when it has a title, category, value classification, value frequency, finite financial amount, at least one assumption, and calculation rationale.

## Optional Narratives

How McLeod Helps, Customer Analysis / Business Impact, presentation callout, methodology note, and source note are optional. Blank narrative fields do not block Review, PowerPoint, PDF, or HTML generation.

## Financial Classifications and Frequency

Custom opportunities use the governed value classifications. Monthly recurring values annualize once by multiplying by 12. Annual-only values are included once per year and do not create a monthly value. Informational capital values remain separate and are excluded from ROI.

## Assumptions and Rationale

Assumptions are ordered label/value rows with optional unit and source/note. The calculation rationale explains how the direct entered value was derived; it is not parsed or executed.

## Aggregation and ROI

Complete economic custom opportunities map into the same aggregate totals and ROI benefit base as standard modules. Negative values remain negative. Informational capital is excluded from economic totals and ROI.

## Overlap Review

Economic custom opportunities create a review notice when standard economic modules are present. Sellers must confirm the value does not duplicate benefits already included elsewhere.

## Snapshot and Presentation Behavior

Presentation snapshots capture immutable custom opportunity identity, values, assumptions, rationale, narratives, fingerprint, and display order. The presentation generator consumes snapshot data; historical snapshots are not mutated by later edits.

## Limitations

V1 supports direct-value entry only. It does not include executable formulas, custom calculators, AI-generated narratives, approval workflows, global libraries, public customer editing, authentication, PostgreSQL, cloud storage, or deployment infrastructure.
