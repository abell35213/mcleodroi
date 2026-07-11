import type { WaterfallData } from "@/lib/analyses/charts";
import {
  formatCompactMoney,
  formatMoney,
  paletteColor,
  visuallyHidden,
} from "./chart-primitives";

/**
 * Value waterfall: each contributing module stacked left to right up to the
 * total annual identified opportunity. Static inline SVG, no client JS.
 */
export function ValueWaterfallChart({ data }: { data: WaterfallData }) {
  if (data.steps.length === 0 || data.total <= 0) return null;

  const width = 720;
  const height = 320;
  const padding = { top: 24, right: 16, bottom: 72, left: 16 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const barCount = data.steps.length + 1; // steps + final total bar
  const gap = 12;
  const barWidth = (plotWidth - gap * (barCount - 1)) / barCount;
  const scale = (value: number) => (value / data.total) * plotHeight;
  const baseY = padding.top + plotHeight;

  const caption = `Value waterfall: ${data.steps.length} opportunities building to ${formatMoney(
    data.total,
  )} in annual identified opportunity.`;

  return (
    <figure className="rounded-3xl border border-[#e8dcc6] bg-[#fffaf0] p-6">
      <figcaption className="text-lg font-bold text-[#0b1d33]">
        How the Opportunity Builds
      </figcaption>
      <p className="mt-1 text-sm text-[#627085]">
        Each opportunity stacks to the total annual identified economic opportunity.
      </p>
      <svg
        className="mt-4 h-auto w-full"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={caption}
        preserveAspectRatio="xMidYMid meet"
      >
        <title>How the Opportunity Builds</title>
        <desc>{caption}</desc>
        {data.steps.map((step, index) => {
          const x = padding.left + index * (barWidth + gap);
          const barHeight = scale(step.value);
          const y = baseY - scale(step.end);
          return (
            <g key={step.analysisModuleId}>
              {index > 0 ? (
                <line
                  x1={x - gap}
                  y1={baseY - scale(step.start)}
                  x2={x}
                  y2={baseY - scale(step.start)}
                  stroke="#c9b89c"
                  strokeDasharray="4 3"
                />
              ) : null}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barHeight, 1)}
                rx={4}
                fill={paletteColor(index)}
              />
              <text
                x={x + barWidth / 2}
                y={y - 6}
                textAnchor="middle"
                fontSize={11}
                fontWeight={700}
                fill="#0b1d33"
              >
                {formatCompactMoney(step.value)}
              </text>
              <text
                x={x + barWidth / 2}
                y={baseY + 16}
                textAnchor="end"
                fontSize={10}
                fill="#35465c"
                transform={`rotate(-35 ${x + barWidth / 2} ${baseY + 16})`}
              >
                {step.label}
              </text>
            </g>
          );
        })}
        {(() => {
          const index = data.steps.length;
          const x = padding.left + index * (barWidth + gap);
          const barHeight = scale(data.total);
          const y = baseY - barHeight;
          return (
            <g>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barHeight, 1)}
                rx={4}
                fill="#d89b2b"
              />
              <text
                x={x + barWidth / 2}
                y={y - 6}
                textAnchor="middle"
                fontSize={11}
                fontWeight={700}
                fill="#0b1d33"
              >
                {formatCompactMoney(data.total)}
              </text>
              <text
                x={x + barWidth / 2}
                y={baseY + 16}
                textAnchor="end"
                fontSize={10}
                fontWeight={700}
                fill="#0b1d33"
                transform={`rotate(-35 ${x + barWidth / 2} ${baseY + 16})`}
              >
                Total Opportunity
              </text>
            </g>
          );
        })()}
        <line
          x1={padding.left}
          y1={baseY}
          x2={width - padding.right}
          y2={baseY}
          stroke="#0b1d33"
          strokeWidth={1}
        />
      </svg>
      <table style={visuallyHidden}>
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Opportunity</th>
            <th scope="col">Annual economic opportunity</th>
            <th scope="col">Cumulative</th>
          </tr>
        </thead>
        <tbody>
          {data.steps.map((step) => (
            <tr key={step.analysisModuleId}>
              <th scope="row">{step.label}</th>
              <td>{formatMoney(step.value)}</td>
              <td>{formatMoney(step.end)}</td>
            </tr>
          ))}
          <tr>
            <th scope="row">Total Opportunity</th>
            <td>{formatMoney(data.total)}</td>
            <td>{formatMoney(data.total)}</td>
          </tr>
        </tbody>
      </table>
    </figure>
  );
}
