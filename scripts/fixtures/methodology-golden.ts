import type { ModuleInputMap } from "@/lib/calculations";
import type { ValueModuleKey, ValueType } from "@/lib/modules";

/**
 * Golden-master calculation fixtures.
 *
 * Each entry pins the exact deterministic output the calculation engine
 * produces for a canonical worked example. These values are the single
 * machine-readable source of truth referenced by `docs/methodology/` and are
 * asserted in `tests/unit/methodology-golden.test.ts` so that no future change
 * can silently alter a customer-facing number.
 *
 * Methodology conventions (see `docs/methodology/README.md`):
 * - Percentage inputs use decimal representation (2% is `0.02`).
 * - `WEEKS_PER_MONTH` is fixed at `4.33`.
 * - Outputs preserve internal precision and are not display-rounded, so some
 *   expected values carry IEEE-754 floating-point artifacts on purpose.
 */
export type MethodologyGoldenCase<K extends ValueModuleKey = ValueModuleKey> = {
  readonly moduleKey: K;
  readonly inputs: ModuleInputMap[K];
  readonly expected: {
    readonly valueType: ValueType;
    readonly financialOutputs: {
      readonly monthlyRecurringValue?: number;
      readonly annualRecurringValue?: number;
      readonly annualOnlyValue?: number;
      readonly informationalCapitalValue?: number;
    };
    readonly derivedMetrics: Readonly<Record<string, number>>;
  };
};

function goldenCase<K extends ValueModuleKey>(value: MethodologyGoldenCase<K>): MethodologyGoldenCase {
  return value as MethodologyGoldenCase;
}

export const methodologyGoldenCases: readonly MethodologyGoldenCase[] = [
  goldenCase({
    moduleKey: "INCREASE_UTILIZATION",
    inputs: { utilization_improvement_pct: 0.05, monthly_miles: 100000, monthly_loads: 200, average_revenue_per_load: 1500, incremental_margin_pct: 0.2 },
    expected: {
      valueType: "REVENUE_MARGIN_OPPORTUNITY",
      financialOutputs: { monthlyRecurringValue: 3000, annualRecurringValue: 36000 },
      derivedMetrics: { average_miles_per_load: 500, additional_productive_miles: 5000, estimated_additional_loads: 10, additional_revenue_capacity: 15000, monthly_opportunity: 3000 },
    },
  }),
  goldenCase({
    moduleKey: "REDUCE_DEADHEAD",
    inputs: { current_deadhead_pct: 0.17, target_deadhead_pct: 0.16, monthly_miles: 2500000, variable_cost_per_mile: 0.45 },
    expected: {
      valueType: "COST_REDUCTION",
      financialOutputs: { monthlyRecurringValue: 11250, annualRecurringValue: 135000 },
      derivedMetrics: { deadhead_improvement_pct: 0.01, avoided_deadhead_miles: 25000, monthly_opportunity: 11250 },
    },
  }),
  goldenCase({
    moduleKey: "REDUCE_OUT_OF_ROUTE",
    inputs: { tractor_count: 250, miles_per_tractor_month: 10000, current_oor_pct: 0.12, target_oor_pct: 0.11, average_mpg: 6.2, fuel_cost_per_gallon: 2.5 },
    expected: {
      valueType: "COST_REDUCTION",
      financialOutputs: { monthlyRecurringValue: 10080.645161290318, annualRecurringValue: 120967.74193548382 },
      derivedMetrics: { monthly_fleet_miles: 2500000, oor_improvement_pct: 0.01, avoided_oor_miles: 25000, avoided_fuel_gallons: 4032.258064516129, monthly_opportunity: 10080.645161290318 },
    },
  }),
  goldenCase({
    moduleKey: "DRIVER_DETENTION",
    inputs: { unrecovered_detention_hours_month: 100, recoverable_detention_hours_month: 25, detention_rate_per_hour: 75 },
    expected: {
      valueType: "REVENUE_MARGIN_OPPORTUNITY",
      financialOutputs: { monthlyRecurringValue: 1875, annualRecurringValue: 22500 },
      derivedMetrics: { remaining_unrecovered_hours: 75, monthly_opportunity: 1875 },
    },
  }),
  goldenCase({
    moduleKey: "DRIVER_TURNOVER",
    inputs: { current_annual_turnover_pct: 0.4, target_annual_turnover_pct: 0.35, driver_count: 170, recruiting_cost_per_driver: 3000 },
    expected: {
      valueType: "COST_AVOIDANCE",
      financialOutputs: { annualOnlyValue: 25500 },
      derivedMetrics: { turnover_improvement_pct: 0.05, avoided_driver_replacements_annual: 8.5, annual_opportunity: 25500, monthly_equivalent: 2125 },
    },
  }),
  goldenCase({
    moduleKey: "STREAMLINE_BACK_OFFICE",
    inputs: { non_ops_staff_count: 4, hourly_labor_rate: 30, working_days_month: 21, redundant_activity_pct: 0.1 },
    expected: {
      valueType: "CAPACITY_VALUE",
      financialOutputs: { monthlyRecurringValue: 2016, annualRecurringValue: 24192 },
      derivedMetrics: { monthly_staff_hours: 672, addressable_hours: 67.2, monthly_capacity_value: 2016 },
    },
  }),
  goldenCase({
    moduleKey: "OPERATIONS_EFFICIENCY",
    inputs: { operations_staff_count: 8, hourly_labor_rate: 32, working_days_month: 21, redundant_activity_pct: 0.12 },
    expected: {
      valueType: "CAPACITY_VALUE",
      financialOutputs: { monthlyRecurringValue: 5160.96, annualRecurringValue: 61931.520000000004 },
      derivedMetrics: { monthly_operations_hours: 1344, addressable_operations_hours: 161.28, monthly_capacity_value: 5160.96 },
    },
  }),
  goldenCase({
    moduleKey: "TRAILER_ASSET_UTILIZATION",
    inputs: { trailer_count: 400, tractor_count: 155, average_trailer_value: 57500, ratio_improvement_pct: 0.02, asset_life_months: 60, residual_value_pct: 0.2 },
    expected: {
      valueType: "CAPITAL_AVOIDANCE",
      financialOutputs: { monthlyRecurringValue: 6133.333333333377, annualRecurringValue: 73600.00000000052, informationalCapitalValue: 460000.00000000326 },
      derivedMetrics: { current_trailer_ratio: 2.5806451612903225, target_trailer_ratio: 2.529032258064516, target_trailer_requirement: 391.99999999999994, avoided_trailers: 8.000000000000057, avoided_capital_investment: 460000.00000000326, depreciable_value_pct: 0.8, monthly_equivalent_value: 6133.333333333377 },
    },
  }),
  goldenCase({
    moduleKey: "BROKER_PRODUCTIVITY",
    inputs: { current_loads_per_broker_day: 2, target_loads_per_broker_day: 3, broker_count: 5, working_days_month: 21, average_margin_per_load: 50 },
    expected: {
      valueType: "REVENUE_MARGIN_OPPORTUNITY",
      financialOutputs: { monthlyRecurringValue: 5250, annualRecurringValue: 63000 },
      derivedMetrics: { additional_loads_per_broker_day: 1, additional_loads_per_day: 5, additional_loads_per_month: 105, monthly_opportunity: 5250 },
    },
  }),
  goldenCase({
    moduleKey: "INSURANCE_CREDIT_MONITORING",
    inputs: { admin_hours_saved_month: 10, hourly_labor_rate: 30 },
    expected: {
      valueType: "CAPACITY_VALUE",
      financialOutputs: { monthlyRecurringValue: 300, annualRecurringValue: 3600 },
      derivedMetrics: { monthly_capacity_value: 300 },
    },
  }),
  goldenCase({
    moduleKey: "PROFIT_MARGIN_INCREASE",
    inputs: { monthly_gross_revenue: 1000000, current_margin_pct: 0.15, target_margin_pct: 0.17 },
    expected: {
      valueType: "REVENUE_MARGIN_OPPORTUNITY",
      financialOutputs: { monthlyRecurringValue: 20000.00000000002, annualRecurringValue: 240000.00000000023 },
      derivedMetrics: { margin_improvement_points: 0.020000000000000018, current_monthly_gross_margin: 150000, target_monthly_gross_margin: 170000, monthly_opportunity: 20000.00000000002 },
    },
  }),
  goldenCase({
    moduleKey: "NON_OPS_PRODUCTIVITY",
    inputs: { redundant_hours_month: 100, hourly_labor_rate: 25 },
    expected: {
      valueType: "CAPACITY_VALUE",
      financialOutputs: { monthlyRecurringValue: 2500, annualRecurringValue: 30000 },
      derivedMetrics: { monthly_capacity_value: 2500 },
    },
  }),
  goldenCase({
    moduleKey: "BROKERAGE_LTL",
    inputs: { current_manual_hours_month: 100, hours_saved_month: 40, hourly_labor_rate: 30 },
    expected: {
      valueType: "CAPACITY_VALUE",
      financialOutputs: { monthlyRecurringValue: 1200, annualRecurringValue: 14400 },
      derivedMetrics: { remaining_manual_hours: 60, monthly_capacity_value: 1200 },
    },
  }),
  goldenCase({
    moduleKey: "RECURRING_ORDER_AUTOMATION",
    inputs: { current_recurring_order_hours_month: 80, hours_saved_month: 20, hourly_labor_rate: 30 },
    expected: {
      valueType: "CAPACITY_VALUE",
      financialOutputs: { monthlyRecurringValue: 600, annualRecurringValue: 7200 },
      derivedMetrics: { remaining_recurring_order_hours: 60, monthly_capacity_value: 600 },
    },
  }),
  goldenCase({
    moduleKey: "RFP_PROCESS_EFFICIENCY",
    inputs: { current_minutes_per_rfp: 60, target_minutes_per_rfp: 30, rfps_per_month: 20, hourly_labor_rate: 50 },
    expected: {
      valueType: "CAPACITY_VALUE",
      financialOutputs: { monthlyRecurringValue: 500, annualRecurringValue: 6000 },
      derivedMetrics: { minutes_saved_per_rfp: 30, current_hours_month: 20, target_hours_month: 10, hours_recovered_month: 10, monthly_capacity_value: 500 },
    },
  }),
  goldenCase({
    moduleKey: "RFP_GROWTH_OPPORTUNITY",
    inputs: { additional_loads_week: 2, average_margin_per_load: 47.5 },
    expected: {
      valueType: "REVENUE_MARGIN_OPPORTUNITY",
      financialOutputs: { monthlyRecurringValue: 411.35, annualRecurringValue: 4936.200000000001 },
      derivedMetrics: { weeks_per_month: 4.33, additional_loads_month: 8.66, monthly_opportunity: 411.35 },
    },
  }),
  goldenCase({
    moduleKey: "EDI_ORDER_AUTOMATION",
    inputs: { edi_eligible_orders_month: 120, minutes_saved_per_order: 5, hourly_labor_rate: 30 },
    expected: {
      valueType: "CAPACITY_VALUE",
      financialOutputs: { monthlyRecurringValue: 300, annualRecurringValue: 3600 },
      derivedMetrics: { minutes_recovered_month: 600, hours_recovered_month: 10, monthly_capacity_value: 300 },
    },
  }),
  goldenCase({
    moduleKey: "REDUCE_EDI_VAN_CHARGES",
    inputs: { monthly_van_cost: 1000, eliminated_cost_pct: 0.25 },
    expected: {
      valueType: "COST_REDUCTION",
      financialOutputs: { monthlyRecurringValue: 250, annualRecurringValue: 3000 },
      derivedMetrics: { remaining_van_cost: 750, monthly_opportunity: 250 },
    },
  }),
  goldenCase({
    moduleKey: "REDUCE_HARD_BILLING_COST",
    inputs: { paper_invoices_month: 1000, invoices_converted_month: 250, hard_cost_per_invoice: 2 },
    expected: {
      valueType: "COST_REDUCTION",
      financialOutputs: { monthlyRecurringValue: 500, annualRecurringValue: 6000 },
      derivedMetrics: { remaining_paper_invoices: 750, monthly_opportunity: 500 },
    },
  }),
  goldenCase({
    moduleKey: "REDUCE_BILLING_LABOR",
    inputs: { current_billing_hours_month: 168, billing_hours_saved_month: 100, hourly_labor_rate: 13 },
    expected: {
      valueType: "CAPACITY_VALUE",
      financialOutputs: { monthlyRecurringValue: 1300, annualRecurringValue: 15600 },
      derivedMetrics: { remaining_manual_hours: 68, monthly_capacity_value: 1300 },
    },
  }),
  goldenCase({
    moduleKey: "SHORT_HAUL_EFFICIENCY",
    inputs: { tickets_per_week: 525, current_minutes_per_ticket: 5, target_minutes_per_ticket: 2, hourly_labor_rate: 30, transaction_cost_per_ticket: 0.25 },
    expected: {
      valueType: "NET_CAPACITY_VALUE",
      financialOutputs: { monthlyRecurringValue: 2841.5625, annualRecurringValue: 34098.75 },
      derivedMetrics: { weeks_per_month: 4.33, minutes_saved_per_ticket: 3, monthly_ticket_volume: 2273.25, hours_recovered_month: 113.6625, gross_capacity_value: 3409.875, monthly_transaction_cost: 568.3125, monthly_net_value: 2841.5625 },
    },
  }),
];
