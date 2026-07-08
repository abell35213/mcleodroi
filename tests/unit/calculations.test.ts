import { describe, expect, it } from "vitest";
import { calculateValueModule, hasCalculationImplementation, moduleCalculators, WEEKS_PER_MONTH } from "@/lib/calculations";
import { getAllValueModules, valueModuleKeys } from "@/lib/modules";
import type { ModuleInputMap } from "@/lib/calculations";
import type { ValueModuleKey } from "@/lib/modules";

const happyInputs: ModuleInputMap = {
  INCREASE_UTILIZATION: { utilization_improvement_pct: 0.05, monthly_miles: 100000, monthly_loads: 200, average_revenue_per_load: 1500, incremental_margin_pct: 0.2 },
  REDUCE_DEADHEAD: { current_deadhead_pct: 0.17, target_deadhead_pct: 0.16, monthly_miles: 2500000, variable_cost_per_mile: 0.45 },
  REDUCE_OUT_OF_ROUTE: { tractor_count: 250, miles_per_tractor_month: 10000, current_oor_pct: 0.12, target_oor_pct: 0.11, average_mpg: 6.2, fuel_cost_per_gallon: 2.5 },
  DRIVER_DETENTION: { unrecovered_detention_hours_month: 100, recoverable_detention_hours_month: 25, detention_rate_per_hour: 75 },
  DRIVER_TURNOVER: { current_annual_turnover_pct: 0.4, target_annual_turnover_pct: 0.35, driver_count: 170, recruiting_cost_per_driver: 3000 },
  STREAMLINE_BACK_OFFICE: { non_ops_staff_count: 4, hourly_labor_rate: 30, working_days_month: 21, redundant_activity_pct: 0.1 },
  OPERATIONS_EFFICIENCY: { operations_staff_count: 8, hourly_labor_rate: 32, working_days_month: 21, redundant_activity_pct: 0.12 },
  TRAILER_ASSET_UTILIZATION: { trailer_count: 400, tractor_count: 155, average_trailer_value: 57500, ratio_improvement_pct: 0.02, asset_life_months: 60, residual_value_pct: 0.2 },
  BROKER_PRODUCTIVITY: { current_loads_per_broker_day: 2, target_loads_per_broker_day: 3, broker_count: 5, working_days_month: 21, average_margin_per_load: 50 },
  INSURANCE_CREDIT_MONITORING: { admin_hours_saved_month: 10, hourly_labor_rate: 30 },
  PROFIT_MARGIN_INCREASE: { monthly_gross_revenue: 1000000, current_margin_pct: 0.15, target_margin_pct: 0.17 },
  NON_OPS_PRODUCTIVITY: { redundant_hours_month: 100, hourly_labor_rate: 25 },
  BROKERAGE_LTL: { current_manual_hours_month: 100, hours_saved_month: 40, hourly_labor_rate: 30 },
  RECURRING_ORDER_AUTOMATION: { current_recurring_order_hours_month: 80, hours_saved_month: 20, hourly_labor_rate: 30 },
  RFP_PROCESS_EFFICIENCY: { current_minutes_per_rfp: 60, target_minutes_per_rfp: 30, rfps_per_month: 20, hourly_labor_rate: 50 },
  RFP_GROWTH_OPPORTUNITY: { additional_loads_week: 2, average_margin_per_load: 47.5 },
  EDI_ORDER_AUTOMATION: { edi_eligible_orders_month: 120, minutes_saved_per_order: 5, hourly_labor_rate: 30 },
  REDUCE_EDI_VAN_CHARGES: { monthly_van_cost: 1000, eliminated_cost_pct: 0.25 },
  REDUCE_HARD_BILLING_COST: { paper_invoices_month: 1000, invoices_converted_month: 250, hard_cost_per_invoice: 2 },
  REDUCE_BILLING_LABOR: { current_billing_hours_month: 168, billing_hours_saved_month: 100, hourly_labor_rate: 13 },
  SHORT_HAUL_EFFICIENCY: { tickets_per_week: 525, current_minutes_per_ticket: 5, target_minutes_per_ticket: 2, hourly_labor_rate: 30, transaction_cost_per_ticket: 0.25 },
};

function expectSuccess<K extends ValueModuleKey>(key: K, inputs: ModuleInputMap[K]) {
  const outcome = calculateValueModule(key, inputs);
  expect(outcome.success).toBe(true);
  if (!outcome.success) throw new Error("expected success");
  return outcome.result;
}

describe("calculation engine", () => {
  it("uses the canonical MVP weeks-per-month constant", () => {
    expect(WEEKS_PER_MONTH).toBe(4.33);
  });

  it("calculates a happy path for every canonical module", () => {
    for (const key of valueModuleKeys) {
      const result = expectSuccess(key, happyInputs[key]);
      expect(result.moduleKey).toBe(key);
      expect(result.valueType).toBe(getAllValueModules().find((module) => module.key === key)?.valueType);
      if (result.financialOutputs.monthlyRecurringValue !== undefined) {
        expect(result.financialOutputs.annualRecurringValue).toBe(result.financialOutputs.monthlyRecurringValue * 12);
      }
    }
  });

  it("has exactly one implementation for each registry module and none for unknown keys", () => {
    expect(Object.keys(moduleCalculators).sort()).toEqual([...valueModuleKeys].sort());
    expect(getAllValueModules()).toHaveLength(21);
    expect(hasCalculationImplementation("NOT_A_MODULE")).toBe(false);
    expect(calculateValueModule("NOT_A_MODULE", {}).success).toBe(false);
  });

  it("preserves input objects", () => {
    const input = { ...happyInputs.TRAILER_ASSET_UTILIZATION };
    const before = { ...input };
    calculateValueModule("TRAILER_ASSET_UTILIZATION", input);
    expect(input).toEqual(before);
  });

  it("validates percentages, integers, NaN, and Infinity", () => {
    expect(calculateValueModule("REDUCE_DEADHEAD", { ...happyInputs.REDUCE_DEADHEAD, current_deadhead_pct: 17 }).success).toBe(false);
    expect(calculateValueModule("REDUCE_OUT_OF_ROUTE", { ...happyInputs.REDUCE_OUT_OF_ROUTE, tractor_count: 1.5 }).success).toBe(false);
    expect(calculateValueModule("NON_OPS_PRODUCTIVITY", { redundant_hours_month: Number.NaN, hourly_labor_rate: 20 }).success).toBe(false);
    expect(calculateValueModule("NON_OPS_PRODUCTIVITY", { redundant_hours_month: Number.POSITIVE_INFINITY, hourly_labor_rate: 20 }).success).toBe(false);
  });

  it("validates cross-field business rules", () => {
    const invalids = [
      calculateValueModule("REDUCE_DEADHEAD", { ...happyInputs.REDUCE_DEADHEAD, target_deadhead_pct: 0.18 }),
      calculateValueModule("REDUCE_OUT_OF_ROUTE", { ...happyInputs.REDUCE_OUT_OF_ROUTE, target_oor_pct: 0.13 }),
      calculateValueModule("DRIVER_DETENTION", { ...happyInputs.DRIVER_DETENTION, recoverable_detention_hours_month: 101 }),
      calculateValueModule("DRIVER_TURNOVER", { ...happyInputs.DRIVER_TURNOVER, target_annual_turnover_pct: 0.41 }),
      calculateValueModule("BROKER_PRODUCTIVITY", { ...happyInputs.BROKER_PRODUCTIVITY, target_loads_per_broker_day: 1 }),
      calculateValueModule("PROFIT_MARGIN_INCREASE", { ...happyInputs.PROFIT_MARGIN_INCREASE, target_margin_pct: 0.14 }),
      calculateValueModule("BROKERAGE_LTL", { ...happyInputs.BROKERAGE_LTL, hours_saved_month: 101 }),
      calculateValueModule("RECURRING_ORDER_AUTOMATION", { ...happyInputs.RECURRING_ORDER_AUTOMATION, hours_saved_month: 81 }),
      calculateValueModule("RFP_PROCESS_EFFICIENCY", { ...happyInputs.RFP_PROCESS_EFFICIENCY, target_minutes_per_rfp: 61 }),
      calculateValueModule("REDUCE_HARD_BILLING_COST", { ...happyInputs.REDUCE_HARD_BILLING_COST, invoices_converted_month: 1001 }),
      calculateValueModule("REDUCE_BILLING_LABOR", { ...happyInputs.REDUCE_BILLING_LABOR, billing_hours_saved_month: 169 }),
      calculateValueModule("SHORT_HAUL_EFFICIENCY", { ...happyInputs.SHORT_HAUL_EFFICIENCY, target_minutes_per_ticket: 5 }),
    ];
    expect(invalids.every((outcome) => !outcome.success)).toBe(true);
  });

  it("passes mandatory regression examples", () => {
    expect(expectSuccess("BROKER_PRODUCTIVITY", happyInputs.BROKER_PRODUCTIVITY).financialOutputs.monthlyRecurringValue).toBe(5250);
    const billing = expectSuccess("REDUCE_BILLING_LABOR", happyInputs.REDUCE_BILLING_LABOR);
    expect(billing.derivedMetrics.remaining_manual_hours).toBe(68);
    expect(billing.financialOutputs.monthlyRecurringValue).toBe(1300);
    const trailer = expectSuccess("TRAILER_ASSET_UTILIZATION", happyInputs.TRAILER_ASSET_UTILIZATION);
    expect(trailer.derivedMetrics.avoided_trailers).toBeCloseTo(8);
    expect(trailer.financialOutputs.informationalCapitalValue).toBeCloseTo(460000);
    expect(trailer.financialOutputs.monthlyRecurringValue).toBeCloseTo(6133.333333);
    expect(expectSuccess("RFP_GROWTH_OPPORTUNITY", happyInputs.RFP_GROWTH_OPPORTUNITY).financialOutputs.monthlyRecurringValue).toBeCloseTo(411.35);
    expect(expectSuccess("SHORT_HAUL_EFFICIENCY", happyInputs.SHORT_HAUL_EFFICIENCY).financialOutputs.monthlyRecurringValue).toBeCloseTo(2841.5625);
    const deadhead = expectSuccess("REDUCE_DEADHEAD", happyInputs.REDUCE_DEADHEAD);
    expect(deadhead.derivedMetrics.avoided_deadhead_miles).toBeCloseTo(25000);
    expect(deadhead.financialOutputs.monthlyRecurringValue).toBeCloseTo(11250);
    const oor = expectSuccess("REDUCE_OUT_OF_ROUTE", happyInputs.REDUCE_OUT_OF_ROUTE);
    expect(oor.derivedMetrics.avoided_oor_miles).toBeCloseTo(25000);
    expect(oor.derivedMetrics.avoided_fuel_gallons).toBeCloseTo(4032.2580645);
    expect(oor.financialOutputs.monthlyRecurringValue).toBeCloseTo(10080.645161);
    const turnover = expectSuccess("DRIVER_TURNOVER", happyInputs.DRIVER_TURNOVER);
    expect(turnover.derivedMetrics.avoided_driver_replacements_annual).toBeCloseTo(8.5);
    expect(turnover.financialOutputs.annualOnlyValue).toBeCloseTo(25500);
    expect(turnover.financialOutputs.monthlyRecurringValue).toBeUndefined();
    expect(turnover.financialOutputs.annualRecurringValue).toBeUndefined();
    expect(turnover.derivedMetrics.monthly_equivalent).toBeCloseTo(2125);
  });

  it("allows negative short-haul net value", () => {
    const result = expectSuccess("SHORT_HAUL_EFFICIENCY", { ...happyInputs.SHORT_HAUL_EFFICIENCY, transaction_cost_per_ticket: 99 });
    expect(result.financialOutputs.monthlyRecurringValue).toBeLessThan(0);
  });
});
