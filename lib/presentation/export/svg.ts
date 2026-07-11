import type { BreakdownData, CumulativeBenefitData, WaterfallData } from "@/lib/analyses/charts";
import { formatPresentationCurrency } from "@/lib/presentation/format";

const GOLD = "#D89B2B";
const MIDNIGHT = "#0B1D33";
const FOREST = "#3F5E4A";
const BORDER = "#E8DCC6";
const MUTED = "#627085";

function escapeText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function compactCurrency(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return formatPresentationCurrency(value);
}

/** Deterministic value-waterfall SVG (stacked module contributions). */
export function renderWaterfallSvg(data: WaterfallData): string {
  if (data.steps.length === 0 || data.total <= 0) return "";
  const width = 720;
  const height = 260;
  const padding = { top: 20, right: 20, bottom: 60, left: 20 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const barWidth = plotWidth / data.steps.length - 12;
  const scale = plotHeight / data.total;
  const bars = data.steps
    .map((step, index) => {
      const x = padding.left + index * (plotWidth / data.steps.length) + 6;
      const y = padding.top + plotHeight - step.end * scale;
      const barHeight = Math.max(1, step.value * scale);
      const label = escapeText(step.label.length > 16 ? `${step.label.slice(0, 15)}…` : step.label);
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barHeight.toFixed(1)}" fill="${GOLD}" rx="3"></rect>` +
        `<text x="${(x + barWidth / 2).toFixed(1)}" y="${(y - 5).toFixed(1)}" font-size="10" fill="${MIDNIGHT}" text-anchor="middle">${compactCurrency(step.value)}</text>` +
        `<text x="${(x + barWidth / 2).toFixed(1)}" y="${(height - 36).toFixed(1)}" font-size="9" fill="${MUTED}" text-anchor="middle">${label}</text>`;
    })
    .join("");
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Value waterfall" width="100%" xmlns="http://www.w3.org/2000/svg">` +
    `<line x1="${padding.left}" y1="${padding.top + plotHeight}" x2="${width - padding.right}" y2="${padding.top + plotHeight}" stroke="${BORDER}"></line>` +
    `${bars}` +
    `<text x="${padding.left}" y="${height - 12}" font-size="11" fill="${MIDNIGHT}" font-weight="bold">Total: ${compactCurrency(data.total)}</text>` +
    `</svg>`;
}

/** Horizontal breakdown bars scaled to the largest segment. */
export function renderBreakdownSvg(data: BreakdownData, title: string): string {
  if (data.segments.length === 0 || data.total <= 0) return "";
  const rowHeight = 34;
  const width = 720;
  const labelWidth = 220;
  const barMax = width - labelWidth - 120;
  const height = data.segments.length * rowHeight + 20;
  const max = Math.max(...data.segments.map((segment) => segment.value));
  const rows = data.segments
    .map((segment, index) => {
      const y = 14 + index * rowHeight;
      const barLength = max > 0 ? (segment.value / max) * barMax : 0;
      return `<text x="0" y="${(y + 14).toFixed(1)}" font-size="12" fill="${MIDNIGHT}">${escapeText(segment.label)}</text>` +
        `<rect x="${labelWidth}" y="${y.toFixed(1)}" width="${barLength.toFixed(1)}" height="20" fill="${FOREST}" rx="3"></rect>` +
        `<text x="${(labelWidth + barLength + 8).toFixed(1)}" y="${(y + 15).toFixed(1)}" font-size="11" fill="${MIDNIGHT}">${compactCurrency(segment.value)}</text>`;
    })
    .join("");
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeText(title)}" width="100%" xmlns="http://www.w3.org/2000/svg">${rows}</svg>`;
}

/** Cumulative net cash-flow line with a zero baseline and payback marker. */
export function renderCumulativeBenefitSvg(data: CumulativeBenefitData): string {
  if (data.points.length === 0) return "";
  const width = 720;
  const height = 260;
  const padding = { top: 20, right: 30, bottom: 40, left: 60 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const years = [0, ...data.points.map((point) => point.year)];
  const values = [-data.investment, ...data.points.map((point) => point.cumulativeNetCashFlow)];
  const maxYear = Math.max(...years, 1);
  const magnitude = Math.max(data.maxMagnitude, 1);
  const xFor = (year: number) => padding.left + (year / maxYear) * plotWidth;
  const yFor = (value: number) => padding.top + plotHeight / 2 - (value / magnitude) * (plotHeight / 2);
  const path = values.map((value, index) => `${index === 0 ? "M" : "L"} ${xFor(years[index]).toFixed(1)} ${yFor(value).toFixed(1)}`).join(" ");
  const dots = values
    .map((value, index) => `<circle cx="${xFor(years[index]).toFixed(1)}" cy="${yFor(value).toFixed(1)}" r="3" fill="${MIDNIGHT}"></circle>`)
    .join("");
  const zeroY = yFor(0).toFixed(1);
  const payback = data.paybackYears === null ? "Payback beyond horizon" : `Payback ≈ ${data.paybackYears.toFixed(1)} yrs`;
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Cumulative benefit" width="100%" xmlns="http://www.w3.org/2000/svg">` +
    `<line x1="${padding.left}" y1="${zeroY}" x2="${width - padding.right}" y2="${zeroY}" stroke="${BORDER}"></line>` +
    `<path d="${path}" fill="none" stroke="${GOLD}" stroke-width="2.5"></path>${dots}` +
    `<text x="${padding.left}" y="${height - 12}" font-size="11" fill="${MIDNIGHT}" font-weight="bold">${payback}</text>` +
    `</svg>`;
}
