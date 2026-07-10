import { validationCodes } from "./errors";
import type { CalculationOutcome, ValidationIssue } from "./types";

export const DEFAULT_ROI_HORIZON_YEARS = 3;
export const DEFAULT_ROI_DISCOUNT_RATE = 0;

/**
 * Deterministic ROI / payback / NPV inputs.
 *
 * Methodology notes (consistent with the rest of the calculation engine):
 * - Monetary values are absolute currency amounts, not display-rounded.
 * - `discountRatePct` is a decimal annual rate, so pass 10% as `0.1`.
 * - `annualValue` is the gross identified annual economic opportunity (benefit),
 *   typically the analysis `totalIdentifiedAnnualEconomicOpportunity`.
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
};

export type RoiMetrics = {
  /** Echoed, defaulted inputs used to derive the metrics. */
  readonly annualValue: number;
  readonly investment: number;
  readonly annualRecurringCost: number;
  readonly horizonYears: number;
  readonly discountRatePct: number;
  /** Benefit net of the ongoing annual cost. */
  readonly netAnnualValue: number;
  /** Net annual value expressed monthly (`netAnnualValue / 12`). */
  readonly netMonthlyValue: number;
  /**
   * Simple (undiscounted) payback in months. `null` when the net monthly value
   * is not positive, i.e. the investment never recoups.
   */
  readonly paybackMonths: number | null;
  /** First-year ROI as a decimal ratio (e.g. `3` means 300%): `(netAnnualValue - investment) / investment`. */
  readonly firstYearRoiPct: number;
  /** Horizon ROI as a decimal ratio (e.g. `11` means 1100%): `(netAnnualValue * horizonYears - investment) / investment`. */
  readonly horizonRoiPct: number;
  /** Net present value of the horizon cash flows, discounted annually. */
  readonly npv: number;
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
  return issues;
}

/**
 * Compute deterministic ROI, simple payback, and NPV for an investment scenario.
 *
 * The calculation preserves internal precision and never performs display
 * rounding, matching the rest of the calculation engine.
 */
export function calculateRoi(inputs: RoiScenarioInputs): CalculationOutcome<RoiMetrics> {
  const annualValue = inputs.annualValue;
  const investment = inputs.investment;
  const annualRecurringCost = inputs.annualRecurringCost ?? 0;
  const horizonYears = inputs.horizonYears ?? DEFAULT_ROI_HORIZON_YEARS;
  const discountRatePct = inputs.discountRatePct ?? DEFAULT_ROI_DISCOUNT_RATE;

  const issues = validateRoiInputs({ annualValue, investment, annualRecurringCost, horizonYears, discountRatePct });
  if (issues.length > 0) return { success: false, issues };

  const netAnnualValue = annualValue - annualRecurringCost;
  const netMonthlyValue = netAnnualValue / 12;
  const paybackMonths = netMonthlyValue > 0 ? investment / netMonthlyValue : null;
  const firstYearRoiPct = (netAnnualValue - investment) / investment;
  const horizonRoiPct = (netAnnualValue * horizonYears - investment) / investment;

  let discountedBenefit = 0;
  for (let year = 1; year <= horizonYears; year += 1) {
    discountedBenefit += netAnnualValue / (1 + discountRatePct) ** year;
  }
  const npv = discountedBenefit - investment;

  return {
    success: true,
    result: {
      annualValue,
      investment,
      annualRecurringCost,
      horizonYears,
      discountRatePct,
      netAnnualValue,
      netMonthlyValue,
      paybackMonths,
      firstYearRoiPct,
      horizonRoiPct,
      npv,
    },
  };
}
