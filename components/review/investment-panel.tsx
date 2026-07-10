import type { AnalysisInvestment } from "@/lib/analyses/types";
import type { RoiMetrics } from "@/lib/calculations";

type Props = {
  investment: AnalysisInvestment;
  roi: RoiMetrics | null;
  identifiedAnnualOpportunity: number;
  saveAction: (formData: FormData) => Promise<void>;
};

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function pct(ratio: number): string {
  return `${(ratio * 100).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
}

function payback(months: number | null): string {
  if (months === null) return "Does not recoup";
  return `${months.toLocaleString(undefined, { maximumFractionDigits: 1 })} months`;
}

function prefill(value: number | null): string | undefined {
  return value === null ? undefined : String(value);
}

const inputClass = "mt-1 w-full rounded-lg border border-[#d7c9ae] bg-white px-3 py-2 text-[#0b1d33]";
const labelClass = "text-sm font-semibold text-[#35465c]";

export function InvestmentPanel({ investment, roi, identifiedAnnualOpportunity, saveAction }: Props) {
  const adoptionValue = investment.adoptionSchedulePct
    ? investment.adoptionSchedulePct.map((fraction) => Math.round(fraction * 1000) / 10).join(", ")
    : undefined;
  const discountPrefill = investment.roiDiscountRatePct === null ? undefined : String(Math.round(investment.roiDiscountRatePct * 1000) / 10);

  return (
    <section className="rounded-3xl border border-[#e8dcc6] bg-[#fffaf0] p-8">
      <h2 className="text-2xl font-bold text-[#0b1d33]">Investment &amp; Return on Investment</h2>
      <p className="mt-2 max-w-3xl text-[#627085]">
        Enter the seller-quoted investment for this deal to translate the identified opportunity into finance-grade ROI,
        payback, NPV, and IRR. Leave the one-time cost blank to show identified opportunity only.
      </p>

      {roi && (
        <div className="mt-6 rounded-2xl bg-[#0b1d33] p-6 text-[#fffaf0]">
          <div className="grid gap-5 md:grid-cols-4">
            <div>
              <p className="text-sm uppercase tracking-[0.14em] text-[#d89b2b]">Net Annual Benefit</p>
              <p className="mt-1 text-3xl font-bold">{money.format(roi.netAnnualValue)}</p>
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.14em] text-[#d89b2b]">Payback</p>
              <p className="mt-1 text-3xl font-bold">{payback(roi.paybackMonths)}</p>
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.14em] text-[#d89b2b]">First-Year ROI</p>
              <p className="mt-1 text-3xl font-bold">{pct(roi.firstYearRoiPct)}</p>
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.14em] text-[#d89b2b]">{roi.horizonYears}-Year ROI</p>
              <p className="mt-1 text-3xl font-bold">{pct(roi.horizonRoiPct)}</p>
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.14em] text-[#d89b2b]">NPV @ {pct(roi.discountRatePct)}</p>
              <p className="mt-1 text-3xl font-bold">{money.format(roi.npv)}</p>
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.14em] text-[#d89b2b]">IRR</p>
              <p className="mt-1 text-3xl font-bold">{roi.irr === null ? "N/A" : pct(roi.irr)}</p>
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.14em] text-[#d89b2b]">Total Investment</p>
              <p className="mt-1 text-3xl font-bold">{money.format(roi.investment)}</p>
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.14em] text-[#d89b2b]">Annual Opportunity</p>
              <p className="mt-1 text-3xl font-bold">{money.format(roi.annualValue)}</p>
            </div>
          </div>

          <table className="mt-6 w-full border-collapse text-left text-sm">
            <thead>
              <tr className="text-[#d8e2ea]">
                <th className="border-b border-[#25405c] py-2 pr-4 font-semibold">Year</th>
                <th className="border-b border-[#25405c] py-2 pr-4 font-semibold">Adoption</th>
                <th className="border-b border-[#25405c] py-2 pr-4 font-semibold">Net Benefit</th>
                <th className="border-b border-[#25405c] py-2 pr-4 font-semibold">Cumulative Net Cash</th>
                <th className="border-b border-[#25405c] py-2 pr-4 font-semibold">Cumulative NPV</th>
              </tr>
            </thead>
            <tbody>
              {roi.cumulativeBenefitCurve.map((point) => (
                <tr key={point.year}>
                  <td className="border-b border-[#1a3049] py-2 pr-4">Year {point.year}</td>
                  <td className="border-b border-[#1a3049] py-2 pr-4">{pct(point.adoptionPct)}</td>
                  <td className="border-b border-[#1a3049] py-2 pr-4">{money.format(point.netBenefit)}</td>
                  <td className="border-b border-[#1a3049] py-2 pr-4">{money.format(point.cumulativeNetCashFlow)}</td>
                  <td className="border-b border-[#1a3049] py-2 pr-4">{money.format(point.cumulativeNpv)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form action={saveAction} className="mt-6 grid gap-4 md:grid-cols-3">
        <label className="block">
          <span className={labelClass}>One-time implementation cost</span>
          <input className={inputClass} type="number" min="0" step="1" name="investmentOneTimeCost" defaultValue={prefill(investment.investmentOneTimeCost)} placeholder="e.g. 150000" />
        </label>
        <label className="block">
          <span className={labelClass}>Recurring annual cost</span>
          <input className={inputClass} type="number" min="0" step="1" name="investmentAnnualRecurringCost" defaultValue={prefill(investment.investmentAnnualRecurringCost)} placeholder="e.g. 60000" />
        </label>
        <label className="block">
          <span className={labelClass}>Change-management cost (optional)</span>
          <input className={inputClass} type="number" min="0" step="1" name="investmentChangeManagementCost" defaultValue={prefill(investment.investmentChangeManagementCost)} placeholder="e.g. 20000" />
        </label>
        <label className="block">
          <span className={labelClass}>Analysis horizon (years)</span>
          <input className={inputClass} type="number" min="1" max="10" step="1" name="roiHorizonYears" defaultValue={prefill(investment.roiHorizonYears)} placeholder="3" />
        </label>
        <label className="block">
          <span className={labelClass}>Discount rate (%)</span>
          <input className={inputClass} type="number" min="0" max="100" step="0.1" name="roiDiscountRatePct" defaultValue={discountPrefill} placeholder="10" />
        </label>
        <label className="block">
          <span className={labelClass}>Adoption ramp (% per year, optional)</span>
          <input className={inputClass} type="text" name="adoptionSchedulePct" defaultValue={adoptionValue} placeholder="e.g. 50, 80, 100" />
        </label>
        <div className="md:col-span-3">
          <p className="text-sm text-[#627085]">Identified annual opportunity available for this analysis: {money.format(identifiedAnnualOpportunity)}.</p>
          <button type="submit" className="mt-3 inline-block rounded-lg bg-[#28614a] px-5 py-3 font-bold text-[#fffaf0]">Save investment &amp; recalculate ROI</button>
        </div>
      </form>
    </section>
  );
}
