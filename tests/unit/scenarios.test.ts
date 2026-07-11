import { describe, expect, it } from "vitest";
import {
  DEFAULT_SCENARIO_FACTORS,
  buildScenarioComparison,
  scenarioCaseKeys,
} from "@/lib/analyses/scenarios";
import { calculateRoi } from "@/lib/calculations";
import type { AnalysisInvestment, CalculatedAnalysis } from "@/lib/analyses/types";

const noInvestment: AnalysisInvestment = {
  investmentOneTimeCost: null,
  investmentAnnualRecurringCost: null,
  investmentChangeManagementCost: null,
  roiHorizonYears: null,
  roiDiscountRatePct: null,
  adoptionSchedulePct: null,
};

function makeAnalysis(
  overrides: {
    monthly?: number;
    annualRecurring?: number;
    annualOnly?: number;
    investment?: Partial<AnalysisInvestment>;
  } = {},
): CalculatedAnalysis {
  const annualRecurring = overrides.annualRecurring ?? 600000;
  const annualOnly = overrides.annualOnly ?? 0;
  return {
    analysis: { id: "a1", companyName: "Acme", businessType: "TRUCKLOAD", status: "REVIEW" },
    calculatedModules: [],
    overlapNotices: [],
    overlapReviewStates: [],
    summary: {
      monthlyRecurringValueTotal: overrides.monthly ?? 50000,
      annualRecurringValueTotal: annualRecurring,
      annualOnlyValueTotal: annualOnly,
      totalIdentifiedAnnualEconomicOpportunity: annualRecurring + annualOnly,
      informationalCapitalValueTotal: 0,
      valueTypeBreakdown: [],
      informationalCapitalValues: [],
      moduleCount: 3,
      completeModuleCount: 3,
      incompleteModuleCount: 0,
    },
    workflowReadiness: {
      hasSelectedModules: true,
      allSelectedModulesComplete: true,
      canReview: true,
      canGeneratePresentation: true,
    },
    investment: { ...noInvestment, ...overrides.investment },
    roi: null,
  };
}

describe("scenario comparison", () => {
  it("exposes lower, base, and higher cases in order", () => {
    const comparison = buildScenarioComparison(makeAnalysis());
    expect(comparison.cases.map((scenario) => scenario.key)).toEqual([...scenarioCaseKeys]);
    expect(comparison.cases.map((scenario) => scenario.key)).toEqual([
      "LOWER_REALIZATION",
      "BASE_REALIZATION",
      "HIGHER_REALIZATION",
    ]);
  });

  it("keeps the base case identical to the headline analysis", () => {
    const analysis = makeAnalysis({ monthly: 50000, annualRecurring: 600000, annualOnly: 40000 });
    const base = buildScenarioComparison(analysis).cases.find((scenario) => scenario.key === "BASE_REALIZATION")!;
    expect(base.factor).toBe(1);
    expect(base.monthlyRecurringValue).toBe(50000);
    expect(base.annualRecurringValue).toBe(600000);
    expect(base.annualOnlyValue).toBe(40000);
    expect(base.totalIdentifiedAnnualEconomicOpportunity).toBe(640000);
  });

  it("scales every component by the case factor", () => {
    const analysis = makeAnalysis({ monthly: 50000, annualRecurring: 600000, annualOnly: 40000 });
    const comparison = buildScenarioComparison(analysis);
    const lower = comparison.cases.find((scenario) => scenario.key === "LOWER_REALIZATION")!;
    const higher = comparison.cases.find((scenario) => scenario.key === "HIGHER_REALIZATION")!;
    expect(lower.factor).toBe(DEFAULT_SCENARIO_FACTORS.LOWER_REALIZATION);
    expect(lower.totalIdentifiedAnnualEconomicOpportunity).toBeCloseTo(640000 * 0.85, 6);
    expect(lower.monthlyRecurringValue).toBeCloseTo(50000 * 0.85, 6);
    expect(higher.totalIdentifiedAnnualEconomicOpportunity).toBeCloseTo(640000 * 1.15, 6);
    expect(higher.annualOnlyValue).toBeCloseTo(40000 * 1.15, 6);
  });

  it("omits ROI when there is no investment", () => {
    const comparison = buildScenarioComparison(makeAnalysis());
    expect(comparison.hasRoi).toBe(false);
    expect(comparison.cases.every((scenario) => scenario.roi === null)).toBe(true);
  });

  it("re-derives ROI per scenario against the same, unchanged investment", () => {
    const investment: Partial<AnalysisInvestment> = {
      investmentOneTimeCost: 150000,
      investmentAnnualRecurringCost: 60000,
      roiHorizonYears: 3,
      roiDiscountRatePct: 0.1,
    };
    const analysis = makeAnalysis({ annualRecurring: 600000, annualOnly: 0, investment });
    const comparison = buildScenarioComparison(analysis);
    expect(comparison.hasRoi).toBe(true);

    const lower = comparison.cases.find((scenario) => scenario.key === "LOWER_REALIZATION")!;
    const baseRoi = calculateRoi({
      annualValue: 600000 * 0.85,
      investment: 150000,
      annualRecurringCost: 60000,
      horizonYears: 3,
      discountRatePct: 0.1,
    });
    expect(baseRoi.success).toBe(true);
    if (!baseRoi.success) throw new Error("roi failed");
    // Same fixed investment across every scenario.
    expect(lower.roi?.investment).toBe(150000);
    expect(lower.roi?.annualValue).toBeCloseTo(600000 * 0.85, 6);
    expect(lower.roi?.npv).toBeCloseTo(baseRoi.result.npv, 6);
    expect(lower.roi?.paybackMonths).toBeCloseTo(baseRoi.result.paybackMonths ?? NaN, 6);

    const higher = comparison.cases.find((scenario) => scenario.key === "HIGHER_REALIZATION")!;
    // A larger benefit recoups faster than the lower case.
    expect(higher.roi!.paybackMonths!).toBeLessThan(lower.roi!.paybackMonths!);
  });

  it("supports custom factors and guards against invalid values", () => {
    const analysis = makeAnalysis({ annualRecurring: 100000, annualOnly: 0 });
    const comparison = buildScenarioComparison(analysis, {
      LOWER_REALIZATION: 0.5,
      BASE_REALIZATION: 1,
      HIGHER_REALIZATION: Number.NaN,
    });
    expect(comparison.cases.find((scenario) => scenario.key === "LOWER_REALIZATION")!.totalIdentifiedAnnualEconomicOpportunity).toBe(85000);
    // Invalid factor set falls back to the centralized defaults rather than producing NaN.
    expect(comparison.cases.find((scenario) => scenario.key === "HIGHER_REALIZATION")!.factor).toBe(1.15);
    expect(comparison.cases.find((scenario) => scenario.key === "HIGHER_REALIZATION")!.totalIdentifiedAnnualEconomicOpportunity).toBeCloseTo(115000, 6);
  });
});
