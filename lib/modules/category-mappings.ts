import { getCategoryByKey } from "./categories";
import { getModulesForBusinessType, getValueModule } from "./registry";
import type { BusinessType, CategoryKey, ModuleCategoryMapping, ValueModuleDefinition, ValueModuleKey } from "./types";

export const moduleCategoryMappings = [
  { categoryKey: "TL_SALES_CUSTOMER_SERVICE", moduleKey: "RECURRING_ORDER_AUTOMATION" },
  { categoryKey: "TL_SALES_CUSTOMER_SERVICE", moduleKey: "RFP_PROCESS_EFFICIENCY" },
  { categoryKey: "TL_SALES_CUSTOMER_SERVICE", moduleKey: "RFP_GROWTH_OPPORTUNITY" },
  { categoryKey: "TL_SALES_CUSTOMER_SERVICE", moduleKey: "EDI_ORDER_AUTOMATION" },
  { categoryKey: "TL_SALES_CUSTOMER_SERVICE", moduleKey: "REDUCE_EDI_VAN_CHARGES" },
  { categoryKey: "TL_TRUCKING_OPERATIONS", moduleKey: "INCREASE_UTILIZATION" },
  { categoryKey: "TL_TRUCKING_OPERATIONS", moduleKey: "REDUCE_DEADHEAD" },
  { categoryKey: "TL_TRUCKING_OPERATIONS", moduleKey: "REDUCE_OUT_OF_ROUTE" },
  { categoryKey: "TL_TRUCKING_OPERATIONS", moduleKey: "DRIVER_DETENTION" },
  { categoryKey: "TL_TRUCKING_OPERATIONS", moduleKey: "DRIVER_TURNOVER" },
  { categoryKey: "TL_TRUCKING_OPERATIONS", moduleKey: "OPERATIONS_EFFICIENCY" },
  { categoryKey: "TL_TRUCKING_OPERATIONS", moduleKey: "TRAILER_ASSET_UTILIZATION" },
  { categoryKey: "TL_TRUCKING_OPERATIONS", moduleKey: "SHORT_HAUL_EFFICIENCY" },
  { categoryKey: "TL_BACK_OFFICE", moduleKey: "STREAMLINE_BACK_OFFICE" },
  { categoryKey: "TL_BACK_OFFICE", moduleKey: "NON_OPS_PRODUCTIVITY" },
  { categoryKey: "TL_BACK_OFFICE", moduleKey: "REDUCE_HARD_BILLING_COST" },
  { categoryKey: "TL_BACK_OFFICE", moduleKey: "REDUCE_BILLING_LABOR" },
  { categoryKey: "TL_STRATEGY_ANALYTICS", moduleKey: "PROFIT_MARGIN_INCREASE" },
  { categoryKey: "BR_CARRIER_BASE", moduleKey: "INSURANCE_CREDIT_MONITORING" },
  { categoryKey: "BR_SHIPPER_SALES", moduleKey: "BROKER_PRODUCTIVITY" },
  { categoryKey: "BR_SHIPPER_SALES", moduleKey: "BROKERAGE_LTL" },
  { categoryKey: "BR_SHIPPER_SALES", moduleKey: "RECURRING_ORDER_AUTOMATION" },
  { categoryKey: "BR_SHIPPER_SALES", moduleKey: "RFP_PROCESS_EFFICIENCY" },
  { categoryKey: "BR_SHIPPER_SALES", moduleKey: "RFP_GROWTH_OPPORTUNITY" },
  { categoryKey: "BR_SHIPPER_SALES", moduleKey: "EDI_ORDER_AUTOMATION" },
  { categoryKey: "BR_SHIPPER_SALES", moduleKey: "REDUCE_EDI_VAN_CHARGES" },
  { categoryKey: "BR_BACK_OFFICE", moduleKey: "STREAMLINE_BACK_OFFICE" },
  { categoryKey: "BR_BACK_OFFICE", moduleKey: "NON_OPS_PRODUCTIVITY" },
  { categoryKey: "BR_BACK_OFFICE", moduleKey: "REDUCE_HARD_BILLING_COST" },
  { categoryKey: "BR_BACK_OFFICE", moduleKey: "REDUCE_BILLING_LABOR" },
  { categoryKey: "BR_STRATEGIC", moduleKey: "PROFIT_MARGIN_INCREASE" },
] as const satisfies readonly ModuleCategoryMapping[];

export function getCategoryForModule(moduleKey: ValueModuleKey, businessType: BusinessType): CategoryKey | undefined {
  return moduleCategoryMappings.find((mapping) => mapping.moduleKey === moduleKey && getCategoryByKey(mapping.categoryKey)?.businessType === businessType)?.categoryKey;
}

export function getModulesForCategory(categoryKey: CategoryKey): ValueModuleDefinition[] {
  return moduleCategoryMappings.filter((mapping) => mapping.categoryKey === categoryKey).map((mapping) => getValueModule(mapping.moduleKey));
}

export function getCategoryMappingsForBusinessType(businessType: BusinessType): ModuleCategoryMapping[] {
  const available = new Set(getModulesForBusinessType(businessType).map((module) => module.key));
  return moduleCategoryMappings
    .filter((mapping) => available.has(mapping.moduleKey) && getCategoryByKey(mapping.categoryKey)?.businessType === businessType)
    .map((mapping) => ({ ...mapping }));
}
