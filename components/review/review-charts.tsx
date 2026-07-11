import {
  buildCategoryBreakdown,
  buildCumulativeBenefitSeries,
  buildValueTypeBreakdown,
  buildValueWaterfall,
} from "@/lib/analyses/charts";
import type { CalculatedAnalysis } from "@/lib/analyses/types";
import { CumulativeBenefitChart } from "./charts/cumulative-benefit-chart";
import { ValueBreakdownBars } from "./charts/value-breakdown-bars";
import { ValueWaterfallChart } from "./charts/value-waterfall-chart";

/**
 * Assembles the Review value-story visualizations from an already-calculated
 * analysis. Rendering only — the underlying calculations are never re-run, so
 * the charts always agree with the headline figures. Charts self-omit when they
 * have no data (e.g. ROI is absent until an investment is entered).
 */
export function ReviewCharts({ calculated }: { calculated: CalculatedAnalysis }) {
  const waterfall = buildValueWaterfall(calculated);
  const valueTypeBreakdown = buildValueTypeBreakdown(calculated);
  const categoryBreakdown = buildCategoryBreakdown(calculated);
  const cumulativeBenefit = buildCumulativeBenefitSeries(calculated);

  if (waterfall.steps.length === 0 && valueTypeBreakdown.segments.length === 0) {
    return null;
  }

  return (
    <section className="space-y-6" aria-label="Value story visualizations">
      <h2 className="text-2xl font-bold text-[#0b1d33]">Value Story at a Glance</h2>
      <ValueWaterfallChart data={waterfall} />
      <div className="grid gap-6 lg:grid-cols-2">
        <ValueBreakdownBars
          data={valueTypeBreakdown}
          title="Opportunity by Value Type"
          description="Share of annual identified opportunity by the type of value created."
        />
        <ValueBreakdownBars
          data={categoryBreakdown}
          title="Opportunity by Category"
          description="Share of annual identified opportunity by opportunity category."
        />
      </div>
      {cumulativeBenefit ? <CumulativeBenefitChart data={cumulativeBenefit} /> : null}
    </section>
  );
}
