# ROI Methodology

The McLeod ROI Builder uses a single planning-estimate cash-flow model for ROI, payback, NPV, IRR, review cards, charts, and exports. These outputs are sales-planning estimates, not audited financial projections.

## Benefit base

The steady-state annual identified economic opportunity is:

`annualRecurringValueTotal + annualOnlyValueTotal`

Informational capital values are shown separately and excluded from ROI cash flows. Driver Turnover `annualOnlyValue` is treated as an annual recurring avoidance opportunity expressed annually rather than monthly; it is included exactly once per year in the benefit base and then multiplied by the adoption schedule.

## Investment and adoption

Initial investment is:

`oneTimeImplementationCost + changeManagementCost`

Annual recurring investment cost is subtracted in every horizon year. If no adoption schedule is configured, the documented default is 100% adoption in every year. If a schedule is persisted, it must contain exactly one finite value per horizon year, each from 0 to 1 inclusive, and values must be non-decreasing. Malformed persisted JSON or invalid schedules block ROI calculation instead of silently falling back to full adoption.

## Canonical cash flows

Year 0 cash flow is `-initialInvestment`.

For each year Y:

- `grossRealizedBenefit[Y] = annualIdentifiedEconomicOpportunity * adoptionSchedule[Y]`
- `annualRecurringCost[Y] = configured annual recurring investment cost`
- `netAnnualBenefit[Y] = grossRealizedBenefit[Y] - annualRecurringCost[Y]`
- `cashFlow[Y] = netAnnualBenefit[Y]`

The initial investment is not subtracted again in Year 1.

## ROI metrics

First-Year ROI is calculated only when initial investment is greater than zero:

`(netAnnualBenefit[1] - initialInvestment) / initialInvestment`

Horizon ROI is calculated only when initial investment is greater than zero:

`(sum(netAnnualBenefit[1..N]) - initialInvestment) / initialInvestment`

Simple horizon ROI is not discounted; NPV is the discounted measure. When initial investment is zero, ROI, payback, and IRR are not applicable rather than Infinity or 0%.

## Payback

Estimated Payback starts cumulative cash flow at `-initialInvestment` and adds each year's adoption-adjusted `netAnnualBenefit / 12` month by month. This assumes benefit realization is distributed evenly within each configured year. If cumulative cash flow never reaches zero within the configured horizon, payback is reported as not achieved within that horizon.

## NPV and IRR

NPV uses the canonical cash-flow series:

`cashFlow[0] + sum(cashFlow[Y] / (1 + discountRate)^Y)`

IRR uses the same series `[-initialInvestment, netAnnualBenefitYear1, ... netAnnualBenefitYearN]`. IRR returns null when no valid sign change exists or the solver cannot converge; UI/export surfaces this as unable to calculate from the configured cash flows.

## P1-Audit-4 governance: investment, benchmarks, and illustrative sensitivity

Investment validation is enforced in the server action and service layer. Invalid one-time cost, recurring cost, change-management cost, horizon, discount rate, adoption value format, adoption values outside 0–100%, adoption length mismatches, declining adoption schedules, and non-finite numeric input return a typed error state with field-level messages. Invalid submissions do not redirect as a successful save, do not overwrite the last valid persisted investment configuration, and do not calculate ROI from rejected values.

The analysis distinguishes `NO_INVESTMENT_CONFIGURED` from `INVALID_INVESTMENT_CONFIGURATION`. No investment means ROI is not applicable and economic-opportunity review/presentation can proceed when the rest of the analysis is ready. Invalid persisted investment data is a blocking integrity state: malformed values are not dropped, converted to zero, replaced with full adoption, or used for partial ROI.

Benchmark source types are `PUBLIC_VERIFIED`, `MCLEOD_INTERNAL`, `DIRECTIONAL_PLANNING`, and `USER_PROVIDED`. Benchmark approval statuses are `APPROVED`, `PLANNING_ONLY`, `NEEDS_REVIEW`, and `RETIRED`. Public verified benchmarks require precise publication provenance before they can be labeled as verified: publishing organization, exact title/series, publication date, table/page/section/series/statistic identifier, retrieval date, unit, geography/market scope, applicability note, derivation note when calculated, and URL or stable source identifier where policy allows.

Current public-name benchmark references did not include enough exact publication metadata to support customer-facing labels such as “industry typical” or a named verified public source. They are therefore shown as directional planning ranges with the caveat: “Planning reference; validate against the customer’s operating data.” McLeod workbook ranges are labeled as McLeod planning references, not industry standards, industry averages, industry typical ranges, or published benchmarks. Internal-only rationale remains internal and is not exposed in customer exports.

Benchmarks are planning references only. They are shown separately from customer-entered assumptions and must not silently alter customer assumptions or substitute midpoint values. When benchmark provenance is included in immutable snapshots, the snapshot captures benchmark key/version, source type, approval status, source display name, displayed range, and customer-safe citation/applicability metadata so future registry changes do not rewrite historical context.

The former conservative/expected/aggressive comparison is governed as **Illustrative Sensitivity**. Defaults are centralized and versioned as Lower Realization — 85%, Base Realization — 100%, and Higher Realization — 115%. These cases scale canonical benefit outputs only and do not change module inputs, formulas, investment costs, overlap dispositions, informational capital, or persisted customer assumptions. Review displays the methodology statement: “These scenarios illustrate the impact of different benefit-realization percentages. They are not probability-weighted forecasts.” Customer PPT/PDF/HTML exports exclude illustrative sensitivity by default unless a future explicit seller inclusion workflow is added.

Benchmark references and sensitivity scenarios are planning aids. Customer-specific assumptions and approved calculation methodology remain the source of the analysis results.
