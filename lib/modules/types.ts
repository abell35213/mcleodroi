export const businessTypes = ["TRUCKLOAD", "BROKERAGE"] as const;
export type BusinessType = (typeof businessTypes)[number];

export const valueTypes = [
  "REVENUE_MARGIN_OPPORTUNITY",
  "COST_REDUCTION",
  "CAPACITY_VALUE",
  "NET_CAPACITY_VALUE",
  "COST_AVOIDANCE",
  "CAPITAL_AVOIDANCE",
] as const;
export type ValueType = (typeof valueTypes)[number];

export const productContexts = ["LOADMASTER", "POWERBROKER"] as const;
export type ProductContext = (typeof productContexts)[number];

export const narrativeStatuses = ["DRAFT_APPROVED", "NEEDS_PRODUCT_REVIEW"] as const;
export type NarrativeStatus = (typeof narrativeStatuses)[number];

export const inputTypes = ["NUMBER", "INTEGER", "CURRENCY", "PERCENTAGE"] as const;
export type InputType = (typeof inputTypes)[number];

export const inputUnits = [
  "NONE",
  "COUNT",
  "MILES",
  "MILES_PER_MONTH",
  "MILES_PER_TRACTOR_MONTH",
  "PERCENT",
  "CURRENCY",
  "CURRENCY_PER_MILE",
  "CURRENCY_PER_GALLON",
  "CURRENCY_PER_HOUR",
  "CURRENCY_PER_LOAD",
  "CURRENCY_PER_INVOICE",
  "CURRENCY_PER_TICKET",
  "HOURS",
  "HOURS_PER_MONTH",
  "MINUTES",
  "MINUTES_PER_ORDER",
  "MINUTES_PER_RFP",
  "MINUTES_PER_TICKET",
  "LOADS_PER_DAY",
  "LOADS_PER_WEEK",
  "WORKING_DAYS_PER_MONTH",
  "MPG",
] as const;
export type InputUnit = (typeof inputUnits)[number];

export const valueModuleKeys = [
  "INCREASE_UTILIZATION",
  "REDUCE_DEADHEAD",
  "REDUCE_OUT_OF_ROUTE",
  "DRIVER_DETENTION",
  "DRIVER_TURNOVER",
  "STREAMLINE_BACK_OFFICE",
  "OPERATIONS_EFFICIENCY",
  "TRAILER_ASSET_UTILIZATION",
  "BROKER_PRODUCTIVITY",
  "INSURANCE_CREDIT_MONITORING",
  "PROFIT_MARGIN_INCREASE",
  "NON_OPS_PRODUCTIVITY",
  "BROKERAGE_LTL",
  "RECURRING_ORDER_AUTOMATION",
  "RFP_PROCESS_EFFICIENCY",
  "RFP_GROWTH_OPPORTUNITY",
  "EDI_ORDER_AUTOMATION",
  "REDUCE_EDI_VAN_CHARGES",
  "REDUCE_HARD_BILLING_COST",
  "REDUCE_BILLING_LABOR",
  "SHORT_HAUL_EFFICIENCY",
] as const;
export type ValueModuleKey = (typeof valueModuleKeys)[number];

export const categoryKeys = [
  "TL_SALES_CUSTOMER_SERVICE",
  "TL_TRUCKING_OPERATIONS",
  "TL_BACK_OFFICE",
  "TL_STRATEGY_ANALYTICS",
  "BR_CARRIER_BASE",
  "BR_SHIPPER_SALES",
  "BR_BACK_OFFICE",
  "BR_STRATEGIC",
] as const;
export type CategoryKey = (typeof categoryKeys)[number];

export const overlapGroupKeys = [
  "ASSET_PRODUCTIVITY",
  "OPERATIONS_REDUNDANT_LABOR",
  "BACK_OFFICE_REDUNDANT_LABOR",
  "RFP_VALUE",
  "BILLING_EFFICIENCY",
] as const;
export type OverlapGroupKey = (typeof overlapGroupKeys)[number];

export const overlapNoticeTypes = ["INFORMATION", "REVIEW"] as const;
export type OverlapNoticeType = (typeof overlapNoticeTypes)[number];

/** A sourced benchmark reference for building buyer trust in an assumption. */
export interface BenchmarkSource {
  /** Short label surfaced next to the input (e.g. "ATRI"). */
  readonly label: string;
  /** Full citation surfaced in tooltips and the assumptions/sources appendix. */
  readonly citation: string;
}

/**
 * Optional industry-typical range and citation for an input. Values use the same
 * convention as the input itself (percentages as decimals, currency in dollars),
 * so they can be formatted with the same display helpers as entered values.
 */
export interface InputBenchmark {
  /** Inclusive lower end of the industry-typical range. */
  readonly typicalMin: number;
  /** Inclusive upper end of the industry-typical range. */
  readonly typicalMax: number;
  readonly source: BenchmarkSource;
}

export interface ValueModuleInputDefinition {
  readonly key: string;
  readonly label: string;
  readonly type: InputType;
  readonly unit: InputUnit;
  readonly required: boolean;
  readonly helpText: string;
  readonly defaultValue?: number;
  readonly displayOrder: number;
  /** Optional inclusive lower bound enforced by the calculation validation layer. */
  readonly min?: number;
  /** Optional inclusive upper bound enforced by the calculation validation layer. */
  readonly max?: number;
  /** Optional sourced industry-typical range surfaced as credibility metadata. */
  readonly benchmark?: InputBenchmark;
}

export interface ValueModuleDefinition {
  readonly key: ValueModuleKey;
  readonly name: string;
  readonly description: string;
  readonly businessTypes: readonly BusinessType[];
  readonly productContexts: readonly ProductContext[];
  readonly valueType: ValueType;
  readonly inputDefinitions: readonly ValueModuleInputDefinition[];
  readonly overlapGroups: readonly OverlapGroupKey[];
  readonly narrativeStatus: NarrativeStatus;
  readonly displayOrder: number;
}

export interface ValueModuleCategoryDefinition {
  readonly key: CategoryKey;
  readonly businessType: BusinessType;
  readonly productContext: ProductContext;
  readonly name: string;
  readonly displayOrder: number;
}

export interface ModuleCategoryMapping {
  readonly moduleKey: ValueModuleKey;
  readonly categoryKey: CategoryKey;
}

export interface OverlapGroupDefinition {
  readonly key: OverlapGroupKey;
  readonly modules: readonly ValueModuleKey[];
  readonly type: OverlapNoticeType;
  readonly message: string;
}

export interface OverlapNotice extends OverlapGroupDefinition {
  readonly selectedModuleKeys: readonly ValueModuleKey[];
}
