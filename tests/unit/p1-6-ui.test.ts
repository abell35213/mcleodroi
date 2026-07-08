import { describe, expect, it } from "vitest";
import { assessmentDisplayConfig, getPreferredResumeRoute, primaryFinancialLabels, resolveActiveModuleKey, resolveDisplayValue, toDisplayInputValue, toEngineInputValue } from "@/lib/analyses/ui";
import { getAllValueModules, getValueModule, type ValueModuleInputDefinition } from "@/lib/modules";

const pct: ValueModuleInputDefinition = { key: "x", label: "X", type: "PERCENTAGE", unit: "PERCENT", required: true, helpText: "", displayOrder: 1 };

describe("P1-6 UI helpers", () => {
  it("converts UI percentages to engine decimals", () => {
    expect(toEngineInputValue(pct, 17)).toBe(0.17);
    expect(toEngineInputValue(pct, 2)).toBe(0.02);
    expect(toEngineInputValue(pct, 0)).toBe(0);
    expect(toEngineInputValue(pct, 100)).toBe(1);
  });
  it("converts persisted percentages to UI values", () => {
    expect(toDisplayInputValue(pct, 0.17)).toBe(17);
    expect(toDisplayInputValue(pct, 0.02)).toBe(2);
  });
  it("resolves defaults without persistence", () => {
    const input = getValueModule("TRAILER_ASSET_UTILIZATION").inputDefinitions.find((candidate) => candidate.key === "residual_value_pct")!;
    expect(resolveDisplayValue(input, undefined)).toEqual({ value: 20, isDefault: true });
    expect(resolveDisplayValue(input, 0.15)).toEqual({ value: 15, isDefault: false });
  });
  it("resolves resume routes", () => {
    expect(getPreferredResumeRoute("a1", { summary: { moduleCount: 0 } as never, workflowReadiness: { hasSelectedModules: false, canReview: false } as never })).toBe("/analyses/a1/opportunities");
    expect(getPreferredResumeRoute("a1", { summary: { moduleCount: 1 } as never, workflowReadiness: { hasSelectedModules: true, canReview: false } as never })).toBe("/analyses/a1/assessment");
    expect(getPreferredResumeRoute("a1", { summary: { moduleCount: 1 } as never, workflowReadiness: { hasSelectedModules: true, canReview: true } as never })).toBe("/analyses/a1/review");
  });
  it("maps primary financial labels", () => {
    expect(primaryFinancialLabels.BROKER_PRODUCTIVITY).toBe("Estimated Gross-Margin Opportunity");
    expect(primaryFinancialLabels.TRAILER_ASSET_UTILIZATION).toBe("Monthly Equivalent Economic Value");
  });
  it("resolves active module", () => {
    const modules = [{ moduleKey: "BROKER_PRODUCTIVITY", status: "COMPLETE" }, { moduleKey: "PROFIT_MARGIN_INCREASE", status: "IN_PROGRESS" }] as const;
    expect(resolveActiveModuleKey(modules, null)).toBe("PROFIT_MARGIN_INCREASE");
    expect(resolveActiveModuleKey([{ moduleKey: "BROKER_PRODUCTIVITY", status: "COMPLETE" }] as const, null)).toBe("BROKER_PRODUCTIVITY");
  });
  it("has display configuration for every canonical module", () => {
    expect(Object.keys(assessmentDisplayConfig).sort()).toEqual(getAllValueModules().map((module) => module.key).sort());
  });
});
