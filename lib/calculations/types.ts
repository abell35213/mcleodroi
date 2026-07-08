import type { ValueModuleKey, ValueType } from "@/lib/modules";

export type FinancialOutputs = {
  readonly monthlyRecurringValue?: number;
  readonly annualRecurringValue?: number;
  readonly annualOnlyValue?: number;
  readonly informationalCapitalValue?: number;
};

export type ValidationIssue = {
  readonly code: string;
  readonly field?: string;
  readonly message: string;
};

export type CalculationOutcome<T> = { readonly success: true; readonly result: T } | { readonly success: false; readonly issues: ValidationIssue[] };

type BaseCalculationResult<TKey extends ValueModuleKey, TMetrics extends object> = {
  readonly moduleKey: TKey;
  readonly valueType: ValueType;
  readonly financialOutputs: FinancialOutputs;
  readonly derivedMetrics: Readonly<TMetrics>;
};

export type IncreaseUtilizationInputs = { utilization_improvement_pct: number; monthly_miles: number; monthly_loads: number; average_revenue_per_load: number; incremental_margin_pct: number };
export type ReduceDeadheadInputs = { current_deadhead_pct: number; target_deadhead_pct: number; monthly_miles: number; variable_cost_per_mile: number };
export type ReduceOutOfRouteInputs = { tractor_count: number; miles_per_tractor_month: number; current_oor_pct: number; target_oor_pct: number; average_mpg: number; fuel_cost_per_gallon: number };
export type DriverDetentionInputs = { unrecovered_detention_hours_month: number; recoverable_detention_hours_month: number; detention_rate_per_hour: number };
export type DriverTurnoverInputs = { current_annual_turnover_pct: number; target_annual_turnover_pct: number; driver_count: number; recruiting_cost_per_driver: number };
export type StreamlineBackOfficeInputs = { non_ops_staff_count: number; hourly_labor_rate: number; working_days_month: number; redundant_activity_pct: number };
export type OperationsEfficiencyInputs = { operations_staff_count: number; hourly_labor_rate: number; working_days_month: number; redundant_activity_pct: number };
export type TrailerAssetUtilizationInputs = { trailer_count: number; tractor_count: number; average_trailer_value: number; ratio_improvement_pct: number; asset_life_months: number; residual_value_pct: number };
export type BrokerProductivityInputs = { current_loads_per_broker_day: number; target_loads_per_broker_day: number; broker_count: number; working_days_month: number; average_margin_per_load: number };
export type InsuranceCreditMonitoringInputs = { admin_hours_saved_month: number; hourly_labor_rate: number };
export type ProfitMarginIncreaseInputs = { monthly_gross_revenue: number; current_margin_pct: number; target_margin_pct: number };
export type NonOpsProductivityInputs = { redundant_hours_month: number; hourly_labor_rate: number };
export type BrokerageLtlInputs = { current_manual_hours_month: number; hours_saved_month: number; hourly_labor_rate: number };
export type RecurringOrderAutomationInputs = { current_recurring_order_hours_month: number; hours_saved_month: number; hourly_labor_rate: number };
export type RfpProcessEfficiencyInputs = { current_minutes_per_rfp: number; target_minutes_per_rfp: number; rfps_per_month: number; hourly_labor_rate: number };
export type RfpGrowthOpportunityInputs = { additional_loads_week: number; average_margin_per_load: number };
export type EdiOrderAutomationInputs = { edi_eligible_orders_month: number; minutes_saved_per_order: number; hourly_labor_rate: number };
export type ReduceEdiVanChargesInputs = { monthly_van_cost: number; eliminated_cost_pct: number };
export type ReduceHardBillingCostInputs = { paper_invoices_month: number; invoices_converted_month: number; hard_cost_per_invoice: number };
export type ReduceBillingLaborInputs = { current_billing_hours_month: number; billing_hours_saved_month: number; hourly_labor_rate: number };
export type ShortHaulEfficiencyInputs = { tickets_per_week: number; current_minutes_per_ticket: number; target_minutes_per_ticket: number; hourly_labor_rate: number; transaction_cost_per_ticket: number };

export type ModuleInputMap = {
  INCREASE_UTILIZATION: IncreaseUtilizationInputs; REDUCE_DEADHEAD: ReduceDeadheadInputs; REDUCE_OUT_OF_ROUTE: ReduceOutOfRouteInputs; DRIVER_DETENTION: DriverDetentionInputs; DRIVER_TURNOVER: DriverTurnoverInputs; STREAMLINE_BACK_OFFICE: StreamlineBackOfficeInputs; OPERATIONS_EFFICIENCY: OperationsEfficiencyInputs; TRAILER_ASSET_UTILIZATION: TrailerAssetUtilizationInputs; BROKER_PRODUCTIVITY: BrokerProductivityInputs; INSURANCE_CREDIT_MONITORING: InsuranceCreditMonitoringInputs; PROFIT_MARGIN_INCREASE: ProfitMarginIncreaseInputs; NON_OPS_PRODUCTIVITY: NonOpsProductivityInputs; BROKERAGE_LTL: BrokerageLtlInputs; RECURRING_ORDER_AUTOMATION: RecurringOrderAutomationInputs; RFP_PROCESS_EFFICIENCY: RfpProcessEfficiencyInputs; RFP_GROWTH_OPPORTUNITY: RfpGrowthOpportunityInputs; EDI_ORDER_AUTOMATION: EdiOrderAutomationInputs; REDUCE_EDI_VAN_CHARGES: ReduceEdiVanChargesInputs; REDUCE_HARD_BILLING_COST: ReduceHardBillingCostInputs; REDUCE_BILLING_LABOR: ReduceBillingLaborInputs; SHORT_HAUL_EFFICIENCY: ShortHaulEfficiencyInputs;
};

export type CalculationResult<TKey extends ValueModuleKey = ValueModuleKey, TMetrics extends object = Record<string, number>> = BaseCalculationResult<TKey, TMetrics>;
export type ModuleResultMap = { [K in keyof ModuleInputMap]: CalculationResult<K> };
export type ModuleCalculator<K extends ValueModuleKey> = (inputs: ModuleInputMap[K]) => CalculationOutcome<ModuleResultMap[K]>;
