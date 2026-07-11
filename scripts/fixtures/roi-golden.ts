import type { RoiScenarioInputs, RoiYearPoint } from "@/lib/calculations";

/**
 * Canonical ROI scenarios with hand-verified expected outputs.
 *
 * These fixtures are the golden source for both the `roi:golden` inspection
 * script and the ROI unit tests. Expected values are computed by hand (and
 * cross-checked with an independent NPV/IRR reference) so the tests fail if the
 * deterministic engine ever drifts.
 *
 * ROI figures are decimal ratios, not percentage points: `3` means 300% and
 * `-1.1` means -110%. IRR is likewise a decimal (`0.4` means 40%).
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
    readonly irr: number | null;
    readonly cumulativeBenefitCurve: readonly RoiYearPoint[];
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
      irr: 3.967365141396096,
      cumulativeBenefitCurve: [
        { year: 1, adoptionPct: 1, grossBenefit: 600000, netBenefit: 600000, cumulativeNetBenefit: 600000, cumulativeNetCashFlow: 450000, discountedNetBenefit: 600000, cumulativeNpv: 450000 },
        { year: 2, adoptionPct: 1, grossBenefit: 600000, netBenefit: 600000, cumulativeNetBenefit: 1200000, cumulativeNetCashFlow: 1050000, discountedNetBenefit: 600000, cumulativeNpv: 1050000 },
        { year: 3, adoptionPct: 1, grossBenefit: 600000, netBenefit: 600000, cumulativeNetBenefit: 1800000, cumulativeNetCashFlow: 1650000, discountedNetBenefit: 600000, cumulativeNpv: 1650000 },
      ],
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
      irr: 1.919639565839936,
      cumulativeBenefitCurve: [
        { year: 1, adoptionPct: 1, grossBenefit: 500000, netBenefit: 400000, cumulativeNetBenefit: 400000, cumulativeNetCashFlow: 200000, discountedNetBenefit: 363636.3636363636, cumulativeNpv: 163636.3636363636 },
        { year: 2, adoptionPct: 1, grossBenefit: 500000, netBenefit: 400000, cumulativeNetBenefit: 800000, cumulativeNetCashFlow: 600000, discountedNetBenefit: 330578.51239669416, cumulativeNpv: 494214.8760330577 },
        { year: 3, adoptionPct: 1, grossBenefit: 500000, netBenefit: 400000, cumulativeNetBenefit: 1200000, cumulativeNetCashFlow: 1000000, discountedNetBenefit: 300525.920360631, cumulativeNpv: 794740.7963936888 },
      ],
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
      // Every net annual benefit is negative, so no rate solves NPV = 0.
      irr: null,
      cumulativeBenefitCurve: [
        { year: 1, adoptionPct: 1, grossBenefit: 50000, netBenefit: -10000, cumulativeNetBenefit: -10000, cumulativeNetCashFlow: -110000, discountedNetBenefit: -10000, cumulativeNpv: -110000 },
        { year: 2, adoptionPct: 1, grossBenefit: 50000, netBenefit: -10000, cumulativeNetBenefit: -20000, cumulativeNetCashFlow: -120000, discountedNetBenefit: -10000, cumulativeNpv: -120000 },
        { year: 3, adoptionPct: 1, grossBenefit: 50000, netBenefit: -10000, cumulativeNetBenefit: -30000, cumulativeNetCashFlow: -130000, discountedNetBenefit: -10000, cumulativeNpv: -130000 },
      ],
    },
  },
  {
    name: "Phased adoption ramp with recurring cost and 10% discount",
    inputs: {
      annualValue: 600000,
      investment: 150000,
      annualRecurringCost: 50000,
      horizonYears: 3,
      discountRatePct: 0.1,
      adoptionSchedulePct: [0.5, 0.8, 1],
    },
    expected: {
      // Scalar payback/ROI use the steady-state (full-adoption) net value.
      netAnnualValue: 550000,
      netMonthlyValue: 550000 / 12,
      paybackMonths: 150000 / (550000 / 12),
      firstYearRoiPct: (550000 - 150000) / 150000,
      horizonRoiPct: (550000 * 3 - 150000) / 150000,
      // NPV/IRR honor the ramp: net benefits are 250k, 430k, 550k.
      npv: 845867.7685950412,
      irr: 2.01868628597359,
      cumulativeBenefitCurve: [
        { year: 1, adoptionPct: 0.5, grossBenefit: 300000, netBenefit: 250000, cumulativeNetBenefit: 250000, cumulativeNetCashFlow: 100000, discountedNetBenefit: 227272.72727272726, cumulativeNpv: 77272.72727272726 },
        { year: 2, adoptionPct: 0.8, grossBenefit: 480000, netBenefit: 430000, cumulativeNetBenefit: 680000, cumulativeNetCashFlow: 530000, discountedNetBenefit: 355371.90082644625, cumulativeNpv: 432644.62809917354 },
        { year: 3, adoptionPct: 1, grossBenefit: 600000, netBenefit: 550000, cumulativeNetBenefit: 1230000, cumulativeNetCashFlow: 1080000, discountedNetBenefit: 413223.14049586764, cumulativeNpv: 845867.7685950412 },
      ],
    },
  },
];
