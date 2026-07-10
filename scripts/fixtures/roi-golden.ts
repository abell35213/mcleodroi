import type { RoiScenarioInputs } from "@/lib/calculations";

/**
 * Canonical ROI scenarios with hand-verified expected outputs.
 *
 * These fixtures are the golden source for both the `roi:golden` inspection
 * script and the ROI unit tests. Expected values are computed by hand so the
 * tests fail if the deterministic engine ever drifts.
 *
 * ROI figures are decimal ratios, not percentage points: `3` means 300% and
 * `-1.1` means -110%.
 */
export type RoiGoldenScenario = {
  readonly name: string;
  readonly inputs: RoiScenarioInputs;
  readonly expected: {
    readonly netAnnualValue: number;
    readonly netMonthlyValue: number;
    readonly paybackMonths: number | null;
    readonly firstYearRoiPct: number;
    readonly horizonRoiPct: number;
    readonly npv: number;
  };
};

export const roiGoldenScenarios: readonly RoiGoldenScenario[] = [
  {
    name: "Simple recovery, no ongoing cost or discount",
    inputs: { annualValue: 600000, investment: 150000, horizonYears: 3, discountRatePct: 0 },
    expected: {
      netAnnualValue: 600000,
      netMonthlyValue: 50000,
      paybackMonths: 3,
      firstYearRoiPct: 3,
      horizonRoiPct: 11,
      npv: 1650000,
    },
  },
  {
    name: "Recurring cost with 10% annual discount",
    inputs: { annualValue: 500000, investment: 200000, annualRecurringCost: 100000, horizonYears: 3, discountRatePct: 0.1 },
    expected: {
      netAnnualValue: 400000,
      netMonthlyValue: 400000 / 12,
      paybackMonths: 6,
      firstYearRoiPct: 1,
      horizonRoiPct: 5,
      // -200000 + 400000/1.1 + 400000/1.21 + 400000/1.331
      npv: 794740.7963936884,
    },
  },
  {
    name: "Non-recouping scenario, net value below zero",
    inputs: { annualValue: 50000, investment: 100000, annualRecurringCost: 60000, horizonYears: 3, discountRatePct: 0 },
    expected: {
      netAnnualValue: -10000,
      netMonthlyValue: -10000 / 12,
      paybackMonths: null,
      firstYearRoiPct: -1.1,
      horizonRoiPct: -1.3,
      npv: -130000,
    },
  },
];
