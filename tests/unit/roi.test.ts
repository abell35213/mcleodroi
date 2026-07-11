import { describe, expect, it } from "vitest";
import { calculateRoi, DEFAULT_ROI_DISCOUNT_RATE, DEFAULT_ROI_HORIZON_YEARS } from "@/lib/calculations";
import type { RoiMetrics } from "@/lib/calculations";
import { roiGoldenScenarios } from "@/scripts/fixtures/roi-golden";

function expectSuccess(result: ReturnType<typeof calculateRoi>): RoiMetrics {
  expect(result.success).toBe(true);
  if (!result.success) throw new Error("expected success");
  return result.result;
}

describe("ROI / payback / NPV engine", () => {
  it("matches every hand-verified golden scenario", () => {
    for (const scenario of roiGoldenScenarios) {
      const metrics = expectSuccess(calculateRoi(scenario.inputs));
      expect(metrics.netAnnualValue).toBeCloseTo(scenario.expected.netAnnualValue, 6);
      expect(metrics.netMonthlyValue).toBeCloseTo(scenario.expected.netMonthlyValue, 6);
      if (scenario.expected.paybackMonths === null) {
        expect(metrics.paybackMonths).toBeNull();
      } else {
        expect(metrics.paybackMonths).toBeCloseTo(scenario.expected.paybackMonths, 6);
      }
      expect(metrics.firstYearRoiPct).toBeCloseTo(scenario.expected.firstYearRoiPct, 6);
      expect(metrics.horizonRoiPct).toBeCloseTo(scenario.expected.horizonRoiPct, 6);
      expect(metrics.npv).toBeCloseTo(scenario.expected.npv, 4);
      if (scenario.expected.irr === null) {
        expect(metrics.irr).toBeNull();
      } else {
        expect(metrics.irr).not.toBeNull();
        expect(metrics.irr as number).toBeCloseTo(scenario.expected.irr, 6);
      }
      expect(metrics.cumulativeBenefitCurve).toHaveLength(scenario.expected.cumulativeBenefitCurve.length);
      metrics.cumulativeBenefitCurve.forEach((point, index) => {
        const expectedPoint = scenario.expected.cumulativeBenefitCurve[index];
        expect(point.year).toBe(expectedPoint.year);
        expect(point.adoptionPct).toBeCloseTo(expectedPoint.adoptionPct, 6);
        expect(point.grossBenefit).toBeCloseTo(expectedPoint.grossBenefit, 4);
        expect(point.netBenefit).toBeCloseTo(expectedPoint.netBenefit, 4);
        expect(point.cumulativeNetBenefit).toBeCloseTo(expectedPoint.cumulativeNetBenefit, 4);
        expect(point.cumulativeNetCashFlow).toBeCloseTo(expectedPoint.cumulativeNetCashFlow, 4);
        expect(point.discountedNetBenefit).toBeCloseTo(expectedPoint.discountedNetBenefit, 4);
        expect(point.cumulativeNpv).toBeCloseTo(expectedPoint.cumulativeNpv, 4);
      });
    }
  });

  it("applies documented defaults for horizon and discount rate", () => {
    const metrics = expectSuccess(calculateRoi({ annualValue: 120000, investment: 60000 }));
    expect(metrics.annualRecurringCost).toBe(0);
    expect(metrics.horizonYears).toBe(DEFAULT_ROI_HORIZON_YEARS);
    expect(metrics.discountRatePct).toBe(DEFAULT_ROI_DISCOUNT_RATE);
    // No discount: NPV = netAnnualValue * horizonYears - investment.
    expect(metrics.npv).toBeCloseTo(120000 * DEFAULT_ROI_HORIZON_YEARS - 60000, 6);
    expect(metrics.paybackMonths).toBeCloseTo(6, 6);
    expect(metrics.adoptionSchedulePct).toEqual([1, 1, 1]);
    expect(metrics.cumulativeBenefitCurve).toHaveLength(DEFAULT_ROI_HORIZON_YEARS);
    expect(metrics.cumulativeBenefitCurve.every((point) => point.adoptionPct === 1)).toBe(true);
  });

  it("returns null payback when the net monthly value is not positive", () => {
    const zero = expectSuccess(calculateRoi({ annualValue: 100000, investment: 50000, annualRecurringCost: 100000 }));
    expect(zero.netMonthlyValue).toBe(0);
    expect(zero.paybackMonths).toBeNull();
  });

  it("rejects a non-positive investment", () => {
    const result = calculateRoi({ annualValue: 100000, investment: 0 });
    expect(result.success).toBe(false);
    if (result.success) throw new Error("expected failure");
    expect(result.issues.some((issue) => issue.field === "investment" && issue.code === "POSITIVE_REQUIRED")).toBe(true);
  });

  it("rejects negative and non-finite inputs", () => {
    expect(calculateRoi({ annualValue: -1, investment: 100 }).success).toBe(false);
    expect(calculateRoi({ annualValue: 100, investment: 100, annualRecurringCost: -1 }).success).toBe(false);
    expect(calculateRoi({ annualValue: 100, investment: 100, discountRatePct: -0.1 }).success).toBe(false);
    expect(calculateRoi({ annualValue: Number.NaN, investment: 100 }).success).toBe(false);
    expect(calculateRoi({ annualValue: 100, investment: Number.POSITIVE_INFINITY }).success).toBe(false);
  });

  it("rejects a non-integer or non-positive horizon", () => {
    expect(calculateRoi({ annualValue: 100, investment: 100, horizonYears: 2.5 }).success).toBe(false);
    expect(calculateRoi({ annualValue: 100, investment: 100, horizonYears: 0 }).success).toBe(false);
  });

  it("rejects an adoption schedule whose length does not match the horizon", () => {
    const result = calculateRoi({ annualValue: 100000, investment: 50000, horizonYears: 3, adoptionSchedulePct: [1, 1] });
    expect(result.success).toBe(false);
    if (result.success) throw new Error("expected failure");
    expect(result.issues.some((issue) => issue.field === "adoptionSchedulePct" && issue.code === "ADOPTION_SCHEDULE_LENGTH")).toBe(true);
  });

  it("rejects adoption percentages outside the 0–1 range", () => {
    const result = calculateRoi({ annualValue: 100000, investment: 50000, horizonYears: 2, adoptionSchedulePct: [0.5, 1.5] });
    expect(result.success).toBe(false);
    if (result.success) throw new Error("expected failure");
    expect(result.issues.some((issue) => issue.code === "PERCENTAGE_OUT_OF_RANGE")).toBe(true);
  });

  it("does not mutate the caller's input object", () => {
    const input = { annualValue: 300000, investment: 90000 };
    const before = { ...input };
    calculateRoi(input);
    expect(input).toEqual(before);
  });
});
