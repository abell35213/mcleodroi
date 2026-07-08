import { getValueModule } from "@/lib/modules";
import type { ValueModuleKey } from "@/lib/modules";
import { validateInputsForModule } from "../validate";
import type { CalculationOutcome, CalculationResult, FinancialOutputs, ValidationIssue } from "../types";

export function monthlyOutputs(monthlyRecurringValue: number): FinancialOutputs {
  return { monthlyRecurringValue, annualRecurringValue: monthlyRecurringValue * 12 };
}

export function result<TKey extends ValueModuleKey, TMetrics extends object>(moduleKey: TKey, financialOutputs: FinancialOutputs, derivedMetrics: TMetrics): CalculationResult<TKey, TMetrics> {
  return { moduleKey, valueType: getValueModule(moduleKey).valueType, financialOutputs, derivedMetrics };
}

export function validOrIssues<TKey extends ValueModuleKey, TInputs extends Record<string, number>, TResult>(moduleKey: TKey, inputs: TInputs, crossIssues: ValidationIssue[], calculate: () => TResult): CalculationOutcome<TResult> {
  const issues = [...validateInputsForModule(moduleKey, inputs), ...crossIssues];
  return issues.length > 0 ? { success: false, issues } : { success: true, result: calculate() };
}
