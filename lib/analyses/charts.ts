import type { CalculatedAnalysis } from "@/lib/analyses/types";
import {
  getCategoryByKey,
  getValueModule,
  valueTypes,
  type CategoryKey,
  type ValueType,
} from "@/lib/modules";

/**
 * Pure, deterministic chart-data builders for the Review value story.
 *
 * These transform an already-calculated analysis into plain numeric datasets
 * for rendering. They never mutate or re-run the calculation engine, so the
 * charts and the headline figures always agree. Layout (pixels, scales) is left
 * to the presentation components; these builders only shape the data.
 */

/** A single module's contribution to the annual identified economic opportunity. */
export type WaterfallStep = {
  readonly analysisModuleId: string;
  readonly moduleKey: string;
  readonly label: string;
  /** Annual economic opportunity contributed by this module; negative values reduce the total. */
  readonly value: number;
  /** Running total before this step is added. */
  readonly start: number;
  /** Running total after this step is added (`start + value`). */
  readonly end: number;
};

export type WaterfallData = {
  readonly steps: readonly WaterfallStep[];
  /** Cumulative total across every step (the annual identified opportunity). */
  readonly total: number;
};

/**
 * Per-module annual economic opportunity contribution.
 *
 * Mirrors the summary aggregation in the calculation service: a module's annual
 * economic opportunity is its recurring annual value plus any annual-only value.
 */
function moduleAnnualEconomicOpportunity(
  moduleState: CalculatedAnalysis["calculatedModules"][number],
): number {
  if (moduleState.status !== "COMPLETE" || !moduleState.calculationOutcome?.success) {
    return 0;
  }
  const outputs = moduleState.calculationOutcome.result.financialOutputs;
  return (outputs.annualRecurringValue ?? 0) + (outputs.annualOnlyValue ?? 0);
}

/**
 * Builds the value-waterfall dataset: each contributing module stacked left to
 * right, preserving the seller's display order, so the audience sees how the
 * total opportunity is composed. Modules that contribute no annual economic
 * opportunity are omitted.
 */
export function buildValueWaterfall(calculated: CalculatedAnalysis): WaterfallData {
  const ordered = [...calculated.calculatedModules].sort(
    (a, b) => a.displayOrder - b.displayOrder,
  );
  let running = 0;
  const steps: WaterfallStep[] = [];
  for (const moduleState of ordered) {
    const value = moduleAnnualEconomicOpportunity(moduleState);
    if (value === 0) continue;
    const start = running;
    running += value;
    steps.push({
      analysisModuleId: moduleState.analysisModuleId,
      moduleKey: moduleState.moduleKey,
      label: getValueModule(moduleState.moduleKey).name,
      value,
      start,
      end: running,
    });
  }
  return { steps, total: running };
}

/** One category or value-type slice of the annual economic opportunity. */
export type BreakdownSegment = {
  readonly key: string;
  readonly label: string;
  /** Annual economic opportunity for this segment (>= 0). */
  readonly value: number;
  /** Share of the grand total in `[0, 1]` (0 when the total is 0). */
  readonly share: number;
};

export type BreakdownData = {
  readonly segments: readonly BreakdownSegment[];
  readonly total: number;
};

function toBreakdown(
  entries: readonly { key: string; label: string; value: number }[],
): BreakdownData {
  const nonZero = entries.filter((entry) => entry.value !== 0);
  const total = nonZero.reduce((sum, entry) => sum + entry.value, 0);
  const denominator = nonZero.reduce((sum, entry) => sum + Math.abs(entry.value), 0);
  const segments = nonZero.map((entry) => ({
    key: entry.key,
    label: entry.label,
    value: entry.value,
    share: denominator > 0 ? Math.abs(entry.value) / denominator : 0,
  }));
  return { segments, total };
}

const valueTypeLabels: Record<ValueType, string> = {
  REVENUE_MARGIN_OPPORTUNITY: "Revenue & Margin Opportunity",
  COST_REDUCTION: "Operating Cost Reduction",
  CAPACITY_VALUE: "Labor Capacity Value",
  NET_CAPACITY_VALUE: "Net Capacity Value",
  COST_AVOIDANCE: "Cost Avoidance",
  CAPITAL_AVOIDANCE: "Capital Avoidance / Economic Equivalent",
};

/**
 * Builds the value-type breakdown from the pre-computed summary, preserving the
 * canonical value-type ordering so colors stay stable across analyses.
 */
export function buildValueTypeBreakdown(calculated: CalculatedAnalysis): BreakdownData {
  const byType = new Map(
    calculated.summary.valueTypeBreakdown.map((entry) => [entry.valueType, entry]),
  );
  return toBreakdown(
    valueTypes.map((valueType) => ({
      key: valueType,
      label: valueTypeLabels[valueType],
      value: byType.get(valueType)?.annualEconomicOpportunity ?? 0,
    })),
  );
}

/**
 * Builds the category breakdown by summing each module's annual economic
 * opportunity into its category. Category order follows the modules' first
 * appearance in display order for deterministic output.
 */
export function buildCategoryBreakdown(calculated: CalculatedAnalysis): BreakdownData {
  const ordered = [...calculated.calculatedModules].sort(
    (a, b) => a.displayOrder - b.displayOrder,
  );
  const totals = new Map<CategoryKey, number>();
  const order: CategoryKey[] = [];
  for (const moduleState of ordered) {
    const value = moduleAnnualEconomicOpportunity(moduleState);
    if (value === 0) continue;
    if (!totals.has(moduleState.category)) order.push(moduleState.category);
    totals.set(moduleState.category, (totals.get(moduleState.category) ?? 0) + value);
  }
  return toBreakdown(
    order.map((categoryKey) => ({
      key: categoryKey,
      label: getCategoryByKey(categoryKey)?.name ?? categoryKey,
      value: totals.get(categoryKey) ?? 0,
    })),
  );
}

/** One year on the cumulative-benefit curve, ready for line rendering. */
export type CumulativeBenefitPoint = {
  readonly year: number;
  /** Cumulative net cash flow including the upfront investment at this year. */
  readonly cumulativeNetCashFlow: number;
  /** Cumulative net benefit excluding the upfront investment. */
  readonly cumulativeNetBenefit: number;
};

export type CumulativeBenefitData = {
  readonly points: readonly CumulativeBenefitPoint[];
  /** Upfront investment plotted at year 0 (negative cash position). */
  readonly investment: number;
  /** Simple payback expressed in years (months / 12); `null` when never recouped. */
  readonly paybackYears: number | null;
  /** Largest absolute cash-flow magnitude across the series, for axis scaling. */
  readonly maxMagnitude: number;
};

/**
 * Builds the multi-year cumulative-benefit + payback series from the ROI
 * metrics. Returns `null` when ROI has not been computed (no investment
 * entered), so identified-opportunity-only analyses simply omit the chart.
 */
export function buildCumulativeBenefitSeries(
  calculated: CalculatedAnalysis,
): CumulativeBenefitData | null {
  const roi = calculated.roi;
  if (!roi) return null;
  const points: CumulativeBenefitPoint[] = roi.cumulativeBenefitCurve.map((point) => ({
    year: point.year,
    cumulativeNetCashFlow: point.cumulativeNetCashFlow,
    cumulativeNetBenefit: point.cumulativeNetBenefit,
  }));
  const magnitudes = [roi.investment, ...points.map((p) => Math.abs(p.cumulativeNetCashFlow))];
  return {
    points,
    investment: roi.investment,
    paybackYears: roi.paybackMonths === null ? null : roi.paybackMonths / 12,
    maxMagnitude: Math.max(0, ...magnitudes),
  };
}
