import type { ScenarioComparison } from "@/lib/analyses/scenarios";

/**
 * Optional conservative / expected / aggressive comparison for the Review value
 * story. Rendered inside a closed `<details>` disclosure so the feature is off
 * by default and does not alter the headline analysis; sellers opt in per
 * conversation. Server-rendered and keyboard accessible — no client JavaScript.
 */

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function pct(ratio: number | null): string {
  if (ratio === null || !Number.isFinite(ratio)) return "Not applicable";
  return `${(ratio * 100).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
}

function payback(months: number | null): string {
  if (months === null) return "Not achieved";
  return `${months.toLocaleString(undefined, { maximumFractionDigits: 1 })} mo`;
}

const cardTone: Record<string, string> = {
  CONSERVATIVE: "border-[#d7c9ae] bg-white/70",
  EXPECTED: "border-[#d89b2b] bg-[#fff6df]",
  AGGRESSIVE: "border-[#c6d8cb] bg-[#f0f6f1]",
};

export function ScenarioComparison({ comparison }: { comparison: ScenarioComparison }) {
  if (comparison.cases.every((scenario) => scenario.totalIdentifiedAnnualEconomicOpportunity <= 0)) {
    return null;
  }

  return (
    <details className="rounded-3xl border border-[#e8dcc6] bg-[#fffaf0] p-8">
      <summary className="cursor-pointer text-2xl font-bold text-[#0b1d33]">
        Scenario Comparison <span className="text-base font-semibold text-[#627085]">(optional)</span>
      </summary>
      <p className="mt-3 max-w-3xl text-[#627085]">
        A sensitivity band around the identified opportunity. The Expected case matches the deterministic analysis
        exactly; Conservative and Aggressive apply a single adjustment factor to the identified opportunity and re-derive
        ROI against the same investment assumptions. Module calculations are never changed.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-3" role="group" aria-label="Scenario comparison cases">
        {comparison.cases.map((scenario) => (
          <article key={scenario.key} className={`rounded-2xl border p-5 ${cardTone[scenario.key] ?? "border-[#d7c9ae] bg-white/70"}`}>
            <div className="flex items-baseline justify-between">
              <h3 className="text-lg font-bold text-[#0b1d33]">{scenario.label}</h3>
              <span className="text-sm font-semibold text-[#627085]">×{scenario.factor.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
            <p className="mt-1 text-xs leading-5 text-[#627085]">{scenario.description}</p>
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-[#28614a]">Annual Identified Opportunity</p>
            <p className="text-3xl font-black text-[#0b1d33]">{money.format(scenario.totalIdentifiedAnnualEconomicOpportunity)}</p>
            <dl className="mt-4 space-y-1 text-sm text-[#35465c]">
              <div className="flex justify-between"><dt>Monthly recurring</dt><dd className="font-semibold">{money.format(scenario.monthlyRecurringValue)}</dd></div>
              <div className="flex justify-between"><dt>Annual recurring</dt><dd className="font-semibold">{money.format(scenario.annualRecurringValue)}</dd></div>
              {scenario.annualOnlyValue > 0 && (
                <div className="flex justify-between"><dt>Annual-only</dt><dd className="font-semibold">{money.format(scenario.annualOnlyValue)}</dd></div>
              )}
            </dl>
            {scenario.roi ? (
              <dl className="mt-4 space-y-1 border-t border-[#e8dcc6] pt-4 text-sm text-[#35465c]">
                <div className="flex justify-between"><dt>Estimated Payback</dt><dd className="font-semibold">{payback(scenario.roi.paybackMonths)}</dd></div>
                <div className="flex justify-between"><dt>First-year ROI</dt><dd className="font-semibold">{pct(scenario.roi.firstYearRoiPct)}</dd></div>
                <div className="flex justify-between"><dt>{scenario.roi.horizonYears}-year ROI</dt><dd className="font-semibold">{pct(scenario.roi.horizonRoiPct)}</dd></div>
                <div className="flex justify-between"><dt>Net Present Value</dt><dd className="font-semibold">{money.format(scenario.roi.npv)}</dd></div>
              </dl>
            ) : (
              <p className="mt-4 border-t border-[#e8dcc6] pt-4 text-xs text-[#627085]">Enter an investment above to compare ROI across scenarios.</p>
            )}
          </article>
        ))}
      </div>
    </details>
  );
}
