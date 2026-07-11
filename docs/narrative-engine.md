# P1-5 Deterministic Narrative Engine

The narrative engine is a controlled TypeScript rendering layer. It does not use AI, LLM APIs, prompt construction, or runtime string-expression engines.

## Source flow

Customer inputs are persisted by the analysis module layer, reconstructed by P1-4, and calculated by the P1-3 deterministic calculation engine. The narrative renderer consumes typed successful calculation results and formats already-derived values for customer-facing language.

The renderer must not repeat financial formulas. Numeric derivation belongs to `calculateValueModule`; narrative code may format currencies, percentages, counts, hours, miles, and loads.

## Product variants

Canonical modules remain shared when the value methodology is shared. Narrative variants are resolved by `moduleKey` plus business type, using the canonical alignment:

- `TRUCKLOAD` → `LOADMASTER`
- `BROKERAGE` → `POWERBROKER`

There is no hidden fallback between products. Missing or unavailable variants return typed narrative errors.

## Capacity-value language

Capacity-value narratives use labor-capacity, staff-capacity, operating-capacity, or employee-capacity language. They do not automatically claim cash savings, payroll reduction, eliminated positions, or reduced payroll. Shared capacity disclaimers are centralized.

## Status and review

Narrative status mirrors the P1-2 canonical module registry. `BROKERAGE_LTL` and `SHORT_HAUL_EFFICIENCY` remain `NEEDS_PRODUCT_REVIEW`; other current variants are `DRAFT_APPROVED`.

## Rendering rules

Module narratives render only for selected modules with status `COMPLETE` and a successful calculation outcome. Full-analysis narrative rendering requires P1-4 `canReview`; it preserves the calculated module order and returns a typed error if selected modules are incomplete.

## Custom narrative resolution

`TEMPLATE` mode returns the rendered default customer analysis. `CUSTOM` mode returns trimmed custom narrative text when non-empty. Blank custom text returns a typed error. Persistence and editing UI are implemented in the Review workflow: custom text is stored only when it differs from the default, stale custom fingerprints remain visible for review, and Reset to Updated Default returns a module to TEMPLATE mode.

## Presentation view

Presentation snapshots store the effective narrative selected at Review. PPTX/PDF/HTML generation consumes that immutable snapshot field and does not re-render mutable live narrative state after snapshot creation.
