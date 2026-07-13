import { describe, expect, it } from "vitest";
import { calculateRoi } from "@/lib/calculations";
import { composePresentationSlidePlan } from "@/lib/presentation/composition";
import type { PresentationSnapshot, PresentationSnapshotModule } from "@/lib/presentation/types";

function roiFor(inputs: Parameters<typeof calculateRoi>[0]) {
  const result = calculateRoi(inputs);
  if (!result.success) throw new Error("ROI fixture failed");
  return result.result;
}

function moduleFixture(overrides: Partial<PresentationSnapshotModule> = {}): PresentationSnapshotModule {
  return {
    analysisModuleId: "module-1",
    moduleKey: "REDUCE_DEADHEAD",
    moduleName: "Reduce Deadhead Miles",
    categoryKey: "TL_TRUCKING_OPERATIONS",
    categoryName: "Trucking Operations",
    displayOrder: 1,
    valueType: "COST_REDUCTION",
    narrativeStatus: "DRAFT_APPROVED",
    narrativeMode: "TEMPLATE",
    inputs: { current_deadhead_pct: 0.18, target_deadhead_pct: 0.16, monthly_miles: 100000, variable_cost_per_mile: 1 },
    financialOutputs: { monthlyRecurringValue: 10000, annualRecurringValue: 120000, annualOnlyValue: 0, informationalCapitalValue: 50000 },
    derivedMetrics: {},
    opportunityHeadline: "Reduce empty miles",
    valueNarrative: "McLeod helps reduce empty miles.",
    defaultCustomerAnalysis: "Analysis text.",
    effectiveCustomerAnalysis: "Analysis text.",
    presentationDisclaimer: "Planning estimate.",
    presentationCallout: "Fewer empty miles",
    customNarrativeSourceFingerprint: null,
    ...overrides,
  };
}

function snapshot(roi: PresentationSnapshot["roi"]): PresentationSnapshot {
  return {
    snapshotVersion: "1.5.0",
    presentationTemplateVersion: "1.3.0",
    narrativeRegistryVersion: "test",
    createdAt: "2026-07-13T00:00:00.000Z",
    analysis: { id: "analysis-1", companyName: "Acme Logistics", customerContact: null, businessType: "TRUCKLOAD", productContext: "LOADMASTER", preparedBy: "Tester", analysisDate: "2026-07-13T00:00:00.000Z" },
    summary: { monthlyRecurringValueTotal: 10000, annualRecurringValueTotal: 120000, annualOnlyValueTotal: 0, totalIdentifiedAnnualEconomicOpportunity: 120000, informationalCapitalValueTotal: 50000, valueTypeBreakdown: [], informationalCapitalValues: [] },
    overlapNotices: [],
    categories: [{ categoryKey: "TL_TRUCKING_OPERATIONS", name: "Trucking Operations", displayOrder: 1, modules: [moduleFixture()] }],
    roi,
  };
}

function investmentPlan(plans: ReturnType<typeof composePresentationSlidePlan>) {
  return plans.find((plan) => plan.kind === "investmentReturn");
}

describe("investment return presentation slide", () => {
  it("omits the slide when no investment is configured", () => {
    const plans = composePresentationSlidePlan(snapshot(null));
    expect(plans.some((plan) => plan.kind === "investmentReturn")).toBe(false);
  });

  it("includes exactly one slide after final identified opportunities and before assumptions", () => {
    const plans = composePresentationSlidePlan(snapshot(roiFor({ annualValue: 240000, investment: 120000, annualRecurringCost: 30000, horizonYears: 3, discountRatePct: 0.1, adoptionSchedulePct: [0.5, 0.75, 1] })));
    expect(plans.filter((plan) => plan.kind === "investmentReturn")).toHaveLength(1);
    const returnIndex = plans.findIndex((plan) => plan.kind === "investmentReturn");
    expect(returnIndex).toBeGreaterThan(plans.map((plan, index) => plan.kind === "opportunitySummary" ? index : -1).reduce((a, b) => Math.max(a, b), -1));
    const appendixIndex = plans.findIndex((plan) => plan.kind === "assumptionsAppendix");
    expect(appendixIndex).toBeGreaterThan(returnIndex);
  });

  it("builds customer-specific estimated explanation without guaranteed language", () => {
    const plan = investmentPlan(composePresentationSlidePlan(snapshot(roiFor({ annualValue: 240000, investment: 120000, annualRecurringCost: 30000, horizonYears: 3, discountRatePct: 0.1, adoptionSchedulePct: [0.5, 0.75, 1] }))));
    expect(plan?.kind).toBe("investmentReturn");
    if (plan?.kind !== "investmentReturn") return;
    expect(plan.model.explanationText).toContain("Acme Logistics");
    expect(plan.model.explanationText).toContain("estimated to achieve payback within 15 months");
    expect(plan.model.explanationText.toLowerCase()).not.toMatch(/guaranteed|will achieve|certain return/);
  });

  it("uses canonical monthly cash-flow points and reconciles payback marker", () => {
    const roi = roiFor({ annualValue: 240000, investment: 120000, annualRecurringCost: 30000, horizonYears: 3, discountRatePct: 0.1, adoptionSchedulePct: [0.5, 0.75, 1] });
    const plan = investmentPlan(composePresentationSlidePlan(snapshot(roi)));
    if (plan?.kind !== "investmentReturn") throw new Error("missing slide");
    expect(plan.model.cumulativeCashFlowPoints).toEqual(roi.cumulativeCashFlowPoints);
    expect(plan.model.cumulativeCashFlowPoints[0]).toEqual({ month: 0, cumulativeNetCashFlow: -120000 });
    const crossing = plan.model.cumulativeCashFlowPoints.find((point) => point.cumulativeNetCashFlow >= 0);
    expect(crossing?.month).toBe(roi.paybackMonths);
    expect(plan.model.cumulativeCashFlowPoints.at(-1)?.cumulativeNetCashFlow).toBeCloseTo(roi.cumulativeBenefitCurve.at(-1)!.cumulativeNetCashFlow);
  });

  it("renders no crossing marker state when payback is not achieved", () => {
    const plan = investmentPlan(composePresentationSlidePlan(snapshot(roiFor({ annualValue: 10000, investment: 120000, annualRecurringCost: 5000, horizonYears: 3, adoptionSchedulePct: [0.5, 0.75, 1] }))));
    if (plan?.kind !== "investmentReturn") throw new Error("missing slide");
    expect(plan.model.paybackMonths).toBeNull();
    expect(plan.model.paybackDisplay).toBe("Not achieved within 3 years");
  });

  it("prepares financial table labels, null states, and adoption schedule without non-finite text", () => {
    const plan = investmentPlan(composePresentationSlidePlan(snapshot(roiFor({ annualValue: 100000, investment: 0, annualRecurringCost: 20000, horizonYears: 3, adoptionSchedulePct: [0.25, 0.5, 0.75] }))));
    if (plan?.kind !== "investmentReturn") throw new Error("missing slide");
    expect(plan.model.initialInvestment).toBe("$0");
    expect(plan.model.annualRecurringInvestment).toBe("$20,000");
    expect(plan.model.firstYearROI).toBe("Not applicable");
    expect(plan.model.horizonROI).toBe("Not applicable");
    expect(plan.model.netPresentValue).toBe("$90,000");
    expect(plan.model.internalRateOfReturn).toBe("Unable to calculate");
    expect(plan.model.adoptionSchedule.map((row) => `${row.year}:${row.display}`)).toEqual(["1:25%", "2:50%", "3:75%"]);
    expect(JSON.stringify(plan.model)).not.toMatch(/NaN|Infinity|undefined/);
  });
});
