import type { RoiMetrics } from "@/lib/calculations";
import { deriveRoiForAnnualValue } from "@/lib/analyses/service";
import type { AnalysisInvestment, CalculatedAnalysis } from "@/lib/analyses/types";

/**
 * Optional sensitivity ("scenario") layer for the Review value story.
 *
 * A single adjustment factor scales the identified annual economic opportunity
 * and its recurring/annual-only components, then ROI is re-derived against the
 * same, unchanged investment assumptions. This never re-runs the deterministic
 * module calculation engine — the Expected case (factor `1`) is always byte-for
 * -byte identical to the headline analysis — so scenarios are a presentation
 * aid, not a second source of truth. The feature is surfaced off by default in
 * the UI.
 */

export const scenarioCaseKeys = ["CONSERVATIVE", "EXPECTED", "AGGRESSIVE"] as const;
export type ScenarioCaseKey = (typeof scenarioCaseKeys)[number];

export type ScenarioFactors = Readonly<Record<ScenarioCaseKey, number>>;

/**
 * Default adjustment factors. Conservative discounts the identified opportunity
 * by 15%; Aggressive adds 15%; Expected mirrors the deterministic analysis
 * exactly. Factors are deliberately symmetric and modest so the range reads as a
 * credible sensitivity band rather than a sales inflation.
 */
export const DEFAULT_SCENARIO_FACTORS: ScenarioFactors = {
  CONSERVATIVE: 0.85,
  EXPECTED: 1,
  AGGRESSIVE: 1.15,
};

export const scenarioCaseLabels: Readonly<Record<ScenarioCaseKey, string>> = {
  CONSERVATIVE: "Conservative",
  EXPECTED: "Expected",
  AGGRESSIVE: "Aggressive",
};

export const scenarioCaseDescriptions: Readonly<Record<ScenarioCaseKey, string>> = {
  CONSERVATIVE: "Cautious realization of the identified opportunity.",
  EXPECTED: "The deterministic analysis exactly as modeled.",
  AGGRESSIVE: "Fuller realization if adoption and execution exceed plan.",
};

export type ScenarioCase = {
  readonly key: ScenarioCaseKey;
  readonly label: string;
  readonly description: string;
  /** Multiplier applied to the identified opportunity (Expected is `1`). */
  readonly factor: number;
  readonly monthlyRecurringValue: number;
  readonly annualRecurringValue: number;
  readonly annualOnlyValue: number;
  /** Scaled identified annual economic opportunity for this case. */
  readonly totalIdentifiedAnnualEconomicOpportunity: number;
  /** ROI re-derived for the scaled opportunity; `null` when no investment. */
  readonly roi: RoiMetrics | null;
};

export type ScenarioComparison = {
  readonly cases: readonly ScenarioCase[];
  /** True when a positive investment produced ROI outputs to compare. */
  readonly hasRoi: boolean;
};

function scenarioCase(
  key: ScenarioCaseKey,
  factor: number,
  summary: CalculatedAnalysis["summary"],
  investment: AnalysisInvestment,
): ScenarioCase {
  const safeFactor = Number.isFinite(factor) && factor >= 0 ? factor : 1;
  const total = summary.totalIdentifiedAnnualEconomicOpportunity * safeFactor;
  return {
    key,
    label: scenarioCaseLabels[key],
    description: scenarioCaseDescriptions[key],
    factor: safeFactor,
    monthlyRecurringValue: summary.monthlyRecurringValueTotal * safeFactor,
    annualRecurringValue: summary.annualRecurringValueTotal * safeFactor,
    annualOnlyValue: summary.annualOnlyValueTotal * safeFactor,
    totalIdentifiedAnnualEconomicOpportunity: total,
    roi: deriveRoiForAnnualValue(investment, total),
  };
}

/**
 * Build the conservative/expected/aggressive comparison from an already
 * calculated analysis. Pure and deterministic. Callers can override the factors
 * (e.g. to widen the band); values must be finite and non-negative.
 */
export function buildScenarioComparison(
  calculated: CalculatedAnalysis,
  factors: ScenarioFactors = DEFAULT_SCENARIO_FACTORS,
): ScenarioComparison {
  const cases = scenarioCaseKeys.map((key) =>
    scenarioCase(key, factors[key], calculated.summary, calculated.investment),
  );
  return { cases, hasRoi: cases.some((scenario) => scenario.roi !== null) };
}
