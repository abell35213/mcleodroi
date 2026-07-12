import { describe, expect, it } from "vitest";
import { composePresentationSlidePlan } from "@/lib/presentation/composition";
import type { PresentationSnapshot, PresentationSnapshotModule } from "@/lib/presentation";
import type { ValueModuleKey, ValueType } from "@/lib/modules";

function moduleFixture(moduleKey: ValueModuleKey, moduleName: string, displayOrder: number, valueType: ValueType = "COST_REDUCTION", outputs: Record<string, number> = { monthlyRecurringValue: 1000, annualRecurringValue: 12000 }): PresentationSnapshotModule {
  return {
    analysisModuleId: `am-${moduleKey}`,
    moduleKey,
    moduleName,
    categoryKey: "BR_SHIPPER_SALES",
    categoryName: "Brokerage Operational Efficiencies",
    displayOrder,
    valueType,
    narrativeStatus: "DRAFT_APPROVED",
    narrativeMode: "TEMPLATE",
    inputs: {},
    financialOutputs: outputs,
    derivedMetrics: {},
    opportunityHeadline: "Headline",
    valueNarrative: "McLeod helps with focused workflow automation.",
    defaultCustomerAnalysis: "Customer analysis text.",
    effectiveCustomerAnalysis: "Customer analysis text.",
    presentationDisclaimer: "",
    presentationCallout: "Concise callout",
    customNarrativeSourceFingerprint: null,
  };
}

function snapshotWith(modules: PresentationSnapshotModule[]): PresentationSnapshot {
  return {
    snapshotVersion: "1.4.0",
    presentationTemplateVersion: "1.2.0",
    narrativeRegistryVersion: "1.0.0",
    createdAt: "2026-07-10T00:00:00.000Z",
    analysis: { id: "a1", companyName: "Brokerage Customer", customerContact: null, businessType: "BROKERAGE", productContext: "POWERBROKER", preparedBy: "Rep", analysisDate: "2026-07-10T00:00:00.000Z" },
    summary: { monthlyRecurringValueTotal: 5000, annualRecurringValueTotal: 60000, annualOnlyValueTotal: 0, totalIdentifiedAnnualEconomicOpportunity: 60000, informationalCapitalValueTotal: 0, valueTypeBreakdown: [], informationalCapitalValues: [] },
    overlapNotices: [],
    categories: [{ categoryKey: "BR_SHIPPER_SALES", name: "Brokerage Operational Efficiencies", displayOrder: 2, modules }],
  };
}

describe("presentation composition", () => {
  it("creates one single-module opportunity slide per selected same-category module in deterministic order", () => {
    const plans = composePresentationSlidePlan(snapshotWith([
      moduleFixture("EDI_ORDER_AUTOMATION", "Automate Order Entry Through EDI", 17),
      moduleFixture("BROKER_PRODUCTIVITY", "Increase Broker Productivity", 9),
    ]));
    expect(plans.some((plan) => plan.kind === "dualModule")).toBe(false);
    const detailSlides = plans.filter((plan) => plan.kind === "singleModule");
    expect(detailSlides).toHaveLength(2);
    expect(detailSlides.map((plan) => plan.model.moduleTitle)).toEqual(["Increase Broker Productivity", "Automate Order Entry Through EDI"]);
  });

  it("uses module-based final summary cards exactly once and keeps totals on the final summary slide", () => {
    const modules = [
      moduleFixture("BROKER_PRODUCTIVITY", "Increase Broker Productivity", 9),
      moduleFixture("BROKERAGE_LTL", "Optimize Brokerage LTL Rating", 10),
      moduleFixture("RECURRING_ORDER_AUTOMATION", "Automate Recurring Orders", 11),
      moduleFixture("RFP_PROCESS_EFFICIENCY", "Improve RFP Process Efficiency", 12),
      moduleFixture("EDI_ORDER_AUTOMATION", "Automate Order Entry Through EDI", 17),
    ];
    const summaries = composePresentationSlidePlan(snapshotWith(modules)).filter((plan) => plan.kind === "opportunitySummary");
    expect(summaries).toHaveLength(2);
    expect(summaries[0].model.classifications.map((card) => card.title)).toEqual(modules.slice(0, 4).map((m) => m.moduleName));
    expect(summaries[0].model.showTotals).toBe(false);
    expect(summaries[1].model.classifications.map((card) => card.title)).toEqual(["Automate Order Entry Through EDI"]);
    expect(summaries[1].model.showTotals).toBe(true);
    expect(summaries.flatMap((summary) => summary.model.classifications.map((card) => card.title)).sort()).toEqual(modules.map((m) => m.moduleName).sort());
  });

  it("keeps negative, annual-only, and informational-capital module cards visible", () => {
    const modules = [
      moduleFixture("BROKER_PRODUCTIVITY", "Negative Productivity", 9, "NET_CAPACITY_VALUE", { monthlyRecurringValue: -1000, annualRecurringValue: -12000 }),
      moduleFixture("RFP_GROWTH_OPPORTUNITY", "Annual Growth", 13, "REVENUE_MARGIN_OPPORTUNITY", { annualOnlyValue: 25000 }),
      moduleFixture("REDUCE_EDI_VAN_CHARGES", "Avoid Capital", 18, "CAPITAL_AVOIDANCE", { informationalCapitalValue: 50000, monthlyRecurringValue: 900 }),
    ];
    const cards = composePresentationSlidePlan(snapshotWith(modules)).filter((plan) => plan.kind === "opportunitySummary").flatMap((plan) => plan.model.classifications);
    expect(cards.map((card) => card.title)).toEqual(["Negative Productivity", "Annual Growth", "Avoid Capital"]);
    expect(cards[0].label).toBe("Net Economic Impact");
    expect(cards[1].period).toBe("/ YEAR");
    expect(cards[2].label).toBe("Avoided Capital Investment");
  });
});
