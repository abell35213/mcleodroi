import { describe, expect, it } from "vitest";
import { buildAssumptionsAppendix } from "@/lib/analyses/assumptions";
import { composePresentationSlidePlan } from "@/lib/presentation/composition";
import { buildAssumptionsAppendixSlide } from "@/lib/presentation/slides";
import { createPresentation } from "@/lib/presentation/pptx/create-presentation";
import type { PresentationSnapshot, PresentationSnapshotModule } from "@/lib/presentation";
import type { ValueModuleKey } from "@/lib/modules";

function moduleFixture(moduleKey: ValueModuleKey, moduleName: string, inputs: Record<string, number>): PresentationSnapshotModule {
  return {
    analysisModuleId: `am-${moduleKey}`, moduleKey, moduleName, categoryKey: "TL_TRUCKING_OPERATIONS", categoryName: "Trucking Operations", displayOrder: 1, valueType: "COST_REDUCTION", narrativeStatus: "DRAFT_APPROVED", narrativeMode: "TEMPLATE",
    inputs, financialOutputs: { monthlyRecurringValue: 5000, annualRecurringValue: 60000 }, derivedMetrics: {},
    opportunityHeadline: "Headline", valueNarrative: "How McLeod helps.", defaultCustomerAnalysis: "Analysis.", effectiveCustomerAnalysis: "Analysis.", presentationDisclaimer: "", presentationCallout: "", customNarrativeSourceFingerprint: null,
  };
}

function snapshotWith(module: PresentationSnapshotModule): PresentationSnapshot {
  return {
    snapshotVersion: "1.0.0", presentationTemplateVersion: "1.0.0", narrativeRegistryVersion: "1.0.0", createdAt: "2026-07-10T00:00:00.000Z",
    analysis: { id: "a1", companyName: "Test Carrier", customerContact: null, businessType: "TRUCKLOAD", productContext: "LOADMASTER", preparedBy: "Rep", analysisDate: "2026-07-10T00:00:00.000Z" },
    summary: { monthlyRecurringValueTotal: 5000, annualRecurringValueTotal: 60000, annualOnlyValueTotal: 0, totalIdentifiedAnnualEconomicOpportunity: 60000, informationalCapitalValueTotal: 0, valueTypeBreakdown: [{ valueType: "COST_REDUCTION", monthlyRecurringValue: 5000, annualRecurringValue: 60000, annualOnlyValue: 0, annualEconomicOpportunity: 60000 }], informationalCapitalValues: [] },
    overlapNotices: [], categories: [{ categoryKey: "TL_TRUCKING_OPERATIONS", name: "Trucking Operations", displayOrder: 1, modules: [module] }],
  };
}

describe("assumptions appendix", () => {
  it("includes only benchmarked inputs with entered values and dedupes sources", () => {
    const appendix = buildAssumptionsAppendix([
      { moduleKey: "REDUCE_DEADHEAD", moduleName: "Reduce Deadhead Miles", categoryName: "Trucking Operations", inputs: { current_deadhead_pct: 0.18, monthly_miles: 100000, variable_cost_per_mile: 0.85 } },
    ]);
    expect(appendix.modules).toHaveLength(1);
    const rows = appendix.modules[0].rows;
    expect(rows.map((r) => r.inputKey)).toEqual(["current_deadhead_pct", "target_deadhead_pct", "variable_cost_per_mile"]);
    expect(rows.find((r) => r.inputKey === "current_deadhead_pct")?.enteredValue).toBe("18%");
    expect(rows.find((r) => r.inputKey === "target_deadhead_pct")?.enteredValue).toBe("—");
    expect(rows.find((r) => r.inputKey === "current_deadhead_pct")?.typicalRange).toBe("10%–25%");
    expect(appendix.sources.map((s) => s.label)).toEqual(["ATRI", "McLeod"]);
  });

  it("shows an em dash for benchmarked inputs without an entered value", () => {
    const appendix = buildAssumptionsAppendix([
      { moduleKey: "REDUCE_DEADHEAD", moduleName: "Reduce Deadhead Miles", categoryName: "Trucking Operations", inputs: { variable_cost_per_mile: 0.85 } },
    ]);
    expect(appendix.modules[0].rows.find((r) => r.inputKey === "current_deadhead_pct")?.enteredValue).toBe("—");
  });

  it("is empty when no selected module carries a benchmark", () => {
    const appendix = buildAssumptionsAppendix([
      { moduleKey: "DRIVER_DETENTION", moduleName: "Improve Detention Recovery", categoryName: "Sales & Customer Service", inputs: { detention_rate_per_hour: 50 } },
    ]);
    expect(appendix.modules).toHaveLength(0);
    expect(appendix.sources).toHaveLength(0);
  });

  it("appends an appendix slide only when benchmark data is present", () => {
    const withBenchmarks = composePresentationSlidePlan(snapshotWith(moduleFixture("REDUCE_DEADHEAD", "Reduce Deadhead Miles", { current_deadhead_pct: 0.18, variable_cost_per_mile: 0.85 })));
    expect(withBenchmarks.some((plan) => plan.kind === "assumptionsAppendix")).toBe(true);

    const withoutBenchmarks = composePresentationSlidePlan(snapshotWith(moduleFixture("DRIVER_DETENTION", "Improve Detention Recovery", { detention_rate_per_hour: 50 })));
    expect(withoutBenchmarks.some((plan) => plan.kind === "assumptionsAppendix")).toBe(false);
  });

  it("builds the appendix slide without throwing", () => {
    const pptx = createPresentation();
    expect(() => buildAssumptionsAppendixSlide(pptx, { companyName: "Test Carrier", slideNumber: 7, modules: [{ moduleName: "Reduce Deadhead Miles", categoryName: "Trucking Operations", rows: [{ label: "Current deadhead percentage", enteredValue: "18%", typicalRange: "10%–25%", sourceLabel: "ATRI" }] }], sources: [{ label: "ATRI", citation: "American Transportation Research Institute." }] })).not.toThrow();
  });
});
