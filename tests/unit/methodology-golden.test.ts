import { describe, expect, it } from "vitest";
import { calculateValueModule } from "@/lib/calculations";
import { valueModuleKeys } from "@/lib/modules";
import { methodologyGoldenCases } from "@/scripts/fixtures/methodology-golden";

describe("methodology golden-master fixtures", () => {
  it("covers every one of the 21 canonical value modules exactly once", () => {
    const covered = methodologyGoldenCases.map((goldenCase) => goldenCase.moduleKey).sort();
    expect(covered).toEqual([...valueModuleKeys].sort());
    expect(new Set(covered).size).toBe(valueModuleKeys.length);
  });

  for (const goldenCase of methodologyGoldenCases) {
    it(`produces the pinned worked-example output for ${goldenCase.moduleKey}`, () => {
      const outcome = calculateValueModule(goldenCase.moduleKey, goldenCase.inputs);
      expect(outcome.success).toBe(true);
      if (!outcome.success) throw new Error(`expected ${goldenCase.moduleKey} to calculate successfully`);

      expect(outcome.result.valueType).toBe(goldenCase.expected.valueType);

      const outputs = outcome.result.financialOutputs;
      const expectedOutputs = goldenCase.expected.financialOutputs;
      const outputKeys = ["monthlyRecurringValue", "annualRecurringValue", "annualOnlyValue", "informationalCapitalValue"] as const;
      for (const key of outputKeys) {
        if (expectedOutputs[key] === undefined) {
          expect(outputs[key]).toBeUndefined();
        } else {
          expect(outputs[key]).toBeCloseTo(expectedOutputs[key], 6);
        }
      }

      const derived = outcome.result.derivedMetrics as Readonly<Record<string, number>>;
      expect(Object.keys(derived).sort()).toEqual(Object.keys(goldenCase.expected.derivedMetrics).sort());
      for (const [key, expectedValue] of Object.entries(goldenCase.expected.derivedMetrics)) {
        expect(derived[key]).toBeCloseTo(expectedValue, 6);
      }
    });
  }
});
