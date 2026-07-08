import { getValueModule } from "@/lib/modules";
import type { ValueModuleInputDefinition, ValueModuleKey } from "@/lib/modules";
import { validationCodes } from "./errors";
import type { ValidationIssue } from "./types";

type NumericInputRecord = Record<string, number>;

function label(field: string): string {
  return field.replaceAll("_", " ");
}

export function validateInputsForModule(moduleKey: ValueModuleKey, inputs: NumericInputRecord): ValidationIssue[] {
  return getValueModule(moduleKey).inputDefinitions.flatMap((definition) => validateNumericField(definition, inputs[definition.key]));
}

export function validateNumericField(definition: ValueModuleInputDefinition, value: number): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return [{ code: validationCodes.REQUIRED_FINITE_NUMBER, field: definition.key, message: `${definition.label} must be a valid number.` }];
  }
  if (definition.type === "INTEGER" && !Number.isInteger(value)) {
    issues.push({ code: validationCodes.INTEGER_REQUIRED, field: definition.key, message: `${definition.label} must be a whole number.` });
  }
  if (definition.type === "PERCENTAGE" && (value < 0 || value > 1)) {
    issues.push({ code: validationCodes.PERCENTAGE_OUT_OF_RANGE, field: definition.key, message: `${definition.label} must be between 0 and 1. Enter 2% as 0.02.` });
  } else if (value < 0) {
    issues.push({ code: validationCodes.NON_NEGATIVE_REQUIRED, field: definition.key, message: `${definition.label} cannot be negative.` });
  }
  return issues;
}

export function positive(value: number, field: string): ValidationIssue[] {
  return value > 0 ? [] : [{ code: validationCodes.POSITIVE_REQUIRED, field, message: `${label(field)} must be greater than zero.` }];
}

export function targetLower(target: number, current: number, targetField: string, message: string): ValidationIssue[] {
  return target < current ? [] : [{ code: validationCodes.TARGET_MUST_BE_LOWER, field: targetField, message }];
}

export function targetHigher(target: number, current: number, targetField: string, message: string): ValidationIssue[] {
  return target > current ? [] : [{ code: validationCodes.TARGET_MUST_BE_HIGHER, field: targetField, message }];
}

export function valueNotMoreThanCurrent(value: number, current: number, field: string, message: string): ValidationIssue[] {
  return value <= current ? [] : [{ code: validationCodes.VALUE_EXCEEDS_CURRENT, field, message }];
}
