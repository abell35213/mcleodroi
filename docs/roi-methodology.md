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
