import { stableSerialize } from "@/lib/narratives/fingerprint";
import { formatPresentationCurrency } from "@/lib/presentation/format";
import type { PresentationSnapshot } from "@/lib/presentation/types";
import { buildPresentationExportModel, type ExportMetric } from "./model";
import { renderBreakdownSvg, renderCumulativeBenefitSvg, renderWaterfallSvg } from "./svg";

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function metricCards(metrics: ExportMetric[]): string {
  return metrics
    .map(
      (metric) =>
        `<div class="card"><p class="card-label">${esc(metric.label)}</p><p class="card-value">${esc(metric.value)}</p>${metric.note ? `<p class="card-note">${esc(metric.note)}</p>` : ""}</div>`,
    )
    .join("");
}

const STYLES = `
:root{--midnight:#0B1D33;--gold:#D89B2B;--canvas:#F8F1E4;--fff:#FFFAF0;--border:#E8DCC6;--muted:#627085;--forest:#28614a;}
*{box-sizing:border-box;}
body{margin:0;background:var(--canvas);color:var(--midnight);font-family:Arial,Helvetica,sans-serif;line-height:1.5;}
.wrap{max-width:960px;margin:0 auto;padding:32px 24px 64px;}
.cover{background:var(--midnight);color:var(--fff);border-radius:24px;padding:40px;display:flex;justify-content:space-between;align-items:flex-start;gap:24px;}
.cover h1{font-size:34px;margin:8px 0 0;}
.cover .eyebrow{color:var(--gold);font-weight:bold;letter-spacing:.18em;text-transform:uppercase;font-size:13px;margin:0;}
.cover .meta{margin-top:16px;font-size:14px;color:#d8e2ea;}
.cover img{max-height:72px;max-width:200px;object-fit:contain;background:#fff;border-radius:8px;padding:6px;}
section{background:var(--fff);border:1px solid var(--border);border-radius:20px;padding:28px;margin-top:24px;}
h2{font-size:22px;margin:0 0 16px;}
h3{font-size:17px;margin:0 0 8px;}
.headline{background:var(--midnight);color:var(--fff);border:none;}
.headline .eyebrow{color:var(--gold);font-weight:bold;letter-spacing:.2em;text-transform:uppercase;font-size:13px;margin:0;}
.headline .big{font-size:52px;font-weight:800;margin:8px 0 0;}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;}
.card{background:rgba(255,255,255,.08);border-radius:14px;padding:16px;}
.headline .card{background:rgba(255,255,255,.10);}
section:not(.headline) .card{background:#fff;border:1px solid var(--border);}
.card-label{margin:0;font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);}
.headline .card-label{color:#d8e2ea;}
.card-value{margin:6px 0 0;font-size:22px;font-weight:700;}
.card-note{margin:2px 0 0;font-size:12px;color:var(--muted);}
.chart{margin-top:20px;}
.chart-caption{font-size:13px;color:var(--muted);margin:0 0 6px;}
.module{border-top:1px solid var(--border);padding-top:18px;margin-top:18px;}
.module:first-of-type{border-top:none;padding-top:0;margin-top:0;}
.module .metric{font-weight:700;color:var(--forest);}
.disclaimer{font-size:12px;color:var(--muted);margin-top:8px;}
.notice{background:#fff6df;border:1px solid var(--gold);border-radius:12px;padding:12px 16px;margin-top:12px;font-size:14px;}
footer{margin-top:32px;font-size:12px;color:var(--muted);text-align:center;}
@media print{body{background:#fff;}section,.cover{break-inside:avoid;}}
`;

/**
 * Render a fully self-contained, offline HTML export from the immutable
 * snapshot: inline styles, inline SVG charts, an embedded base64 logo, and the
 * verbatim snapshot JSON. A seller can email or host the single file anywhere
 * without a server, auth, or network access (Phase 4.2).
 */
export function renderPresentationHtml(snapshot: PresentationSnapshot): string {
  const model = buildPresentationExportModel(snapshot);
  const charts = snapshot.charts;
  const waterfallSvg = charts ? renderWaterfallSvg(charts.waterfall) : "";
  const valueTypeSvg = charts ? renderBreakdownSvg(charts.valueTypeBreakdown, "Opportunity by value type") : "";
  const categorySvg = charts ? renderBreakdownSvg(charts.categoryBreakdown, "Opportunity by category") : "";
  const cumulativeSvg = charts?.cumulativeBenefit ? renderCumulativeBenefitSvg(charts.cumulativeBenefit) : "";

  const modulesHtml = model.categories
    .map(
      (category) =>
        `<section><h2>${esc(category.name)}</h2>${category.modules
          .map(
            (module) =>
              `<div class="module"><h3>${esc(module.moduleName)}</h3>` +
              (module.customerSpecific ? `<p class="card-label">Customer-Specific Opportunity</p>` : "") +
              `<p class="metric">${esc(module.metricLabel)}: ${esc(module.metricValue)}</p>` +
              `<p>${esc(module.narrative)}</p>` +
              (module.valueNarrative ? `<p>${esc(module.valueNarrative)}</p>` : "") +
              (module.assumptions?.length ? `<ul>${module.assumptions.map((a) => `<li>${esc(a.label)} — ${esc(a.value)}</li>`).join("")}</ul>` : "") +
              (module.calculationRationale ? `<p><strong>Calculation rationale:</strong> ${esc(module.calculationRationale)}</p>` : "") +
              (module.disclaimer ? `<p class="disclaimer">${esc(module.disclaimer)}</p>` : "") +
              `</div>`,
          )
          .join("")}</section>`,
    )
    .join("");

  const roiSection = model.roiMetrics.length
    ? `<section><h2>Return on Investment</h2><div class="grid">${metricCards(model.roiMetrics)}</div>${cumulativeSvg ? `<div class="chart"><p class="chart-caption">Cumulative net cash flow over the investment horizon.</p>${cumulativeSvg}</div>` : ""}</section>`
    : "";

  const chartsSection =
    waterfallSvg || valueTypeSvg || categorySvg
      ? `<section><h2>Value Story at a Glance</h2>${waterfallSvg ? `<div class="chart"><p class="chart-caption">How each opportunity builds the annual total.</p>${waterfallSvg}</div>` : ""}${valueTypeSvg ? `<div class="chart"><p class="chart-caption">Opportunity by value type.</p>${valueTypeSvg}</div>` : ""}${categorySvg ? `<div class="chart"><p class="chart-caption">Opportunity by category.</p>${categorySvg}</div>` : ""}</section>`
      : "";

  const capitalSection = model.informationalCapitalTotal > 0
    ? `<section><h2>Potential Avoided Capital Investment</h2><p class="card-value">${esc(formatPresentationCurrency(model.informationalCapitalTotal))}</p><ul>${model.informationalCapital.map((entry) => `<li>${esc(entry.label)}: ${esc(entry.value)}</li>`).join("")}</ul></section>`
    : "";

  const noticesSection = model.overlapNotices.length
    ? `<section><h2>Overlap Notices</h2>${model.overlapNotices.map((message) => `<div class="notice">${esc(message)}</div>`).join("")}</section>`
    : "";

  const logo = model.logoDataUri ? `<img src="${esc(model.logoDataUri)}" alt="${esc(model.companyName)} logo" />` : "";
  const snapshotJson = stableSerialize(snapshot);

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${esc(model.companyName)} Business Impact Analysis</title><style>${STYLES}</style></head>
<body><div class="wrap">
<header class="cover"><div><p class="eyebrow">${esc(model.businessTypeLabel)} Value Analysis</p><h1>${esc(model.companyName)}</h1><p class="meta">Business Impact Analysis · Prepared by ${esc(model.preparedBy)} · ${esc(model.analysisDate)}</p></div>${logo}</header>
<section class="headline"><p class="eyebrow">${esc(model.headline.label)}</p><p class="big">${esc(model.headline.value)}</p><div class="grid" style="margin-top:24px">${metricCards(model.summaryMetrics)}</div></section>
${model.valueTypeCards.length ? `<section><h2>Value Type Breakdown</h2><div class="grid">${metricCards(model.valueTypeCards)}</div></section>` : ""}
${chartsSection}
${roiSection}
${capitalSection}
${modulesHtml}
${noticesSection}
<footer>Generated from immutable snapshot ${esc(model.snapshotVersion)} · ${esc(model.createdAt)} · McLeod Software</footer>
</div>
<script type="application/json" id="mcleod-presentation-snapshot">${snapshotJson.replace(/</g, "\\u003c")}</script>
</body></html>`;
}
