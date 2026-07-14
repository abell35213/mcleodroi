import { describe, expect, it } from "vitest";
import { deriveCustomValues, fingerprintCustomOpportunity, validateCustomOpportunityCompatibility, validateCustomOpportunityInput } from "@/lib/custom-opportunities";

describe("custom opportunities", () => {
  const base = { title: "  Yard wait reduction  ", categoryKey: "TL_TRUCKING_OPERATIONS", valueClassification: "COST_REDUCTION", valueFrequency: "MONTHLY_RECURRING", enteredValue: "1250.50", calculationRationale: "50 hours × $25.01", assumptions: [{ label: "Hours saved", displayValue: "50", unit: "hours" }] };

  it("validates required financial fields while keeping narratives optional", () => {
    const valid = validateCustomOpportunityInput(base);
    expect(valid.ok).toBe(true);
    if (valid.ok) {
      expect(valid.value.title).toBe("Yard wait reduction");
      expect(valid.value.status).toBe("COMPLETE");
      expect(valid.value.howMcLeodHelps).toBeNull();
      expect(valid.value.monthlyRecurringValue).toBe(1250.5);
      expect(valid.value.annualRecurringValue).toBe(15006);
    }
    expect(validateCustomOpportunityInput({ ...base, title: "" }).ok).toBe(false);
    expect(validateCustomOpportunityInput({ ...base, categoryKey: "" }).ok).toBe(false);
    expect(validateCustomOpportunityInput({ ...base, valueClassification: "" }).ok).toBe(false);
    expect(validateCustomOpportunityInput({ ...base, valueFrequency: "" }).ok).toBe(false);
    expect(validateCustomOpportunityInput({ ...base, enteredValue: "Infinity" }).ok).toBe(false);
    expect(validateCustomOpportunityInput({ ...base, assumptions: [] }).ok).toBe(false);
    expect(validateCustomOpportunityInput({ ...base, calculationRationale: "" }).ok).toBe(false);
  });

  it("maps direct values by frequency without clamping negative values", () => {
    expect(deriveCustomValues("MONTHLY_RECURRING", -10)).toEqual({ monthlyRecurringValue: -10, annualRecurringValue: -120, annualOnlyValue: null, informationalCapitalValue: null });
    expect(deriveCustomValues("ANNUAL_ONLY", 99)).toEqual({ monthlyRecurringValue: null, annualRecurringValue: null, annualOnlyValue: 99, informationalCapitalValue: null });
    expect(deriveCustomValues("INFORMATIONAL_CAPITAL", 500)).toEqual({ monthlyRecurringValue: null, annualRecurringValue: null, annualOnlyValue: null, informationalCapitalValue: 500 });
  });

  it("centralizes compatibility and fingerprinting", () => {
    expect(validateCustomOpportunityCompatibility("COST_AVOIDANCE", "MONTHLY_RECURRING")).toContain("Annual-Only");
    const valid = validateCustomOpportunityInput(base);
    expect(valid.ok).toBe(true);
    if (!valid.ok) return;
    const first = fingerprintCustomOpportunity(valid.value);
    const second = fingerprintCustomOpportunity({ ...valid.value, enteredValue: 1251 });
    expect(first).not.toBe(second);
  });
});
