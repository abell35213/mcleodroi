import { describe, expect, it } from "vitest";
import { calculateValueModule, validateNumericField } from "@/lib/calculations";
import { getValueModule } from "@/lib/modules";
import type { ValueModuleInputDefinition } from "@/lib/modules";

const baseWorkingDaysModule = "STREAMLINE_BACK_OFFICE" as const;
const validInputs = { non_ops_staff_count: 4, hourly_labor_rate: 30, working_days_month: 21, redundant_activity_pct: 0.1 };

function workingDaysDefinition(): ValueModuleInputDefinition {
  const definition = getValueModule(baseWorkingDaysModule).inputDefinitions.find((entry) => entry.key === "working_days_month");
  if (!definition) throw new Error("expected working_days_month definition");
  return definition;
}

describe("registry-declared input bounds", () => {
  it("declares a calendar bound for working days per month", () => {
    const definition = workingDaysDefinition();
    expect(definition.min).toBe(1);
    expect(definition.max).toBe(31);
  });

  it("accepts an in-range value", () => {
    expect(calculateValueModule(baseWorkingDaysModule, validInputs).success).toBe(true);
  });

  it("rejects a value above the declared maximum with a clear message", () => {
    const outcome = calculateValueModule(baseWorkingDaysModule, { ...validInputs, working_days_month: 40 });
    expect(outcome.success).toBe(false);
    if (outcome.success) throw new Error("expected failure");
    const issue = outcome.issues.find((entry) => entry.field === "working_days_month" && entry.code === "ABOVE_MAXIMUM");
    expect(issue?.message).toBe("Working days per month must be no more than 31.");
  });

  it("rejects a value below the declared minimum with a clear message", () => {
    const issues = validateNumericField({ key: "sample", label: "Sample", type: "NUMBER", unit: "NONE", required: true, helpText: "", displayOrder: 1, min: 5 }, 2);
    const issue = issues.find((entry) => entry.code === "BELOW_MINIMUM");
    expect(issue?.message).toBe("Sample must be at least 5.");
  });

  it("does not add bound issues when no bounds are declared", () => {
    const issues = validateNumericField({ key: "sample", label: "Sample", type: "NUMBER", unit: "NONE", required: true, helpText: "", displayOrder: 1 }, 1_000_000);
    expect(issues).toHaveLength(0);
  });
});
