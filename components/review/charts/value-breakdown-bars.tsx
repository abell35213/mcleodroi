import type { BreakdownData } from "@/lib/analyses/charts";
import {
  formatMoney,
  formatPercentShare,
  paletteColor,
  visuallyHidden,
} from "./chart-primitives";

/**
 * Horizontal 100%-stacked bar breaking the annual identified opportunity into
 * segments (by value type or by category), with a legend. Static inline SVG.
 */
export function ValueBreakdownBars({
  data,
  title,
  description,
}: {
  data: BreakdownData;
  title: string;
  description: string;
}) {
  if (data.segments.length === 0 || data.total <= 0) return null;

  const width = 720;
  const barHeight = 44;
  const padding = { top: 20, right: 8, bottom: 8, left: 8 };
  const plotWidth = width - padding.left - padding.right;
  const height = padding.top + barHeight + padding.bottom;

  const rects = data.segments.map((segment, index) => {
    const priorShare = data.segments
      .slice(0, index)
      .reduce((sum, prior) => sum + prior.share, 0);
    const x = padding.left + priorShare * plotWidth;
    const segWidth = segment.share * plotWidth;
    return { segment, index, x, segWidth };
  });

  const caption = `${title}: ${data.segments
    .map((segment) => `${segment.label} ${formatMoney(segment.value)} (${formatPercentShare(segment.share)})`)
    .join(", ")}.`;

  return (
    <figure className="rounded-3xl border border-[#e8dcc6] bg-[#fffaf0] p-6">
      <figcaption className="text-lg font-bold text-[#0b1d33]">{title}</figcaption>
      <p className="mt-1 text-sm text-[#627085]">{description}</p>
      <svg
        className="mt-4 h-auto w-full"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={caption}
        preserveAspectRatio="xMidYMid meet"
      >
        <title>{title}</title>
        <desc>{caption}</desc>
        {rects.map(({ segment, index, x, segWidth }) => (
          <g key={segment.key}>
            <rect
              x={x}
              y={padding.top}
              width={Math.max(segWidth, 0)}
              height={barHeight}
              fill={paletteColor(index)}
            />
            {segWidth > 56 ? (
              <text
                x={x + segWidth / 2}
                y={padding.top + barHeight / 2 + 4}
                textAnchor="middle"
                fontSize={12}
                fontWeight={700}
                fill="#fffaf0"
              >
                {formatPercentShare(segment.share)}
              </text>
            ) : null}
          </g>
        ))}
      </svg>
      <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        {data.segments.map((segment, index) => (
          <li key={segment.key} className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: paletteColor(index) }}
            />
            <span className="font-medium text-[#0b1d33]">{segment.label}</span>
            <span className="text-[#627085]">
              {formatMoney(segment.value)} · {formatPercentShare(segment.share)}
            </span>
          </li>
        ))}
      </ul>
      <table style={visuallyHidden}>
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Segment</th>
            <th scope="col">Annual economic opportunity</th>
            <th scope="col">Share</th>
          </tr>
        </thead>
        <tbody>
          {data.segments.map((segment) => (
            <tr key={segment.key}>
              <th scope="row">{segment.label}</th>
              <td>{formatMoney(segment.value)}</td>
              <td>{formatPercentShare(segment.share)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
