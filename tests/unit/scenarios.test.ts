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
  it("exposes conservative, expected, and aggressive cases in order", () => {
    const comparison = buildScenarioComparison(makeAnalysis());
    expect(comparison.cases.map((scenario) => scenario.key)).toEqual([...scenarioCaseKeys]);
    expect(comparison.cases.map((scenario) => scenario.key)).toEqual([
      "CONSERVATIVE",
      "EXPECTED",
      "AGGRESSIVE",
    ]);
  });

  it("keeps the expected case identical to the headline analysis", () => {
    const analysis = makeAnalysis({ monthly: 50000, annualRecurring: 600000, annualOnly: 40000 });
    const expected = buildScenarioComparison(analysis).cases.find((scenario) => scenario.key === "EXPECTED")!;
    expect(expected.factor).toBe(1);
    expect(expected.monthlyRecurringValue).toBe(50000);
    expect(expected.annualRecurringValue).toBe(600000);
    expect(expected.annualOnlyValue).toBe(40000);
    expect(expected.totalIdentifiedAnnualEconomicOpportunity).toBe(640000);
  });

  it("scales every component by the case factor", () => {
    const analysis = makeAnalysis({ monthly: 50000, annualRecurring: 600000, annualOnly: 40000 });
    const comparison = buildScenarioComparison(analysis);
    const conservative = comparison.cases.find((scenario) => scenario.key === "CONSERVATIVE")!;
    const aggressive = comparison.cases.find((scenario) => scenario.key === "AGGRESSIVE")!;
    expect(conservative.factor).toBe(DEFAULT_SCENARIO_FACTORS.CONSERVATIVE);
    expect(conservative.totalIdentifiedAnnualEconomicOpportunity).toBeCloseTo(640000 * 0.85, 6);
    expect(conservative.monthlyRecurringValue).toBeCloseTo(50000 * 0.85, 6);
    expect(aggressive.totalIdentifiedAnnualEconomicOpportunity).toBeCloseTo(640000 * 1.15, 6);
    expect(aggressive.annualOnlyValue).toBeCloseTo(40000 * 1.15, 6);
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

    const conservative = comparison.cases.find((scenario) => scenario.key === "CONSERVATIVE")!;
    const expectedRoi = calculateRoi({
      annualValue: 600000 * 0.85,
      investment: 150000,
      annualRecurringCost: 60000,
      horizonYears: 3,
      discountRatePct: 0.1,
    });
    expect(expectedRoi.success).toBe(true);
    if (!expectedRoi.success) throw new Error("roi failed");
    // Same fixed investment across every scenario.
    expect(conservative.roi?.investment).toBe(150000);
    expect(conservative.roi?.annualValue).toBeCloseTo(600000 * 0.85, 6);
    expect(conservative.roi?.npv).toBeCloseTo(expectedRoi.result.npv, 6);
    expect(conservative.roi?.paybackMonths).toBeCloseTo(expectedRoi.result.paybackMonths ?? NaN, 6);

    const aggressive = comparison.cases.find((scenario) => scenario.key === "AGGRESSIVE")!;
    // A larger benefit recoups faster than the conservative case.
    expect(aggressive.roi!.paybackMonths!).toBeLessThan(conservative.roi!.paybackMonths!);
  });

  it("supports custom factors and guards against invalid values", () => {
    const analysis = makeAnalysis({ annualRecurring: 100000, annualOnly: 0 });
    const comparison = buildScenarioComparison(analysis, {
      CONSERVATIVE: 0.5,
      EXPECTED: 1,
      AGGRESSIVE: Number.NaN,
    });
    expect(comparison.cases.find((scenario) => scenario.key === "CONSERVATIVE")!.totalIdentifiedAnnualEconomicOpportunity).toBe(50000);
    // Invalid factor falls back to 1 (no scaling) rather than producing NaN.
    expect(comparison.cases.find((scenario) => scenario.key === "AGGRESSIVE")!.factor).toBe(1);
    expect(comparison.cases.find((scenario) => scenario.key === "AGGRESSIVE")!.totalIdentifiedAnnualEconomicOpportunity).toBe(100000);
  });
});
