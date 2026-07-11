import type { CumulativeBenefitData } from "@/lib/analyses/charts";
import {
  formatCompactMoney,
  formatMoney,
  visuallyHidden,
} from "./chart-primitives";

/**
 * Multi-year cumulative net cash-flow line starting from the upfront investment
 * at year 0, with a payback marker where cumulative cash flow crosses zero.
 * Static inline SVG, no client JS.
 */
export function CumulativeBenefitChart({ data }: { data: CumulativeBenefitData }) {
  if (data.points.length === 0) return null;

  const series = [
    { year: 0, cashFlow: -data.investment },
    ...data.points.map((point) => ({ year: point.year, cashFlow: point.cumulativeNetCashFlow })),
  ];
  const horizon = series[series.length - 1].year;
  if (horizon <= 0) return null;

  const width = 720;
  const height = 320;
  const padding = { top: 24, right: 24, bottom: 44, left: 72 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const cashFlows = series.map((point) => point.cashFlow);
  const yMax = Math.max(0, ...cashFlows);
  const yMin = Math.min(0, ...cashFlows);
  const ySpan = yMax - yMin || 1;

  const xFor = (year: number) => padding.left + (year / horizon) * plotWidth;
  const yFor = (cashFlow: number) =>
    padding.top + plotHeight - ((cashFlow - yMin) / ySpan) * plotHeight;

  const zeroY = yFor(0);
  const linePoints = series.map((point) => `${xFor(point.year)},${yFor(point.cashFlow)}`).join(" ");

  const paybackX =
    data.paybackYears !== null && data.paybackYears <= horizon
      ? xFor(data.paybackYears)
      : null;

  const paybackLabel =
    data.paybackYears === null
      ? "Payback not reached within the horizon"
      : `Payback in ${data.paybackYears.toFixed(1)} years`;
  const caption = `Cumulative net cash flow over ${horizon} years starting from a ${formatMoney(
    data.investment,
  )} investment. ${paybackLabel}.`;

  return (
    <figure className="rounded-3xl border border-[#e8dcc6] bg-[#fffaf0] p-6">
      <figcaption className="text-lg font-bold text-[#0b1d33]">
        Cumulative Benefit &amp; Payback
      </figcaption>
      <p className="mt-1 text-sm text-[#627085]">{paybackLabel}.</p>
      <svg
        className="mt-4 h-auto w-full"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={caption}
        preserveAspectRatio="xMidYMid meet"
      >
        <title>Cumulative Benefit &amp; Payback</title>
        <desc>{caption}</desc>
        <line
          x1={padding.left}
          y1={zeroY}
          x2={width - padding.right}
          y2={zeroY}
          stroke="#0b1d33"
          strokeWidth={1}
        />
        <text x={padding.left - 8} y={zeroY + 4} textAnchor="end" fontSize={10} fill="#627085">
          $0
        </text>
        <text
          x={padding.left - 8}
          y={yFor(yMax) + 4}
          textAnchor="end"
          fontSize={10}
          fill="#627085"
        >
          {formatCompactMoney(yMax)}
        </text>
        {yMin < 0 ? (
          <text
            x={padding.left - 8}
            y={yFor(yMin) + 4}
            textAnchor="end"
            fontSize={10}
            fill="#627085"
          >
            {formatCompactMoney(yMin)}
          </text>
        ) : null}
        {paybackX !== null ? (
          <g>
            <line
              x1={paybackX}
              y1={padding.top}
              x2={paybackX}
              y2={padding.top + plotHeight}
              stroke="#28614a"
              strokeDasharray="5 4"
            />
            <text
              x={paybackX}
              y={padding.top - 8}
              textAnchor="middle"
              fontSize={11}
              fontWeight={700}
              fill="#28614a"
            >
              Payback
            </text>
          </g>
        ) : null}
        <polyline points={linePoints} fill="none" stroke="#d89b2b" strokeWidth={3} />
        {series.map((point) => (
          <g key={point.year}>
            <circle cx={xFor(point.year)} cy={yFor(point.cashFlow)} r={4} fill="#0b1d33" />
            <text
              x={xFor(point.year)}
              y={padding.top + plotHeight + 20}
              textAnchor="middle"
              fontSize={10}
              fill="#35465c"
            >
              {point.year === 0 ? "Now" : `Yr ${point.year}`}
            </text>
          </g>
        ))}
      </svg>
      <table style={visuallyHidden}>
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Year</th>
            <th scope="col">Cumulative net cash flow</th>
          </tr>
        </thead>
        <tbody>
          {series.map((point) => (
            <tr key={point.year}>
              <th scope="row">{point.year === 0 ? "Now" : `Year ${point.year}`}</th>
              <td>{formatMoney(point.cashFlow)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
