import { describe, expect, it } from "vitest";
import { composePresentationSlidePlan } from "@/lib/presentation/composition";
import { buildPresentationExportModel } from "@/lib/presentation/export/model";
import { renderPresentationHtml } from "@/lib/presentation/export/html";
import type { CalculatedCustomOpportunity } from "@/lib/analyses/types";
import type { PresentationSnapshot } from "@/lib/presentation";

const rationale = "200 calls per week × 4 minutes saved × 4.33 weeks per month ÷ 60 × $28 loaded hourly labor rate.";

function customFixture(overrides: Partial<CalculatedCustomOpportunity> = {}): CalculatedCustomOpportunity {
  return {
    id: "custom-status-calls",
    analysisId: "analysis-1",
    title: "Reduce Manual Status Calls",
    shortTitle: null,
    categoryKey: "BR_SHIPPER_SALES",
    valueClassification: "CAPACITY_VALUE",
    valueFrequency: "MONTHLY_RECURRING",
    enteredValue: 8500,
    monthlyRecurringValue: 8500,
    annualRecurringValue: 102000,
    annualOnlyValue: null,
    informationalCapitalValue: null,
    calculationRationale: rationale,
    howMcLeodHelps: null,
    customerBusinessImpact: null,
    presentationCallout: null,
    methodologyNote: null,
    sourceNote: null,
    status: "COMPLETE",
    version: 1,
    sourceFingerprint: "fixture-v1",
    displayOrder: 10,
    narrativeStatus: "Narrative Not Added",
    assumptions: [
      { id: "a1", label: "Status calls per week", displayValue: "200", numericValue: 200, unit: "calls", sourceNote: null, displayOrder: 1 },
      { id: "a2", label: "Minutes saved per call", displayValue: "4", numericValue: 4, unit: "minutes", sourceNote: null, displayOrder: 2 },
      { id: "a3", label: "Loaded labor rate", displayValue: "$28", numericValue: 28, unit: "per hour", sourceNote: null, displayOrder: 3 },
    ],
    ...overrides,
  };
}

function snapshot(custom: CalculatedCustomOpportunity = customFixture()): PresentationSnapshot {
  return {
    snapshotVersion: "1.6.0",
    presentationTemplateVersion: "1.4.0",
    narrativeRegistryVersion: "1.0.0",
    createdAt: "2026-07-14T00:00:00.000Z",
    analysis: { id: "analysis-1", companyName: "Fixture Brokerage", customerContact: null, businessType: "BROKERAGE", productContext: "POWERBROKER", preparedBy: "Rep", analysisDate: "2026-07-14T00:00:00.000Z" },
    summary: { monthlyRecurringValueTotal: custom.monthlyRecurringValue ?? 0, annualRecurringValueTotal: custom.annualRecurringValue ?? 0, annualOnlyValueTotal: custom.annualOnlyValue ?? 0, totalIdentifiedAnnualEconomicOpportunity: (custom.annualRecurringValue ?? 0) + (custom.annualOnlyValue ?? 0), informationalCapitalValueTotal: custom.informationalCapitalValue ?? 0, valueTypeBreakdown: [], informationalCapitalValues: custom.informationalCapitalValue ? [{ customOpportunityId: custom.id, title: custom.title, value: custom.informationalCapitalValue }] : [] },
    overlapNotices: [],
    categories: [],
    customOpportunities: [custom],
    roi: null,
  };
}

describe("custom opportunity customer-facing outputs", () => {
  it("creates exactly one detail slide, one summary card, and appendix rows for the deterministic fixture", () => {
    const plans = composePresentationSlidePlan(snapshot());
    const detailSlides = plans.filter((plan) => plan.kind === "singleModule");
    expect(detailSlides).toHaveLength(1);
    expect(detailSlides[0].model).toMatchObject({ moduleTitle: "Reduce Manual Status Calls", categoryLabel: "Brokerage Operational Efficiencies", isCustomerSpecific: true });
    expect(detailSlides[0].model.heroMetric).toMatchObject({ value: "$8,500", period: "/ MONTH" });
    expect(detailSlides[0].model.assumptions.map((item) => item.label)).toEqual(["Status calls per week", "Minutes saved per call", "Loaded labor rate"]);
    expect(detailSlides[0].model.calculationRationale).toBe(rationale);

    const cards = plans.filter((plan) => plan.kind === "opportunitySummary").flatMap((plan) => plan.model.classifications);
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({ title: "Reduce Manual Status Calls", value: "$8,500", period: "/ MONTH", label: "Customer-Specific Opportunity", customerSpecific: true });

    const appendix = plans.find((plan) => plan.kind === "assumptionsAppendix");
    expect(appendix?.model.modules[0].categoryName).toBe("Customer-Specific");
    expect(appendix?.model.modules[0].moduleName).toBe("Reduce Manual Status Calls");
    expect(appendix?.model.modules[0].rows.map((row) => row.label)).toContain("Calculation rationale");
    expect(appendix?.model.sources).toEqual([]);
  });

  it.each([
    ["blank", null, null],
    ["how only", "McLeod workflow automation reduces status-call handling.", null],
    ["impact only", null, "The team recovers dispatcher capacity without adding headcount."],
    ["both", "McLeod workflow automation reduces status-call handling.", "The team recovers dispatcher capacity without adding headcount."],
  ])("supports optional narrative layout variant: %s", (_name, how, impact) => {
    const detail = composePresentationSlidePlan(snapshot(customFixture({ howMcLeodHelps: how, customerBusinessImpact: impact, narrativeStatus: how && impact ? "Narrative Complete" : how || impact ? "Narrative Partially Added" : "Narrative Not Added" }))).find((plan) => plan.kind === "singleModule");
    expect(detail?.model.valueNarrative).toBe(how ?? (impact ? "" : "Narrative details may be added before customer presentation."));
    expect(detail?.model.effectiveCustomerAnalysis).toBe(impact ?? undefined);
  });

  it("exports complete custom content to PDF/HTML shared model and escapes HTML user text", () => {
    const maliciousTitle = '<img src=x onerror="alert(1)"> Reduce Manual Status Calls';
    const snap = snapshot(customFixture({ title: maliciousTitle, howMcLeodHelps: "<strong>not html</strong>" }));
    const model = buildPresentationExportModel(snap);
    const exportModule = model.categories[0].modules[0];
    expect(exportModule).toMatchObject({ moduleName: maliciousTitle, customerSpecific: true, metricValue: "$8,500 / month", calculationRationale: rationale });
    expect(exportModule.assumptions?.map((a) => a.label)).toEqual(["Status calls per week", "Minutes saved per call", "Loaded labor rate"]);
    const html = renderPresentationHtml(snap);
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt; Reduce Manual Status Calls");
    expect(html).toContain("&lt;strong&gt;not html&lt;/strong&gt;");
    expect(html).not.toContain(maliciousTitle);
  });

  it("uses snapshot-only data and distinguishes updated snapshots", () => {
    const original = snapshot();
    const edited = snapshot(customFixture({ title: "Edited Live Title", enteredValue: 9000, monthlyRecurringValue: 9000, annualRecurringValue: 108000, sourceFingerprint: "fixture-v2" }));
    expect(buildPresentationExportModel(original).categories[0].modules[0].moduleName).toBe("Reduce Manual Status Calls");
    expect(buildPresentationExportModel(original).categories[0].modules[0].metricValue).toBe("$8,500 / month");
    expect(buildPresentationExportModel(edited).categories[0].modules[0].moduleName).toBe("Edited Live Title");
    expect(buildPresentationExportModel(edited).categories[0].modules[0].metricValue).toBe("$9,000 / month");
  });

  it("keeps negative, annual-only, and informational-capital custom values semantically distinct", () => {
    const negative = composePresentationSlidePlan(snapshot(customFixture({ enteredValue: -8500, monthlyRecurringValue: -8500, annualRecurringValue: -102000 }))).find((plan) => plan.kind === "singleModule");
    expect(negative?.model.heroMetric).toMatchObject({ value: "-$8,500", label: "Economic Offset" });
    const annual = buildPresentationExportModel(snapshot(customFixture({ valueFrequency: "ANNUAL_ONLY", monthlyRecurringValue: null, annualRecurringValue: null, annualOnlyValue: 102000 }))).categories[0].modules[0];
    expect(annual.metricValue).toBe("$102,000 / year");
    const capital = buildPresentationExportModel(snapshot(customFixture({ valueClassification: "CAPITAL_AVOIDANCE", valueFrequency: "INFORMATIONAL_CAPITAL", monthlyRecurringValue: null, annualRecurringValue: null, informationalCapitalValue: 250000 }))).categories[0].modules[0];
    expect(capital.metricLabel).toBe("Informational capital");
  });
});
