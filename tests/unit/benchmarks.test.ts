import { describe, expect, it } from "vitest";
import { benchmarkSources, getAllValueModules, getInputBenchmark, getValueModule, moduleHasBenchmarks, valueModuleKeys } from "@/lib/modules";
import { formatBenchmarkRange } from "@/lib/analyses/ui";
import type { ValueModuleKey } from "@/lib/modules";

describe("input benchmarks", () => {
  it("exposes benchmarks through the registry input definitions", () => {
    const deadhead = getValueModule("REDUCE_DEADHEAD");
    const currentDeadhead = deadhead.inputDefinitions.find((input) => input.key === "current_deadhead_pct");
    expect(currentDeadhead?.benchmark).toBeDefined();
    expect(currentDeadhead?.benchmark?.source.label).toBe("ATRI");
    expect(currentDeadhead?.benchmark?.typicalMin).toBeLessThan(currentDeadhead!.benchmark!.typicalMax);
    expect(getInputBenchmark("REDUCE_DEADHEAD", "current_deadhead_pct")).toEqual(currentDeadhead?.benchmark);
  });

  it("leaves inputs without a benchmark untouched", () => {
    const deadhead = getValueModule("REDUCE_DEADHEAD");
    const monthlyMiles = deadhead.inputDefinitions.find((input) => input.key === "monthly_miles");
    expect(monthlyMiles?.benchmark).toBeUndefined();
    expect(getInputBenchmark("REDUCE_DEADHEAD", "monthly_miles")).toBeUndefined();
    expect(moduleHasBenchmarks("DRIVER_DETENTION")).toBe(false);
  });

  it("keeps every benchmark valid: known input, ordered range, within declared bounds, non-empty citation", () => {
    const allKeys = new Set<ValueModuleKey>(valueModuleKeys);
    for (const definition of getAllValueModules()) {
      expect(allKeys.has(definition.key)).toBe(true);
      for (const input of definition.inputDefinitions) {
        if (!input.benchmark) continue;
        const { typicalMin, typicalMax, source } = input.benchmark;
        expect(typicalMin).toBeLessThanOrEqual(typicalMax);
        if (input.type === "PERCENTAGE") {
          expect(typicalMin).toBeGreaterThanOrEqual(0);
          expect(typicalMax).toBeLessThanOrEqual(1);
        }
        if (input.min !== undefined) expect(typicalMin).toBeGreaterThanOrEqual(input.min);
        if (input.max !== undefined) expect(typicalMax).toBeLessThanOrEqual(input.max);
        expect(source.label.length).toBeGreaterThan(0);
        expect(source.citation.length).toBeGreaterThan(0);
        expect(Object.values(benchmarkSources)).toContainEqual(source);
      }
    }
  });

  it("formats benchmark ranges with the input's unit convention", () => {
    const deadhead = getValueModule("REDUCE_DEADHEAD");
    const percent = deadhead.inputDefinitions.find((input) => input.key === "current_deadhead_pct")!;
    const currency = deadhead.inputDefinitions.find((input) => input.key === "variable_cost_per_mile")!;
    expect(formatBenchmarkRange(percent, percent.benchmark!)).toBe("10%–25%");
    expect(formatBenchmarkRange(currency, currency.benchmark!)).toBe("$0.6–$1");
  });
});
