import type { OverlapGroupDefinition, OverlapNotice, ValueModuleKey } from "./types";

export const overlapGroups = [
  {
    key: "ASSET_PRODUCTIVITY",
    modules: ["INCREASE_UTILIZATION", "REDUCE_DEADHEAD", "REDUCE_OUT_OF_ROUTE", "TRAILER_ASSET_UTILIZATION"],
    type: "REVIEW",
    message: "These modules may calculate value from related asset productivity improvements. Confirm that the same mileage or utilization change is not independently attributed to multiple opportunities.",
  },
  {
    key: "OPERATIONS_REDUNDANT_LABOR",
    modules: ["OPERATIONS_EFFICIENCY", "RECURRING_ORDER_AUTOMATION", "EDI_ORDER_AUTOMATION"],
    type: "REVIEW",
    message: "The broad Operations Efficiency model may already include time associated with recurring order entry or manual EDI order entry. Exclude those hours from the broader productivity assumption when calculating them separately.",
  },
  {
    key: "BACK_OFFICE_REDUNDANT_LABOR",
    modules: ["STREAMLINE_BACK_OFFICE", "NON_OPS_PRODUCTIVITY", "BROKERAGE_LTL", "INSURANCE_CREDIT_MONITORING", "REDUCE_BILLING_LABOR"],
    type: "REVIEW",
    message: "Multiple selected modules quantify recovered non-operations labor capacity. Review the underlying hours or percentage assumptions to avoid counting the same employee time more than once.",
  },
  {
    key: "RFP_VALUE",
    modules: ["RFP_PROCESS_EFFICIENCY", "RFP_GROWTH_OPPORTUNITY"],
    type: "INFORMATION",
    message: "These modules measure different types of value. RFP Process Efficiency calculates recovered labor capacity; RFP Growth Opportunity estimates incremental margin potential created by additional selling or bid capacity.",
  },
  {
    key: "BILLING_EFFICIENCY",
    modules: ["REDUCE_HARD_BILLING_COST", "REDUCE_BILLING_LABOR", "SHORT_HAUL_EFFICIENCY"],
    type: "REVIEW",
    message: "Confirm that Short Haul processing hours are excluded from broader billing labor assumptions when both modules are included.",
  },
] as const satisfies readonly OverlapGroupDefinition[];

export function getOverlapGroupsForModule(moduleKey: ValueModuleKey): OverlapGroupDefinition[] {
  return overlapGroups
    .filter((group) => group.modules.some((m) => m === moduleKey))
    .map((group) => ({ ...group, modules: [...group.modules] }));
}

export function getOverlapNoticesForSelectedModules(moduleKeys: readonly ValueModuleKey[]): OverlapNotice[] {
  const selected = new Set<ValueModuleKey>(moduleKeys);
  return overlapGroups.flatMap((group) => {
    const selectedModuleKeys = group.modules.filter((moduleKey) => selected.has(moduleKey));
    return selectedModuleKeys.length >= 2 ? [{ ...group, modules: [...group.modules], selectedModuleKeys }] : [];
  });
}
