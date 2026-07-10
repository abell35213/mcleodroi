import { validationCodes } from "./errors";
import type { CalculationOutcome, ValidationIssue } from "./types";

export const DEFAULT_ROI_HORIZON_YEARS = 3;
export const DEFAULT_ROI_DISCOUNT_RATE = 0;

/**
 * Default, seller-editable discount rate used when an analysis opts into ROI
 * without specifying one. Expressed as a decimal (10%). The pure engine default
 * ({@link DEFAULT_ROI_DISCOUNT_RATE}) stays at 0 so unspecified callers are not
 * silently discounted; the analysis layer applies this finance-grade default.
 */
export const DEFAULT_ANALYSIS_DISCOUNT_RATE = 0.1;

/**
 * Deterministic ROI / payback / NPV / IRR inputs.
 *
 * Methodology notes (consistent with the rest of the calculation engine):
 * - Monetary values are absolute currency amounts, not display-rounded.
 * - `discountRatePct` is a decimal annual rate, so pass 10% as `0.1`.
 * - `annualValue` is the gross identified annual economic opportunity (benefit),
 *   typically the analysis `totalIdentifiedAnnualEconomicOpportunity`.
 * - `adoptionSchedulePct` optionally phases the benefit in over the horizon
 *   (decimal fractions per year). It defaults to full (100%) realization every
 *   year, so omitting it leaves every scalar metric identical to a flat model.
 */
export type RoiScenarioInputs = {
  /** Gross identified annual economic opportunity (benefit) in currency. */
  readonly annualValue: number;
  /** One-time upfront investment (implementation + setup) in currency. */
  readonly investment: number;
  /** Ongoing yearly cost such as subscription or maintenance. Defaults to 0. */
  readonly annualRecurringCost?: number;
  /** Whole-year analysis horizon. Defaults to {@link DEFAULT_ROI_HORIZON_YEARS}. */
  readonly horizonYears?: number;
  /** Annual discount rate as a decimal. Defaults to {@link DEFAULT_ROI_DISCOUNT_RATE}. */
  readonly discountRatePct?: number;
  /**
   * Optional per-year adoption ramp as decimal fractions (e.g. `[0.5, 1, 1]`).
   * When present, its length must equal `horizonYears`. Each entry scales that
   * year's gross benefit before subtracting the recurring cost. Defaults to
   * `1` (full adoption) for every year.
   */
  readonly adoptionSchedulePct?: readonly number[];
};

/** One year of the multi-year cumulative benefit curve. */
export type RoiYearPoint = {
  /** 1-based year index within the horizon. */
  readonly year: number;
  /** Adoption fraction applied to this year's gross benefit (decimal). */
  readonly adoptionPct: number;
  /** Gross realized benefit for the year (`annualValue * adoptionPct`). */
  readonly grossBenefit: number;
  /** Benefit net of the recurring cost (`grossBenefit - annualRecurringCost`). */
  readonly netBenefit: number;
  /** Running sum of `netBenefit` through this year (excludes the investment). */
  readonly cumulativeNetBenefit: number;
  /** Running net cash position including the upfront investment. */
  readonly cumulativeNetCashFlow: number;
  /** `netBenefit` discounted to present value at the annual discount rate. */
  readonly discountedNetBenefit: number;
  /** Running NPV through this year (discounted benefits less the investment). */
  readonly cumulativeNpv: number;
};

export type RoiMetrics = {
  /** Echoed, defaulted inputs used to derive the metrics. */
  readonly annualValue: number;
  readonly investment: number;
  readonly annualRecurringCost: number;
  readonly horizonYears: number;
  readonly discountRatePct: number;
  /** Adoption ramp actually applied (length equals `horizonYears`). */
  readonly adoptionSchedulePct: readonly number[];
  /** Steady-state (full-adoption) benefit net of the ongoing annual cost. */
  readonly netAnnualValue: number;
  /** Net annual value expressed monthly (`netAnnualValue / 12`). */
  readonly netMonthlyValue: number;
  /**
   * Simple (undiscounted, steady-state) payback in months. `null` when the net
   * monthly value is not positive, i.e. the investment never recoups.
   */
  readonly paybackMonths: number | null;
  /** First-year ROI as a decimal ratio (e.g. `3` means 300%): `(netAnnualValue - investment) / investment`. */
  readonly firstYearRoiPct: number;
  /** Horizon ROI as a decimal ratio (e.g. `11` means 1100%): `(netAnnualValue * horizonYears - investment) / investment`. */
  readonly horizonRoiPct: number;
  /** Net present value of the horizon cash flows, discounted annually. */
  readonly npv: number;
  /**
   * Internal rate of return as a decimal (e.g. `0.4` means 40%). `null` when no
   * rate solves NPV = 0 (e.g. every net annual benefit is non-positive).
   */
  readonly irr: number | null;
  /** Year-by-year cumulative benefit curve across the horizon. */
  readonly cumulativeBenefitCurve: readonly RoiYearPoint[];
};

function requireFiniteNumber(value: number, field: string, message: string): ValidationIssue[] {
  return typeof value === "number" && Number.isFinite(value)
    ? []
    : [{ code: validationCodes.REQUIRED_FINITE_NUMBER, field, message }];
}

function requireNonNegative(value: number, field: string, message: string): ValidationIssue[] {
  return value >= 0 ? [] : [{ code: validationCodes.NON_NEGATIVE_REQUIRED, field, message }];
}

function validateRoiInputs(inputs: {
  annualValue: number;
  investment: number;
  annualRecurringCost: number;
  horizonYears: number;
  discountRatePct: number;
  adoptionSchedulePct: readonly number[] | undefined;
}): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  issues.push(...requireFiniteNumber(inputs.annualValue, "annualValue", "Annual value must be a valid number."));
  issues.push(...requireFiniteNumber(inputs.investment, "investment", "Investment must be a valid number."));
  issues.push(
    ...requireFiniteNumber(inputs.annualRecurringCost, "annualRecurringCost", "Annual recurring cost must be a valid number."),
  );
  issues.push(...requireFiniteNumber(inputs.horizonYears, "horizonYears", "Horizon years must be a valid number."));
  issues.push(...requireFiniteNumber(inputs.discountRatePct, "discountRatePct", "Discount rate must be a valid number."));
  if (issues.length > 0) return issues;

  if (inputs.investment <= 0) {
    issues.push({
      code: validationCodes.POSITIVE_REQUIRED,
      field: "investment",
      message: "Investment must be greater than zero.",
    });
  }
  issues.push(...requireNonNegative(inputs.annualValue, "annualValue", "Annual value cannot be negative."));
  issues.push(
    ...requireNonNegative(inputs.annualRecurringCost, "annualRecurringCost", "Annual recurring cost cannot be negative."),
  );
  issues.push(...requireNonNegative(inputs.discountRatePct, "discountRatePct", "Discount rate cannot be negative."));
  if (!Number.isInteger(inputs.horizonYears)) {
    issues.push({
      code: validationCodes.INTEGER_REQUIRED,
      field: "horizonYears",
      message: "Horizon years must be a whole number.",
    });
  } else if (inputs.horizonYears <= 0) {
    issues.push({
      code: validationCodes.POSITIVE_REQUIRED,
      field: "horizonYears",
      message: "Horizon years must be greater than zero.",
    });
  }

  if (inputs.adoptionSchedulePct !== undefined) {
    if (Number.isInteger(inputs.horizonYears) && inputs.adoptionSchedulePct.length !== inputs.horizonYears) {
      issues.push({
        code: validationCodes.ADOPTION_SCHEDULE_LENGTH,
        field: "adoptionSchedulePct",
        message: "Adoption schedule must provide exactly one value per horizon year.",
      });
    }
    inputs.adoptionSchedulePct.forEach((pct, index) => {
      const field = `adoptionSchedulePct[${index}]`;
      const finite = requireFiniteNumber(pct, field, "Adoption percentage must be a valid number.");
      if (finite.length > 0) {
        issues.push(...finite);
        return;
      }
      if (pct < 0 || pct > 1) {
        issues.push({
          code: validationCodes.PERCENTAGE_OUT_OF_RANGE,
          field,
          message: "Adoption percentage must be between 0 and 1.",
        });
      }
    });
  }
  return issues;
}

/**
 * Solve for the internal rate of return via bisection over the horizon cash
 * flows `[-investment, netBenefit_1, ..., netBenefit_H]`. Returns `null` when
 * no rate brackets a sign change (e.g. all net benefits are non-positive).
 */
function computeIrr(investment: number, netBenefits: readonly number[]): number | null {
  const npvAt = (rate: number): number => {
    let acc = -investment;
    for (let year = 1; year <= netBenefits.length; year += 1) {
      acc += netBenefits[year - 1] / (1 + rate) ** year;
    }
    return acc;
  };

  const low = -0.999999;
  const high = 1e6;
  const fLow = npvAt(low);
  const fHigh = npvAt(high);
  if (!Number.isFinite(fLow) || !Number.isFinite(fHigh)) return null;
  if (fLow === 0) return low;
  if (fHigh === 0) return high;
  if (fLow > 0 === fHigh > 0) return null;

  const lowIsPositive = fLow > 0;
  let a = low;
  let b = high;
  for (let iteration = 0; iteration < 200; iteration += 1) {
    const mid = (a + b) / 2;
    const fMid = npvAt(mid);
    if (fMid === 0 || (b - a) / 2 < 1e-12) return mid;
    if (fMid > 0 === lowIsPositive) {
      a = mid;
    } else {
      b = mid;
    }
  }
  return (a + b) / 2;
}

/**
 * Compute deterministic ROI, simple payback, NPV, IRR, and a multi-year
 * cumulative benefit curve for an investment scenario.
 *
 * The calculation preserves internal precision and never performs display
 * rounding, matching the rest of the calculation engine. Scalar payback and ROI
 * ratios use the steady-state (full-adoption) net annual value; the adoption
 * ramp is honored by NPV, IRR, and the cumulative benefit curve.
 */
export function calculateRoi(inputs: RoiScenarioInputs): CalculationOutcome<RoiMetrics> {
  const annualValue = inputs.annualValue;
  const investment = inputs.investment;
  const annualRecurringCost = inputs.annualRecurringCost ?? 0;
  const horizonYears = inputs.horizonYears ?? DEFAULT_ROI_HORIZON_YEARS;
  const discountRatePct = inputs.discountRatePct ?? DEFAULT_ROI_DISCOUNT_RATE;

  const issues = validateRoiInputs({
    annualValue,
    investment,
    annualRecurringCost,
    horizonYears,
    discountRatePct,
    adoptionSchedulePct: inputs.adoptionSchedulePct,
  });
  if (issues.length > 0) return { success: false, issues };

  const adoptionSchedulePct = inputs.adoptionSchedulePct
    ? [...inputs.adoptionSchedulePct]
    : Array.from({ length: horizonYears }, () => 1);

  const netAnnualValue = annualValue - annualRecurringCost;
  const netMonthlyValue = netAnnualValue / 12;
  const paybackMonths = netMonthlyValue > 0 ? investment / netMonthlyValue : null;
  const firstYearRoiPct = (netAnnualValue - investment) / investment;
  const horizonRoiPct = (netAnnualValue * horizonYears - investment) / investment;

  const cumulativeBenefitCurve: RoiYearPoint[] = [];
  const netBenefits: number[] = [];
  let cumulativeNetBenefit = 0;
  let cumulativeDiscountedBenefit = 0;
  for (let year = 1; year <= horizonYears; year += 1) {
    const adoptionPct = adoptionSchedulePct[year - 1];
    const grossBenefit = annualValue * adoptionPct;
    const netBenefit = grossBenefit - annualRecurringCost;
    const discountedNetBenefit = netBenefit / (1 + discountRatePct) ** year;
    cumulativeNetBenefit += netBenefit;
    cumulativeDiscountedBenefit += discountedNetBenefit;
    netBenefits.push(netBenefit);
    cumulativeBenefitCurve.push({
      year,
      adoptionPct,
      grossBenefit,
      netBenefit,
      cumulativeNetBenefit,
      cumulativeNetCashFlow: cumulativeNetBenefit - investment,
      discountedNetBenefit,
      cumulativeNpv: cumulativeDiscountedBenefit - investment,
    });
  }

  const npv = cumulativeDiscountedBenefit - investment;
  const irr = computeIrr(investment, netBenefits);

  return {
    success: true,
    result: {
      annualValue,
      investment,
      annualRecurringCost,
      horizonYears,
      discountRatePct,
      adoptionSchedulePct,
      netAnnualValue,
      netMonthlyValue,
      paybackMonths,
      firstYearRoiPct,
      horizonRoiPct,
      npv,
      irr,
      cumulativeBenefitCurve,
    },
  };
}
