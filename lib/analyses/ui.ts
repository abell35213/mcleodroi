import type { CalculatedAnalysis, CalculatedAnalysisModule } from "@/lib/analyses/types";
import type { ValueModuleDefinition, ValueModuleInputDefinition, ValueModuleKey } from "@/lib/modules";
import { getAllValueModules } from "@/lib/modules";

export function toEngineInputValue(input: ValueModuleInputDefinition, value: number): number {
  return input.type === "PERCENTAGE" ? value / 100 : value;
}

export function toDisplayInputValue(input: ValueModuleInputDefinition, value: number): number {
  return input.type === "PERCENTAGE" ? value * 100 : value;
}

export function resolveDisplayValue(input: ValueModuleInputDefinition, persistedValue: number | undefined): { value: number | undefined; isDefault: boolean } {
  if (persistedValue !== undefined) return { value: toDisplayInputValue(input, persistedValue), isDefault: false };
  if (input.defaultValue !== undefined) return { value: toDisplayInputValue(input, input.defaultValue), isDefault: true };
  return { value: undefined, isDefault: false };
}

export function getPreferredResumeRoute(analysisId: string, calculated: Pick<CalculatedAnalysis, "workflowReadiness" | "summary">): string {
  if (!calculated.workflowReadiness.hasSelectedModules) return `/analyses/${analysisId}/opportunities`;
  if (calculated.workflowReadiness.canReview) return `/analyses/${analysisId}/review`;
  return `/analyses/${analysisId}/assessment`;
}

export function resolveActiveModuleKey(modules: readonly Pick<CalculatedAnalysisModule, "moduleKey" | "status">[], requested?: string | null): ValueModuleKey | null {
  const requestedModule = modules.find((module) => module.moduleKey === requested);
  if (requestedModule) return requestedModule.moduleKey;
  const firstIncomplete = modules.find((module) => module.status !== "COMPLETE");
  return (firstIncomplete ?? modules[0])?.moduleKey ?? null;
}

export const primaryFinancialLabels: Record<ValueModuleKey, string> = {
  INCREASE_UTILIZATION: "Estimated Margin Opportunity",
  REDUCE_DEADHEAD: "Estimated Operating Cost Opportunity",
  REDUCE_OUT_OF_ROUTE: "Estimated Fuel Cost Opportunity",
  DRIVER_DETENTION: "Estimated Revenue Opportunity",
  DRIVER_TURNOVER: "Estimated Annual Cost Avoidance",
  STREAMLINE_BACK_OFFICE: "Estimated Labor-Capacity Value",
  OPERATIONS_EFFICIENCY: "Estimated Labor-Capacity Value",
  TRAILER_ASSET_UTILIZATION: "Monthly Equivalent Economic Value",
  BROKER_PRODUCTIVITY: "Estimated Gross-Margin Opportunity",
  INSURANCE_CREDIT_MONITORING: "Estimated Labor-Capacity Value",
  PROFIT_MARGIN_INCREASE: "Additional Retained Margin",
  NON_OPS_PRODUCTIVITY: "Estimated Labor-Capacity Value",
  BROKERAGE_LTL: "Estimated Labor-Capacity Value",
  RECURRING_ORDER_AUTOMATION: "Estimated Labor-Capacity Value",
  RFP_PROCESS_EFFICIENCY: "Estimated Labor-Capacity Value",
  RFP_GROWTH_OPPORTUNITY: "Estimated Gross-Margin Opportunity",
  EDI_ORDER_AUTOMATION: "Estimated Labor-Capacity Value",
  REDUCE_EDI_VAN_CHARGES: "Estimated Annual Cost Avoidance",
  REDUCE_HARD_BILLING_COST: "Estimated Annual Cost Avoidance",
  REDUCE_BILLING_LABOR: "Estimated Labor-Capacity Value",
  SHORT_HAUL_EFFICIENCY: "Estimated Net Monthly Economic Opportunity",
};

type MetricSource = "input" | "derived" | "financial";
export type MetricDisplay = { label: string; key: string; source: MetricSource; suffix?: string; currency?: boolean; percent?: boolean };
export type AssessmentDisplayConfig = { metrics: readonly MetricDisplay[] };

const standardMetrics = (definition: ValueModuleDefinition): MetricDisplay[] => definition.inputDefinitions.slice(0, 4).map((input) => ({ label: input.label, key: input.key, source: "input", currency: input.type === "CURRENCY", percent: input.type === "PERCENTAGE" }));

const baseAssessmentDisplayConfig = Object.fromEntries(
  getAllValueModules().map((definition) => [definition.key, { metrics: standardMetrics(definition) }]),
) as unknown as Record<ValueModuleKey, AssessmentDisplayConfig>;

export const assessmentDisplayConfig: Record<ValueModuleKey, AssessmentDisplayConfig> = {
  ...baseAssessmentDisplayConfig,
  BROKER_PRODUCTIVITY: {
    metrics: [
      { label: "Current Productivity", key: "current_loads_per_broker_day", source: "input", suffix: " loads / broker / day" },
      { label: "Target Productivity", key: "target_loads_per_broker_day", source: "input", suffix: " loads / broker / day" },
      { label: "Additional Daily Capacity", key: "additional_loads_per_day", source: "derived", suffix: " loads" },
      { label: "Monthly Load Capacity", key: "additional_loads_per_month", source: "derived", suffix: " additional monthly loads" },
      { label: "Average Margin", key: "average_margin_per_load", source: "input", currency: true, suffix: " / load" },
    ],
  },
  REDUCE_DEADHEAD: {
    metrics: [
      { label: "Current Deadhead", key: "current_deadhead_pct", source: "input", percent: true },
      { label: "Target Deadhead", key: "target_deadhead_pct", source: "input", percent: true },
      { label: "Avoided Empty Miles", key: "avoided_empty_miles", source: "derived", suffix: " miles" },
      { label: "Variable Cost", key: "variable_cost_per_mile", source: "input", currency: true, suffix: " / mile" },
    ],
  },
  TRAILER_ASSET_UTILIZATION: {
    metrics: [
      { label: "Current Trailer Ratio", key: "current_trailer_ratio", source: "derived", suffix: " trailers / tractor" },
      { label: "Target Trailer Ratio", key: "target_trailer_ratio", source: "derived", suffix: " trailers / tractor" },
      { label: "Modeled Trailer Requirement Reduction", key: "avoided_trailers", source: "derived", suffix: " trailers" },
      { label: "Potential Avoided Asset Investment", key: "informationalCapitalValue", source: "financial", currency: true },
    ],
  },
};
