import type { BenchmarkSource, InputBenchmark, ValueModuleKey } from "./types";

/**
 * Named benchmark sources. The `label` is a compact tag shown next to inputs and
 * in appendix rows; the `citation` is the full attribution shown in tooltips and
 * the assumptions/sources legend. Ranges attributed to a public source are
 * directional planning figures aligned with that source, not verbatim quotes.
 */
export const benchmarkSources = {
  ATRI: { label: "ATRI", citation: "American Transportation Research Institute — An Analysis of the Operational Costs of Trucking (industry operating-cost benchmarks)." },
  ATA: { label: "ATA", citation: "American Trucking Associations — large truckload carrier driver-turnover reporting." },
  EIA: { label: "EIA", citation: "U.S. Energy Information Administration — On-Highway Diesel Fuel Prices." },
  BLS: { label: "BLS", citation: "U.S. Bureau of Labor Statistics — Occupational Employment and Wage Statistics (loaded labor rates)." },
  WORKBOOK: { label: "McLeod", citation: "McLeod ROI methodology workbook (docs/methodology) — internal planning benchmark." },
} as const satisfies Record<string, BenchmarkSource>;

type BenchmarkSpec = { typicalMin: number; typicalMax: number; source: keyof typeof benchmarkSources };

/**
 * Industry-typical ranges per module input, keyed by module and input key. Values
 * use the engine convention (percentages as decimals, currency in dollars). Only a
 * defensible subset of inputs carry benchmarks; inputs without an entry simply have
 * no benchmark and render exactly as before.
 */
const moduleInputBenchmarkSpecs: Partial<Record<ValueModuleKey, Record<string, BenchmarkSpec>>> = {
  INCREASE_UTILIZATION: {
    utilization_improvement_pct: { typicalMin: 0.03, typicalMax: 0.08, source: "WORKBOOK" },
    incremental_margin_pct: { typicalMin: 0.1, typicalMax: 0.2, source: "WORKBOOK" },
  },
  REDUCE_DEADHEAD: {
    current_deadhead_pct: { typicalMin: 0.1, typicalMax: 0.25, source: "ATRI" },
    target_deadhead_pct: { typicalMin: 0.08, typicalMax: 0.15, source: "WORKBOOK" },
    variable_cost_per_mile: { typicalMin: 0.6, typicalMax: 1.0, source: "ATRI" },
  },
  REDUCE_OUT_OF_ROUTE: {
    current_oor_pct: { typicalMin: 0.03, typicalMax: 0.08, source: "WORKBOOK" },
    average_mpg: { typicalMin: 6.5, typicalMax: 8.0, source: "ATRI" },
    fuel_cost_per_gallon: { typicalMin: 3.5, typicalMax: 4.5, source: "EIA" },
  },
  DRIVER_TURNOVER: {
    current_annual_turnover_pct: { typicalMin: 0.5, typicalMax: 0.9, source: "ATA" },
    recruiting_cost_per_driver: { typicalMin: 5000, typicalMax: 12000, source: "WORKBOOK" },
  },
  STREAMLINE_BACK_OFFICE: {
    hourly_labor_rate: { typicalMin: 22, typicalMax: 38, source: "BLS" },
    redundant_activity_pct: { typicalMin: 0.1, typicalMax: 0.25, source: "WORKBOOK" },
  },
  OPERATIONS_EFFICIENCY: {
    hourly_labor_rate: { typicalMin: 22, typicalMax: 40, source: "BLS" },
    redundant_activity_pct: { typicalMin: 0.1, typicalMax: 0.25, source: "WORKBOOK" },
  },
  PROFIT_MARGIN_INCREASE: {
    current_margin_pct: { typicalMin: 0.12, typicalMax: 0.2, source: "WORKBOOK" },
  },
  BROKER_PRODUCTIVITY: {
    average_margin_per_load: { typicalMin: 200, typicalMax: 450, source: "WORKBOOK" },
  },
};

const moduleInputBenchmarks: Partial<Record<ValueModuleKey, Record<string, InputBenchmark>>> = Object.fromEntries(
  Object.entries(moduleInputBenchmarkSpecs).map(([moduleKey, specs]) => [
    moduleKey,
    Object.fromEntries(
      Object.entries(specs).map(([inputKey, spec]) => [inputKey, { typicalMin: spec.typicalMin, typicalMax: spec.typicalMax, source: benchmarkSources[spec.source] }]),
    ),
  ]),
);

/** Returns the benchmark for a given module input, or undefined when none is defined. */
export function getInputBenchmark(moduleKey: ValueModuleKey, inputKey: string): InputBenchmark | undefined {
  return moduleInputBenchmarks[moduleKey]?.[inputKey];
}

/** Returns true when any input in the module carries a benchmark. */
export function moduleHasBenchmarks(moduleKey: ValueModuleKey): boolean {
  return moduleInputBenchmarks[moduleKey] !== undefined;
}
