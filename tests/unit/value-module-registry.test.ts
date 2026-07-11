import { describe, expect, it } from "vitest";
import {
  businessTypes,
  categoryKeys,
  getAllValueModules,
  getCategoriesForBusinessType,
  getCategoryForModule,
  getModulesForBusinessType,
  getModulesForCategory,
  getOverlapNoticesForSelectedModules,
  isModuleAvailableForBusinessType,
  moduleCategoryMappings,
  overlapGroups,
  valueModuleCategories,
  valueModuleKeys,
} from "@/lib/modules";
import type { BusinessType, ValueModuleInputDefinition, ValueModuleKey } from "@/lib/modules";

function uniqueCount(values: readonly string[]): number {
  return new Set(values).size;
}

describe("canonical value module registry", () => {
  it("contains exactly 21 unique canonical modules", () => {
    const modules = getAllValueModules();
    expect(modules).toHaveLength(21);
    expect(uniqueCount(modules.map((valueModule) => valueModule.key))).toBe(21);
    expect(modules.map((valueModule) => valueModule.key)).toEqual([...valueModuleKeys]);
  });

  it("filters modules by business type without cross-applying exclusive modules", () => {
    const truckloadKeys = getModulesForBusinessType("TRUCKLOAD").map((valueModule) => valueModule.key);
    const brokerageKeys = getModulesForBusinessType("BROKERAGE").map((valueModule) => valueModule.key);

    expect(truckloadKeys).toContain("INCREASE_UTILIZATION");
    expect(truckloadKeys).not.toContain("BROKER_PRODUCTIVITY");
    expect(brokerageKeys).toContain("BROKER_PRODUCTIVITY");
    expect(brokerageKeys).not.toContain("DRIVER_TURNOVER");
    expect(isModuleAvailableForBusinessType("PROFIT_MARGIN_INCREASE", "TRUCKLOAD")).toBe(true);
    expect(isModuleAvailableForBusinessType("PROFIT_MARGIN_INCREASE", "BROKERAGE")).toBe(true);
  });

  it("encodes category taxonomy and filters by business type", () => {
    expect(valueModuleCategories).toHaveLength(8);
    expect(uniqueCount(valueModuleCategories.map((category) => category.key))).toBe(8);
    expect(valueModuleCategories.map((category) => category.key)).toEqual([...categoryKeys]);
    expect(getCategoriesForBusinessType("TRUCKLOAD").map((category) => category.name)).toEqual([
      "Sales & Customer Service",
      "Trucking Operations",
      "Back Office Solutions",
      "Strategy & Analytics",
    ]);
    expect(getCategoriesForBusinessType("BROKERAGE").map((category) => category.name)).toEqual([
      "Building the Best Carrier Base",
      "Selling to the Best Shippers",
      "Managing the Back Office",
      "Strategic",
    ]);
  });

  it("maps shared modules to product-specific categories", () => {
    expect(getCategoryForModule("PROFIT_MARGIN_INCREASE", "TRUCKLOAD")).toBe("TL_STRATEGY_ANALYTICS");
    expect(getCategoryForModule("PROFIT_MARGIN_INCREASE", "BROKERAGE")).toBe("BR_STRATEGIC");
    expect(getCategoryForModule("EDI_ORDER_AUTOMATION", "TRUCKLOAD")).toBe("TL_SALES_CUSTOMER_SERVICE");
    expect(getCategoryForModule("EDI_ORDER_AUTOMATION", "BROKERAGE")).toBe("BR_SHIPPER_SALES");
    expect(getModulesForCategory("BR_SHIPPER_SALES").map((valueModule) => valueModule.key)).toContain("BROKER_PRODUCTIVITY");
  });

  it("proves category mapping integrity for every applicable business type", () => {
    for (const businessType of businessTypes) {
      for (const valueModule of getModulesForBusinessType(businessType)) {
        const matchingMappings = moduleCategoryMappings.filter((mapping) => {
          const category = valueModuleCategories.find((candidate) => candidate.key === mapping.categoryKey);
          return mapping.moduleKey === valueModule.key && category?.businessType === businessType;
        });
        expect(matchingMappings, `${valueModule.key} ${businessType}`).toHaveLength(1);
      }
    }

    for (const mapping of moduleCategoryMappings) {
      const category = valueModuleCategories.find((candidate) => candidate.key === mapping.categoryKey);
      expect(category).toBeDefined();
      expect(isModuleAvailableForBusinessType(mapping.moduleKey, category?.businessType as BusinessType)).toBe(true);
    }
  });

  it("keeps all required input metadata complete and ordered", () => {
    for (const valueModule of getAllValueModules()) {
      expect(valueModule.businessTypes.length).toBeGreaterThan(0);
      expect(valueModule.productContexts).toEqual(valueModule.businessTypes.map((businessType) => businessType === "TRUCKLOAD" ? "LOADMASTER" : "POWERBROKER"));
      expect(uniqueCount(valueModule.inputDefinitions.map((input) => input.key))).toBe(valueModule.inputDefinitions.length);
      expect(uniqueCount(valueModule.inputDefinitions.map((input) => String(input.displayOrder)))).toBe(valueModule.inputDefinitions.length);
      for (const input of valueModule.inputDefinitions) {
        expect(input.key).not.toBe("");
        expect(input.label).not.toBe("");
        expect(input.type).not.toBe("");
        expect(input.unit).not.toBe("");
        expect(input.helpText.trim()).not.toBe("");
      }
    }
  });

  it("encodes required defaults", () => {
    const trailerInputs = getAllValueModules().find((valueModule) => valueModule.key === "TRAILER_ASSET_UTILIZATION")?.inputDefinitions;
    const shortHaulInputs = getAllValueModules().find((valueModule) => valueModule.key === "SHORT_HAUL_EFFICIENCY")?.inputDefinitions;

    expect(trailerInputs?.find((input) => input.key === "asset_life_months")?.defaultValue).toBe(60);
    expect(trailerInputs?.find((input) => input.key === "residual_value_pct")?.defaultValue).toBe(0.2);
    expect(shortHaulInputs?.find((input) => input.key === "transaction_cost_per_ticket")?.defaultValue).toBe(0.25);
  });

  it("returns overlap notices only when at least two modules in a group are selected", () => {
    expect(getOverlapNoticesForSelectedModules(["OPERATIONS_EFFICIENCY"])).toEqual([]);
    expect(getOverlapNoticesForSelectedModules(["OPERATIONS_EFFICIENCY", "RECURRING_ORDER_AUTOMATION"])[0]).toMatchObject({
      key: "OPERATIONS_REDUNDANT_LABOR",
      type: "REVIEW",
    });
    expect(getOverlapNoticesForSelectedModules(["RFP_PROCESS_EFFICIENCY", "RFP_GROWTH_OPPORTUNITY"])[0]).toMatchObject({
      key: "RFP_VALUE",
      type: "INFORMATION",
    });
  });

  it("keeps overlap group references and module metadata valid", () => {
    const validModuleKeys = new Set<ValueModuleKey>(valueModuleKeys);
    const validOverlapKeys = new Set(overlapGroups.map((group) => group.key));
    for (const group of overlapGroups) {
      for (const moduleKey of group.modules) expect(validModuleKeys.has(moduleKey)).toBe(true);
    }
    for (const valueModule of getAllValueModules()) {
      for (const overlapGroupKey of valueModule.overlapGroups) expect(validOverlapKeys.has(overlapGroupKey)).toBe(true);
    }
  });

  it("keeps product-review statuses for modules awaiting product approval", () => {
    expect(getAllValueModules().filter((valueModule) => valueModule.narrativeStatus === "NEEDS_PRODUCT_REVIEW").map((valueModule) => valueModule.key)).toEqual([
      "BROKERAGE_LTL",
      "SHORT_HAUL_EFFICIENCY",
    ]);
    expect(getAllValueModules().find((valueModule) => valueModule.key === "BROKERAGE_LTL")?.valueType).toBe("CAPACITY_VALUE");
    expect(getAllValueModules().find((valueModule) => valueModule.key === "SHORT_HAUL_EFFICIENCY")?.valueType).toBe("NET_CAPACITY_VALUE");
  });

  it("returns safe copies instead of mutable registry arrays", () => {
    const modules = getAllValueModules();
    modules.pop();
    const valueModule = modules.find((valueModule) => valueModule.key === "INCREASE_UTILIZATION")!;
    const mutableInputs = valueModule.inputDefinitions as ValueModuleInputDefinition[];
    mutableInputs.pop();
    expect(getAllValueModules()).toHaveLength(21);
    expect(getAllValueModules().find((valueModule) => valueModule.key === "INCREASE_UTILIZATION")!.inputDefinitions).toHaveLength(5);
  });
});
