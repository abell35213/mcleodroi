import type { RoiMetrics } from "@/lib/calculations";
import { deriveRoiForAnnualValue } from "@/lib/analyses/service";
import type { AnalysisInvestment, CalculatedAnalysis } from "@/lib/analyses/types";

export const SENSITIVITY_REGISTRY_VERSION = "2026-07-11";
export const SENSITIVITY_DISCLAIMER = "These scenarios illustrate the impact of different benefit-realization percentages. They are not probability-weighted forecasts.";
export const sensitivityCaseKeys = ["LOWER_REALIZATION", "BASE_REALIZATION", "HIGHER_REALIZATION"] as const;
export type SensitivityCaseKey = (typeof sensitivityCaseKeys)[number];
export type SensitivityFactors = Readonly<Record<SensitivityCaseKey, number>>;
export const DEFAULT_SENSITIVITY_FACTORS: SensitivityFactors = { LOWER_REALIZATION: 0.85, BASE_REALIZATION: 1, HIGHER_REALIZATION: 1.15 };
export const scenarioCaseKeys = sensitivityCaseKeys;
export type ScenarioCaseKey = SensitivityCaseKey;
export type ScenarioFactors = SensitivityFactors;
export const DEFAULT_SCENARIO_FACTORS = DEFAULT_SENSITIVITY_FACTORS;
export const sensitivityCaseLabels: Readonly<Record<SensitivityCaseKey, string>> = { LOWER_REALIZATION: "Lower Realization", BASE_REALIZATION: "Base Realization", HIGHER_REALIZATION: "Higher Realization" };
export const scenarioCaseLabels = sensitivityCaseLabels;
export const sensitivityCaseDescriptions: Readonly<Record<SensitivityCaseKey, string>> = { LOWER_REALIZATION: "85% realization of the identified opportunity.", BASE_REALIZATION: "100% realization: the deterministic analysis exactly as modeled.", HIGHER_REALIZATION: "115% realization of the identified opportunity." };
export const scenarioCaseDescriptions = sensitivityCaseDescriptions;

export type ScenarioCase = { readonly key: ScenarioCaseKey; readonly label: string; readonly description: string; readonly factor: number; readonly monthlyRecurringValue: number; readonly annualRecurringValue: number; readonly annualOnlyValue: number; readonly informationalCapitalValue: number; readonly totalIdentifiedAnnualEconomicOpportunity: number; readonly roi: RoiMetrics | null };
export type ScenarioComparison = { readonly cases: readonly ScenarioCase[]; readonly hasRoi: boolean; readonly disclaimer: string; readonly registryVersion: string };

export function validateSensitivityFactors(factors: SensitivityFactors): { ok: true } | { ok: false; message: string } {
  for (const key of sensitivityCaseKeys) {
    const factor = factors[key];
    if (!Number.isFinite(factor) || factor < 0 || factor > 2) return { ok: false, message: "Sensitivity factors must be finite percentages from 0% to 200%." };
  }
  if (!(factors.LOWER_REALIZATION <= factors.BASE_REALIZATION && factors.BASE_REALIZATION <= factors.HIGHER_REALIZATION)) return { ok: false, message: "Sensitivity factors must be ordered lower <= base <= higher." };
  return { ok: true };
}

function scenarioCase(key: ScenarioCaseKey, factor: number, summary: CalculatedAnalysis["summary"], investment: AnalysisInvestment): ScenarioCase {
  const total = summary.totalIdentifiedAnnualEconomicOpportunity * factor;
  return { key, label: sensitivityCaseLabels[key], description: sensitivityCaseDescriptions[key], factor, monthlyRecurringValue: summary.monthlyRecurringValueTotal * factor, annualRecurringValue: summary.annualRecurringValueTotal * factor, annualOnlyValue: summary.annualOnlyValueTotal * factor, informationalCapitalValue: summary.informationalCapitalValueTotal, totalIdentifiedAnnualEconomicOpportunity: total, roi: deriveRoiForAnnualValue(investment, total) };
}

export function buildScenarioComparison(calculated: CalculatedAnalysis, factors: SensitivityFactors = DEFAULT_SENSITIVITY_FACTORS): ScenarioComparison {
  const valid = validateSensitivityFactors(factors);
  const safeFactors = valid.ok ? factors : DEFAULT_SENSITIVITY_FACTORS;
  const cases = sensitivityCaseKeys.map((key) => scenarioCase(key, safeFactors[key], calculated.summary, calculated.investment));
  return { cases, hasRoi: cases.some((scenario) => scenario.roi !== null), disclaimer: SENSITIVITY_DISCLAIMER, registryVersion: SENSITIVITY_REGISTRY_VERSION };
}
