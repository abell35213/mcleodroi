# McLeod ROI Builder — Authoritative Methodology Workbook

This directory is the **single source of truth** for the deterministic value
methodology. Every formula, unit convention, and worked example here is
validated against the TypeScript calculation engine by the golden-master test
suite, so the code and this workbook can never silently diverge.

- **Machine-readable source of truth:** `scripts/fixtures/methodology-golden.ts`
  — pins the exact worked-example inputs and expected outputs for all 21
  modules.
- **Golden-master test:** `tests/unit/methodology-golden.test.ts` — asserts the
  live engine reproduces every pinned output; fails on any drift.
- **Spreadsheet form:** [`worked-examples.csv`](./worked-examples.csv) — a flat,
  diff-friendly spreadsheet regenerated from the fixtures with
  `npm run methodology:workbook`. Do not edit it by hand.

## Conventions

- **Percentages use decimal representation.** Pass 2% as `0.02`, 17% as `0.17`,
  100% as `1`. Percentage inputs are validated to the range `0`–`1`.
- **Weeks per month is fixed at `4.33`** (`WEEKS_PER_MONTH`) for the MVP
  methodology.
- **Internal precision is preserved.** Calculations never apply display
  rounding, so some expected outputs carry IEEE-754 floating-point artifacts
  (e.g. `11250.000000000011`). Display rounding is a presentation concern only.
- **Capacity value is recovered capacity, not automatic cash savings.** Modules
  with `valueType` `CAPACITY_VALUE`/`NET_CAPACITY_VALUE` model addressable labor
  capacity.
- **Capital avoidance is reported separately.** Trailer avoided capital is an
  `informationalCapitalValue`, distinct from its recurring monthly equivalent.
- **Annual-only value is not annualized into a monthly recurring total.** Driver
  Turnover reports `annualOnlyValue`; its `monthly_equivalent` is a derived
  metric only.

## Financial output fields

| Field | Meaning |
| --- | --- |
| `monthlyRecurringValue` | Recurring monthly economic value. |
| `annualRecurringValue` | `monthlyRecurringValue * 12` for recurring modules. |
| `annualOnlyValue` | Annual cost avoidance that is not a recurring monthly stream. |
| `informationalCapitalValue` | One-time capital avoidance, reported separately from recurring value. |

## Per-module formulas

Percentages below are decimals. Each module's worked example (inputs and every
expected output) is enumerated in the CSV and fixtures.

### Truckload

- **INCREASE_UTILIZATION** (`REVENUE_MARGIN_OPPORTUNITY`)
  - `average_miles_per_load = monthly_miles / monthly_loads`
  - `additional_productive_miles = monthly_miles * utilization_improvement_pct`
  - `estimated_additional_loads = additional_productive_miles / average_miles_per_load`
  - `additional_revenue_capacity = estimated_additional_loads * average_revenue_per_load`
  - `monthlyRecurringValue = additional_revenue_capacity * incremental_margin_pct`
- **REDUCE_DEADHEAD** (`COST_REDUCTION`)
  - `deadhead_improvement_pct = current_deadhead_pct - target_deadhead_pct`
  - `avoided_deadhead_miles = monthly_miles * deadhead_improvement_pct`
  - `monthlyRecurringValue = avoided_deadhead_miles * variable_cost_per_mile`
- **REDUCE_OUT_OF_ROUTE** (`COST_REDUCTION`)
  - `monthly_fleet_miles = tractor_count * miles_per_tractor_month`
  - `oor_improvement_pct = current_oor_pct - target_oor_pct`
  - `avoided_oor_miles = monthly_fleet_miles * oor_improvement_pct`
  - `avoided_fuel_gallons = avoided_oor_miles / average_mpg`
  - `monthlyRecurringValue = avoided_fuel_gallons * fuel_cost_per_gallon`
- **DRIVER_DETENTION** (`REVENUE_MARGIN_OPPORTUNITY`)
  - `remaining_unrecovered_hours = unrecovered_detention_hours_month - recoverable_detention_hours_month`
  - `monthlyRecurringValue = recoverable_detention_hours_month * detention_rate_per_hour`
- **DRIVER_TURNOVER** (`COST_AVOIDANCE`, annual-only)
  - `turnover_improvement_pct = current_annual_turnover_pct - target_annual_turnover_pct`
  - `avoided_driver_replacements_annual = turnover_improvement_pct * driver_count`
  - `annualOnlyValue = avoided_driver_replacements_annual * recruiting_cost_per_driver`
  - `monthly_equivalent = annualOnlyValue / 12` (derived only)
- **STREAMLINE_BACK_OFFICE** (`CAPACITY_VALUE`)
  - `monthly_staff_hours = non_ops_staff_count * working_days_month * 8`
  - `addressable_hours = monthly_staff_hours * redundant_activity_pct`
  - `monthlyRecurringValue = addressable_hours * hourly_labor_rate`
- **OPERATIONS_EFFICIENCY** (`CAPACITY_VALUE`)
  - `monthly_operations_hours = operations_staff_count * working_days_month * 8`
  - `addressable_operations_hours = monthly_operations_hours * redundant_activity_pct`
  - `monthlyRecurringValue = addressable_operations_hours * hourly_labor_rate`
- **TRAILER_ASSET_UTILIZATION** (`CAPITAL_AVOIDANCE`)
  - `current_trailer_ratio = trailer_count / tractor_count`
  - `target_trailer_ratio = current_trailer_ratio * (1 - ratio_improvement_pct)`
  - `target_trailer_requirement = tractor_count * target_trailer_ratio`
  - `avoided_trailers = trailer_count - target_trailer_requirement`
  - `avoided_capital_investment = avoided_trailers * average_trailer_value` (reported as `informationalCapitalValue`)
  - `depreciable_value_pct = 1 - residual_value_pct`
  - `monthlyRecurringValue = avoided_capital_investment * depreciable_value_pct / asset_life_months`

### Brokerage

- **BROKER_PRODUCTIVITY** (`REVENUE_MARGIN_OPPORTUNITY`)
  - `additional_loads_per_broker_day = target_loads_per_broker_day - current_loads_per_broker_day`
  - `additional_loads_per_day = additional_loads_per_broker_day * broker_count`
  - `additional_loads_per_month = additional_loads_per_day * working_days_month`
  - `monthlyRecurringValue = additional_loads_per_month * average_margin_per_load`
- **PROFIT_MARGIN_INCREASE** (`REVENUE_MARGIN_OPPORTUNITY`)
  - `margin_improvement_points = target_margin_pct - current_margin_pct`
  - `monthlyRecurringValue = monthly_gross_revenue * margin_improvement_points`
- **BROKERAGE_LTL** (`CAPACITY_VALUE`)
  - `remaining_manual_hours = current_manual_hours_month - hours_saved_month`
  - `monthlyRecurringValue = hours_saved_month * hourly_labor_rate`
- **RECURRING_ORDER_AUTOMATION** (`CAPACITY_VALUE`)
  - `remaining_recurring_order_hours = current_recurring_order_hours_month - hours_saved_month`
  - `monthlyRecurringValue = hours_saved_month * hourly_labor_rate`
- **RFP_PROCESS_EFFICIENCY** (`CAPACITY_VALUE`)
  - `minutes_saved_per_rfp = current_minutes_per_rfp - target_minutes_per_rfp`
  - `hours_recovered_month = (minutes_saved_per_rfp * rfps_per_month) / 60`
  - `monthlyRecurringValue = hours_recovered_month * hourly_labor_rate`
- **RFP_GROWTH_OPPORTUNITY** (`REVENUE_MARGIN_OPPORTUNITY`)
  - `additional_loads_month = additional_loads_week * 4.33`
  - `monthlyRecurringValue = additional_loads_month * average_margin_per_load`
- **EDI_ORDER_AUTOMATION** (`CAPACITY_VALUE`)
  - `minutes_recovered_month = edi_eligible_orders_month * minutes_saved_per_order`
  - `hours_recovered_month = minutes_recovered_month / 60`
  - `monthlyRecurringValue = hours_recovered_month * hourly_labor_rate`
- **REDUCE_EDI_VAN_CHARGES** (`COST_REDUCTION`)
  - `monthlyRecurringValue = monthly_van_cost * eliminated_cost_pct`
  - `remaining_van_cost = monthly_van_cost - monthlyRecurringValue`
- **REDUCE_HARD_BILLING_COST** (`COST_REDUCTION`)
  - `remaining_paper_invoices = paper_invoices_month - invoices_converted_month`
  - `monthlyRecurringValue = invoices_converted_month * hard_cost_per_invoice`
- **REDUCE_BILLING_LABOR** (`CAPACITY_VALUE`)
  - `remaining_manual_hours = current_billing_hours_month - billing_hours_saved_month`
  - `monthlyRecurringValue = billing_hours_saved_month * hourly_labor_rate`
- **SHORT_HAUL_EFFICIENCY** (`NET_CAPACITY_VALUE`)
  - `minutes_saved_per_ticket = current_minutes_per_ticket - target_minutes_per_ticket`
  - `monthly_ticket_volume = tickets_per_week * 4.33`
  - `hours_recovered_month = (monthly_ticket_volume * minutes_saved_per_ticket) / 60`
  - `gross_capacity_value = hours_recovered_month * hourly_labor_rate`
  - `monthly_transaction_cost = monthly_ticket_volume * transaction_cost_per_ticket`
  - `monthlyRecurringValue = gross_capacity_value - monthly_transaction_cost` (may be negative)

### Shared

- **INSURANCE_CREDIT_MONITORING** (`CAPACITY_VALUE`)
  - `monthlyRecurringValue = admin_hours_saved_month * hourly_labor_rate`
- **NON_OPS_PRODUCTIVITY** (`CAPACITY_VALUE`)
  - `monthlyRecurringValue = redundant_hours_month * hourly_labor_rate`

## ROI, payback, NPV, and IRR layer

The finance-grade ROI layer (net annual benefit, ROI %, simple payback, NPV,
IRR, and the multi-year cumulative benefit curve, with an optional adoption
ramp) is documented in the root `README.md` and pinned by
`scripts/fixtures/roi-golden.ts` plus `tests/unit/roi.test.ts`. Seller-entered
investment inputs are persisted on the `Analysis` record and wired into
`calculateAnalysis`, covered by `tests/integration/analysis-investment.test.ts`.
It is additive: analyses without seller-entered investment are unaffected.

## Changing a formula

1. Update the calculation module in `lib/calculations/modules/`.
2. Update the pinned expected values in `scripts/fixtures/methodology-golden.ts`.
3. Regenerate the spreadsheet: `npm run methodology:workbook`.
4. Update the formula description in this file.
5. Run `npm run verify`. A changed customer-facing number that is *not*
   reflected in the golden fixtures will fail the golden-master test by design.
