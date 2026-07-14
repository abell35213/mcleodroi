import { createHash } from "node:crypto";
import type { CategoryKey, ValueType } from "@/lib/modules";
import { categoryKeys, valueTypes } from "@/lib/modules";

export const CUSTOM_OPPORTUNITY_SCHEMA_VERSION = "custom-opportunity-v1";
export const CUSTOM_OPPORTUNITY_OVERLAP_GROUP_KEY = "CUSTOM_OPPORTUNITY_ECONOMIC_OVERLAP";
export const CUSTOM_OPPORTUNITY_OVERLAP_MESSAGE = "Custom opportunities may overlap with standard opportunity values. Confirm that the entered value does not duplicate benefits already included elsewhere in the analysis.";
export const customOpportunityFrequencies = ["MONTHLY_RECURRING", "ANNUAL_ONLY", "INFORMATIONAL_CAPITAL"] as const;
export type CustomOpportunityFrequency = (typeof customOpportunityFrequencies)[number];
export const customOpportunityStatuses = ["DRAFT", "COMPLETE", "NEEDS_REVISION", "RETIRED"] as const;
export type CustomOpportunityStatus = (typeof customOpportunityStatuses)[number];
export type NarrativeCompletionStatus = "Narrative Not Added" | "Narrative Partially Added" | "Narrative Complete";

export type CustomOpportunityAssumptionInput = { id?: string; label: string; displayValue: string; numericValue?: number | null; unit?: string | null; sourceNote?: string | null; displayOrder?: number };
export type CustomOpportunityInput = {
  title: string; shortTitle?: string | null; categoryKey: string; valueClassification: string; valueFrequency: string; enteredValue: string | number; calculationRationale: string;
  assumptions: readonly CustomOpportunityAssumptionInput[]; howMcLeodHelps?: string | null; customerBusinessImpact?: string | null; presentationCallout?: string | null; methodologyNote?: string | null; sourceNote?: string | null; displayOrder?: number;
};
export type ValidatedCustomOpportunity = Omit<CustomOpportunityInput, "enteredValue" | "assumptions"> & { categoryKey: CategoryKey; valueClassification: ValueType; valueFrequency: CustomOpportunityFrequency; enteredValue: number; assumptions: CustomOpportunityAssumptionInput[]; monthlyRecurringValue: number | null; annualRecurringValue: number | null; annualOnlyValue: number | null; informationalCapitalValue: number | null; status: CustomOpportunityStatus; sourceFingerprint: string };

const textMax: Record<string, number> = { title: 120, shortTitle: 60, calculationRationale: 1200, howMcLeodHelps: 1800, customerBusinessImpact: 1800, presentationCallout: 160, methodologyNote: 800, sourceNote: 800, label: 100, displayValue: 120, unit: 40, sourceNoteAssumption: 300 };
function clean(value: string | null | undefined, max: number): string { return (value ?? "").trim().replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").slice(0, max); }
function optional(value: string | null | undefined, max: number): string | null { const trimmed = clean(value, max); return trimmed ? trimmed : null; }
function parseAmount(value: string | number): number | null { if (typeof value === "number") return Number.isFinite(value) ? value : null; const trimmed = value.trim(); if (!/^-?\d+(\.\d{1,6})?$/.test(trimmed)) return null; const parsed = Number(trimmed); return Number.isFinite(parsed) ? parsed : null; }
export function isCustomOpportunityFrequency(value: string): value is CustomOpportunityFrequency { return (customOpportunityFrequencies as readonly string[]).includes(value); }
export function validateCustomOpportunityCompatibility(valueClassification: ValueType, valueFrequency: CustomOpportunityFrequency): string | null {
  if ((valueClassification as string) === "CAPITAL_AVOIDANCE") return valueFrequency === "INFORMATIONAL_CAPITAL" ? null : "Informational Capital must use informational capital frequency.";
  if (valueFrequency === "INFORMATIONAL_CAPITAL") return (valueClassification as string) === "CAPITAL_AVOIDANCE" ? null : "Only Informational Capital may use informational capital frequency.";
  if (valueClassification === "COST_AVOIDANCE") return valueFrequency === "ANNUAL_ONLY" ? null : "Annual-Only Value must use annual-only frequency.";
  return null;
}
export function deriveCustomValues(valueFrequency: CustomOpportunityFrequency, enteredValue: number) { return { monthlyRecurringValue: valueFrequency === "MONTHLY_RECURRING" ? enteredValue : null, annualRecurringValue: valueFrequency === "MONTHLY_RECURRING" ? enteredValue * 12 : null, annualOnlyValue: valueFrequency === "ANNUAL_ONLY" ? enteredValue : null, informationalCapitalValue: valueFrequency === "INFORMATIONAL_CAPITAL" ? enteredValue : null }; }
export function customOpportunityNarrativeStatus(input: { howMcLeodHelps?: string | null; customerBusinessImpact?: string | null }): NarrativeCompletionStatus { const a = !!input.howMcLeodHelps?.trim(); const b = !!input.customerBusinessImpact?.trim(); return a && b ? "Narrative Complete" : a || b ? "Narrative Partially Added" : "Narrative Not Added"; }
export function fingerprintCustomOpportunity(input: Omit<ValidatedCustomOpportunity, "sourceFingerprint" | "status">): string {
  const stable = { schema: CUSTOM_OPPORTUNITY_SCHEMA_VERSION, title: input.title, shortTitle: input.shortTitle ?? null, categoryKey: input.categoryKey, valueClassification: input.valueClassification, valueFrequency: input.valueFrequency, enteredValue: input.enteredValue, monthlyRecurringValue: input.monthlyRecurringValue, annualRecurringValue: input.annualRecurringValue, annualOnlyValue: input.annualOnlyValue, informationalCapitalValue: input.informationalCapitalValue, calculationRationale: input.calculationRationale, howMcLeodHelps: input.howMcLeodHelps ?? null, customerBusinessImpact: input.customerBusinessImpact ?? null, presentationCallout: input.presentationCallout ?? null, methodologyNote: input.methodologyNote ?? null, sourceNote: input.sourceNote ?? null, displayOrder: input.displayOrder ?? 0, assumptions: input.assumptions.map((a, index) => ({ label: a.label, displayValue: a.displayValue, numericValue: a.numericValue ?? null, unit: a.unit ?? null, sourceNote: a.sourceNote ?? null, displayOrder: a.displayOrder ?? index })) };
  return createHash("sha256").update(JSON.stringify(stable)).digest("hex");
}
export function validateCustomOpportunityInput(input: CustomOpportunityInput): { ok: true; value: ValidatedCustomOpportunity } | { ok: false; issues: { field: string; message: string }[] } {
  const issues: { field: string; message: string }[] = [];
  const title = clean(input.title, textMax.title); if (!title) issues.push({ field: "title", message: "Opportunity title is required." });
  const categoryKey = input.categoryKey as CategoryKey; if (!categoryKeys.includes(categoryKey)) issues.push({ field: "categoryKey", message: "Category is required." });
  const valueClassification = input.valueClassification as ValueType; if (!valueTypes.includes(valueClassification)) issues.push({ field: "valueClassification", message: "Value classification is required." });
  const valueFrequency = input.valueFrequency; if (!isCustomOpportunityFrequency(valueFrequency)) issues.push({ field: "valueFrequency", message: "Value frequency is required." });
  const enteredValue = parseAmount(input.enteredValue); if (enteredValue === null) issues.push({ field: "enteredValue", message: "Enter a finite financial amount using digits and an optional decimal." });
  const calculationRationale = clean(input.calculationRationale, textMax.calculationRationale); if (!calculationRationale) issues.push({ field: "calculationRationale", message: "Calculation rationale is required." });
  const assumptions = input.assumptions.slice(0, 8).map((a, index) => ({ id: a.id, label: clean(a.label, textMax.label), displayValue: clean(a.displayValue, textMax.displayValue), numericValue: a.numericValue ?? null, unit: optional(a.unit, textMax.unit), sourceNote: optional(a.sourceNote, textMax.sourceNoteAssumption), displayOrder: a.displayOrder ?? index })).filter((a) => a.label || a.displayValue);
  if (!assumptions.some((a) => a.label && a.displayValue)) issues.push({ field: "assumptions", message: "At least one assumption with a label and value is required." });
  if (valueTypes.includes(valueClassification) && isCustomOpportunityFrequency(valueFrequency)) { const compatibility = validateCustomOpportunityCompatibility(valueClassification, valueFrequency); if (compatibility) issues.push({ field: "valueFrequency", message: compatibility }); }
  if (issues.length || enteredValue === null || !categoryKeys.includes(categoryKey) || !valueTypes.includes(valueClassification) || !isCustomOpportunityFrequency(valueFrequency)) return { ok: false, issues };
  const values = deriveCustomValues(valueFrequency, enteredValue);
  const base = { ...input, title, shortTitle: optional(input.shortTitle, textMax.shortTitle), categoryKey, valueClassification, valueFrequency, enteredValue, calculationRationale, assumptions, howMcLeodHelps: optional(input.howMcLeodHelps, textMax.howMcLeodHelps), customerBusinessImpact: optional(input.customerBusinessImpact, textMax.customerBusinessImpact), presentationCallout: optional(input.presentationCallout, textMax.presentationCallout), methodologyNote: optional(input.methodologyNote, textMax.methodologyNote), sourceNote: optional(input.sourceNote, textMax.sourceNote), displayOrder: input.displayOrder ?? 0, ...values };
  return { ok: true, value: { ...base, status: "COMPLETE", sourceFingerprint: fingerprintCustomOpportunity(base) } };
}
