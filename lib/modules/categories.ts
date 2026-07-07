import type { BusinessType, CategoryKey, ValueModuleCategoryDefinition } from "./types";

export const valueModuleCategories = [
  { key: "TL_SALES_CUSTOMER_SERVICE", businessType: "TRUCKLOAD", productContext: "LOADMASTER", name: "Sales & Customer Service", displayOrder: 1 },
  { key: "TL_TRUCKING_OPERATIONS", businessType: "TRUCKLOAD", productContext: "LOADMASTER", name: "Trucking Operations", displayOrder: 2 },
  { key: "TL_BACK_OFFICE", businessType: "TRUCKLOAD", productContext: "LOADMASTER", name: "Back Office Solutions", displayOrder: 3 },
  { key: "TL_STRATEGY_ANALYTICS", businessType: "TRUCKLOAD", productContext: "LOADMASTER", name: "Strategy & Analytics", displayOrder: 4 },
  { key: "BR_CARRIER_BASE", businessType: "BROKERAGE", productContext: "POWERBROKER", name: "Building the Best Carrier Base", displayOrder: 1 },
  { key: "BR_SHIPPER_SALES", businessType: "BROKERAGE", productContext: "POWERBROKER", name: "Selling to the Best Shippers", displayOrder: 2 },
  { key: "BR_BACK_OFFICE", businessType: "BROKERAGE", productContext: "POWERBROKER", name: "Managing the Back Office", displayOrder: 3 },
  { key: "BR_STRATEGIC", businessType: "BROKERAGE", productContext: "POWERBROKER", name: "Strategic", displayOrder: 4 },
] as const satisfies readonly ValueModuleCategoryDefinition[];

export function getCategoriesForBusinessType(businessType: BusinessType): ValueModuleCategoryDefinition[] {
  return valueModuleCategories.filter((category) => category.businessType === businessType);
}

export function getCategoryByKey(categoryKey: CategoryKey): ValueModuleCategoryDefinition | undefined {
  const category = valueModuleCategories.find((candidate) => candidate.key === categoryKey);
  return category ? { ...category } : undefined;
}
