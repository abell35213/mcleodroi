import type { BenchmarkSource, InputBenchmark, ValueModuleKey } from "./types";

export const BENCHMARK_PLANNING_DISCLAIMER = "Benchmarks are planning references and should be validated against the customer’s operating data.";

export const benchmarkSources = {
  ATRI_PLANNING: { sourceType: "DIRECTIONAL_PLANNING", approvalStatus: "PLANNING_ONLY", label: "Directional planning range", citation: "Planning reference; validate against the customer’s operating data.", applicabilityNote: "Previously aligned to public trucking-cost references, but lacks precise publication/table metadata for a verified public benchmark." },
  ATA_PLANNING: { sourceType: "DIRECTIONAL_PLANNING", approvalStatus: "PLANNING_ONLY", label: "Directional planning range", citation: "Planning reference; validate against the customer’s operating data.", applicabilityNote: "Previously aligned to public turnover reporting, but lacks precise publication/statistic metadata for a verified public benchmark." },
  EIA_PLANNING: { sourceType: "DIRECTIONAL_PLANNING", approvalStatus: "PLANNING_ONLY", label: "Directional planning range", citation: "Planning reference; validate against the customer’s operating data.", applicabilityNote: "Previously aligned to public fuel-price series, but lacks exact series/date metadata for a verified public benchmark." },
  BLS_PLANNING: { sourceType: "DIRECTIONAL_PLANNING", approvalStatus: "PLANNING_ONLY", label: "Directional planning range", citation: "Planning reference; validate against the customer’s operating data.", applicabilityNote: "Previously aligned to labor-rate references, but lacks exact occupation/geography/table metadata for a verified public benchmark." },
  WORKBOOK: { sourceType: "MCLEOD_INTERNAL", approvalStatus: "APPROVED", label: "McLeod planning reference", citation: "McLeod internal planning assumption.", owner: "McLeod ROI methodology owner", effectiveDate: "2026-07-11", reviewDate: "2027-07-11", internalRationale: "Internal methodology workbook planning range; confidential rationale is not exported." },
} as const satisfies Record<string, BenchmarkSource>;

type BenchmarkSpec = { typicalMin: number; typicalMax: number; source: keyof typeof benchmarkSources; version?: string };

const moduleInputBenchmarkSpecs: Partial<Record<ValueModuleKey, Record<string, BenchmarkSpec>>> = {
  INCREASE_UTILIZATION: { utilization_improvement_pct: { typicalMin: 0.03, typicalMax: 0.08, source: "WORKBOOK" }, incremental_margin_pct: { typicalMin: 0.1, typicalMax: 0.2, source: "WORKBOOK" } },
  REDUCE_DEADHEAD: { current_deadhead_pct: { typicalMin: 0.1, typicalMax: 0.25, source: "ATRI_PLANNING" }, target_deadhead_pct: { typicalMin: 0.08, typicalMax: 0.15, source: "WORKBOOK" }, variable_cost_per_mile: { typicalMin: 0.6, typicalMax: 1.0, source: "ATRI_PLANNING" } },
  REDUCE_OUT_OF_ROUTE: { current_oor_pct: { typicalMin: 0.03, typicalMax: 0.08, source: "WORKBOOK" }, average_mpg: { typicalMin: 6.5, typicalMax: 8.0, source: "ATRI_PLANNING" }, fuel_cost_per_gallon: { typicalMin: 3.5, typicalMax: 4.5, source: "EIA_PLANNING" } },
  DRIVER_TURNOVER: { current_annual_turnover_pct: { typicalMin: 0.5, typicalMax: 0.9, source: "ATA_PLANNING" }, recruiting_cost_per_driver: { typicalMin: 5000, typicalMax: 12000, source: "WORKBOOK" } },
  STREAMLINE_BACK_OFFICE: { hourly_labor_rate: { typicalMin: 22, typicalMax: 38, source: "BLS_PLANNING" }, redundant_activity_pct: { typicalMin: 0.1, typicalMax: 0.25, source: "WORKBOOK" } },
  OPERATIONS_EFFICIENCY: { hourly_labor_rate: { typicalMin: 22, typicalMax: 40, source: "BLS_PLANNING" }, redundant_activity_pct: { typicalMin: 0.1, typicalMax: 0.25, source: "WORKBOOK" } },
  PROFIT_MARGIN_INCREASE: { current_margin_pct: { typicalMin: 0.12, typicalMax: 0.2, source: "WORKBOOK" } },
  BROKER_PRODUCTIVITY: { average_margin_per_load: { typicalMin: 200, typicalMax: 450, source: "WORKBOOK" } },
};

export function publicVerifiedMetadataComplete(source: BenchmarkSource): boolean {
  return source.sourceType !== "PUBLIC_VERIFIED" || Boolean(source.citation && source.applicabilityNote && source.effectiveDate && source.reviewDate);
}

const moduleInputBenchmarks: Partial<Record<ValueModuleKey, Record<string, InputBenchmark>>> = Object.fromEntries(Object.entries(moduleInputBenchmarkSpecs).map(([moduleKey, specs]) => [moduleKey, Object.fromEntries(Object.entries(specs).map(([inputKey, spec]) => [inputKey, { key: `${moduleKey}.${inputKey}`, version: spec.version ?? "2026-07-11", typicalMin: spec.typicalMin, typicalMax: spec.typicalMax, source: benchmarkSources[spec.source] }]))]));

export function getInputBenchmark(moduleKey: ValueModuleKey, inputKey: string): InputBenchmark | undefined { return moduleInputBenchmarks[moduleKey]?.[inputKey]; }
export function moduleHasBenchmarks(moduleKey: ValueModuleKey): boolean { return moduleInputBenchmarks[moduleKey] !== undefined; }
export function assertBenchmarkCanBeApplied(benchmark: InputBenchmark): void { if (benchmark.source.approvalStatus === "RETIRED") throw new Error("Retired benchmarks cannot be applied to new analyses."); }
