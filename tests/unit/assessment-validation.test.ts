import { describe, expect, it } from "vitest";
import { validateDisplayInput } from "@/lib/analyses/ui";
import type { ValueModuleInputDefinition } from "@/lib/modules";

const number: ValueModuleInputDefinition = { key: "n", label: "Miles", type: "NUMBER", unit: "MILES", required: true, helpText: "", displayOrder: 1 };
const integer: ValueModuleInputDefinition = { key: "i", label: "Trucks", type: "INTEGER", unit: "COUNT", required: true, helpText: "", displayOrder: 1 };
const percent: ValueModuleInputDefinition = { key: "p", label: "Deadhead", type: "PERCENTAGE", unit: "PERCENT", required: true, helpText: "", displayOrder: 1 };
const bounded: ValueModuleInputDefinition = { key: "b", label: "Working days", type: "INTEGER", unit: "WORKING_DAYS_PER_MONTH", required: true, helpText: "", displayOrder: 1, min: 1, max: 31 };

describe("validateDisplayInput", () => {
  it("treats empty input as permitted (clears on save)", () => {
    expect(validateDisplayInput(number, "")).toEqual({ state: "empty" });
    expect(validateDisplayInput(number, "   ")).toEqual({ state: "empty" });
  });

  it("accepts valid finite numbers", () => {
    expect(validateDisplayInput(number, "12000").state).toBe("valid");
    expect(validateDisplayInput(percent, "17").state).toBe("valid");
  });

  it("rejects non-numeric input", () => {
    const result = validateDisplayInput(number, "abc");
    expect(result.state).toBe("error");
    expect(result.message).toContain("valid number");
  });

  it("requires whole numbers for integer inputs", () => {
    expect(validateDisplayInput(integer, "3.5").state).toBe("error");
    expect(validateDisplayInput(integer, "3").state).toBe("valid");
  });

  it("validates percentages in display units against the engine 0-1 range", () => {
    expect(validateDisplayInput(percent, "0").state).toBe("valid");
    expect(validateDisplayInput(percent, "100").state).toBe("valid");
    expect(validateDisplayInput(percent, "150").state).toBe("error");
    expect(validateDisplayInput(percent, "-1").state).toBe("error");
  });

  it("flags negative non-percentage values", () => {
    const result = validateDisplayInput(number, "-5");
    expect(result.state).toBe("error");
    expect(result.message).toContain("cannot be negative");
  });

  it("enforces declared min/max bounds", () => {
    expect(validateDisplayInput(bounded, "0").state).toBe("error");
    expect(validateDisplayInput(bounded, "32").state).toBe("error");
    expect(validateDisplayInput(bounded, "22").state).toBe("valid");
  });
});
