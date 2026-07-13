import pptxgen from "pptxgenjs";
import { presentationLayout as L } from "@/lib/presentation/layout";
import { presentationTheme as T } from "@/lib/presentation/theme";
import type { AssumptionsAppendixSlideModel, CategoryOverviewSlideModel, CoverSlideModel, DualModuleSlideModel, ExecutiveSummarySlideModel, InvestmentReturnSlideModel, OpportunitySummarySlideModel, SingleModuleSlideModel } from "@/lib/presentation/types";
import { addAssumptionGrid, addAssumptionsAppendixTable, addBrandHeader, addDisclaimer, addFooter, addFullSlideThemeBackground, addHeroMetric, addNarrativeBlock, addSummaryBand, addValueCard } from "@/lib/presentation/pptx/components";

const c = T.colors;

export function buildCoverSlide(pptx: pptxgen, m: CoverSlideModel) {
  const s = pptx.addSlide();
  const titleImagePath = m.titleSlideImagePath === undefined ? T.assets.titleSlideImagePath : m.titleSlideImagePath;
  s.background = { color: c.midnight };
  if (titleImagePath) s.addImage({ path: titleImagePath, x: 0, y: 0, w: L.slide.width, h: L.slide.height });
  s.addText("Business Impact Analysis", { x: 0.82, y: 1.5, w: 4.2, h: 0.9, fontFace: T.typography.headingFont, fontSize: 30, bold: true, color: c.white, fit: "shrink", breakLine: false, margin: 0 });
  s.addText(`Prepared for ${m.companyName}`, { x: 0.84, y: 2.62, w: 4.35, h: 0.34, fontFace: T.typography.bodyFont, fontSize: 15, color: c.white, breakLine: false, fit: "shrink", margin: 0 });
  if (m.analysisDate) s.addText(m.analysisDate, { x: 9.65, y: 6.88, w: 2.6, h: 0.2, align: "right", fontFace: T.typography.bodyFont, fontSize: 9, color: c.white });
  return s;
}

export function buildExecutiveSummarySlide(pptx: pptxgen, m: ExecutiveSummarySlideModel) {
  const s = pptx.addSlide();
  addFullSlideThemeBackground(s);
  s.addText("Executive Summary", { x: L.content.left, y: 0.55, w: 9.4, h: 0.42, fontFace: T.typography.headingFont, fontSize: T.typography.slideTitleFontSize, bold: true, color: "000000", margin: 0, fit: "shrink" });
  s.addShape("line", { x: L.content.left, y: 1.04, w: 1.28, h: 0, line: { color: c.sunriseGold, width: 2.2 } });
  s.addText(`${m.discussionSummary} ${m.alignmentSummary}`, { x: L.content.left, y: 1.32, w: 11.05, h: 1.08, fontSize: 16, color: c.charcoal, fit: "shrink", breakLine: false });
  s.addText(m.keyAreasLeadIn, { x: L.content.left, y: 2.72, w: 11.05, h: 0.28, fontSize: 13, bold: true, color: c.midnight, fit: "shrink" });
  const themeY = 3.22;
  m.needThemes.slice(0, 4).forEach((theme, i) => {
    const y = themeY + i * 0.78;
    s.addText(theme.heading, { x: L.content.left, y, w: 11.05, h: 0.24, fontSize: 14, bold: true, underline: { style: "sng" }, color: c.midnight, fit: "shrink" });
    s.addText(theme.bullets.slice(0, 2).join("\n"), { x: L.content.left + 0.18, y: y + 0.32, w: 10.75, h: 0.42, fontSize: 10.5, color: c.charcoal, bullet: { type: "bullet" }, fit: "shrink", breakLine: false });
  });
  addFooter(s, { companyName: m.companyName, slideNumber: m.slideNumber });
  return s;
}

export function buildSingleModuleSlide(pptx: pptxgen, m: SingleModuleSlideModel) {
  const s = pptx.addSlide();
  addBrandHeader(s, { categoryLabel: m.categoryLabel, title: m.moduleTitle, companyName: m.companyName });
  addHeroMetric(s, { ...m.heroMetric, x: 8.15, y: 1.5, w: 3.8, h: 1.7 });
  if (m.presentationCallout) addDisclaimer(s, { text: m.presentationCallout, x: 8.15, y: 3.32, w: 3.8 });
  addNarrativeBlock(s, { heading: "How McLeod Helps", text: m.valueNarrative ?? m.analysisText, x: L.content.left, y: 1.38, w: 6.95, h: 1.95 });
  addNarrativeBlock(s, { heading: "Customer Analysis / Business Impact", text: m.effectiveCustomerAnalysis ?? m.analysisText, secondaryText: m.informationalCapitalCallout, x: L.content.left, y: 3.52, w: 7.25, h: 1.55 });
  addAssumptionGrid(s, { items: m.assumptions, x: L.content.left, y: 5.35, w: 12 });
  if (m.disclaimer) addDisclaimer(s, { text: m.disclaimer, x: L.content.left, y: 6.28, w: 12 });
  addFooter(s, { companyName: m.companyName, slideNumber: m.slideNumber });
  return s;
}

export function buildDualModuleSlide(pptx: pptxgen, m: DualModuleSlideModel) {
  if (m.modules.length !== 2) throw new Error("Dual-module slide requires exactly two module models.");
  const s = pptx.addSlide();
  addBrandHeader(s, { categoryLabel: m.categoryLabel, title: m.title, companyName: m.companyName });
  m.modules.forEach((mod, i) => {
    const x = L.content.left + i * 6.15;
    addValueCard(s, { title: mod.title, value: mod.primaryMetric, period: mod.period, label: mod.label, supportingMetric: mod.supportingMetric, x, y: 1.45, w: 5.75, h: 1.65 });
    addNarrativeBlock(s, { heading: "How McLeod Helps", text: mod.howMcLeodHelps ?? mod.analysisText, x, y: 3.28, w: 5.75, h: 1.05 });
    addNarrativeBlock(s, { heading: "Customer Impact", text: mod.customerImpact ?? mod.analysisText, x, y: 4.62, w: 5.75, h: 1.2 });
  });
  addFooter(s, { companyName: m.companyName, slideNumber: m.slideNumber });
  return s;
}

export function buildCategoryOverviewSlide(pptx: pptxgen, m: CategoryOverviewSlideModel) {
  if (m.cards.length > 4) throw new Error("Category overview supports at most four cards.");
  const s = pptx.addSlide();
  addBrandHeader(s, { categoryLabel: "Category Overview", title: m.categoryName, companyName: m.companyName });
  addHeroMetric(s, { ...m.categoryOpportunity, x: L.content.left, y: 1.5, w: 4.2, h: 1.55 });
  const gap = 0.2;
  const cw = (7.55 - gap * (Math.max(m.cards.length, 1) - 1)) / Math.max(m.cards.length, 1);
  m.cards.forEach((card, i) => addValueCard(s, { ...card, x: 5.1 + i * (cw + gap), y: 1.5, w: cw, h: 1.55 }));
  addFooter(s, { companyName: m.companyName, slideNumber: m.slideNumber });
  return s;
}

export function buildOpportunitySummarySlide(pptx: pptxgen, m: OpportunitySummarySlideModel) {
  const s = pptx.addSlide();
  addBrandHeader(s, { categoryLabel: "Opportunity Summary", title: m.title ?? "The Identified Opportunities", companyName: m.companyName });
  const cards = m.classifications.slice(0, 4);
  const cw = 5.88;
  const gap = 0.24;
  cards.forEach((card, i) => addValueCard(s, { ...card, x: L.content.left + (i % 2) * (cw + gap), y: 1.35 + Math.floor(i / 2) * 1.78, w: cw, h: 1.58 }));
  if (m.showTotals ?? true) {
    addSummaryBand(s, { x: L.content.left, y: 5.0, w: 12, h: 0.95, metrics: [...(m.monthlyOpportunity ? [m.monthlyOpportunity] : []), m.annualOpportunity].slice(0, 2) });
    if (m.informationalCapital) addDisclaimer(s, { text: `Informational capital value shown separately: ${m.informationalCapital.value} ${m.informationalCapital.label}`, x: L.content.left, y: 6.0, w: 12 });
  }
  addDisclaimer(s, { text: m.disclaimer, x: L.content.left, y: 6.35, w: 12 });
  addFooter(s, { companyName: m.companyName, slideNumber: m.slideNumber });
  return s;
}

export function buildAssumptionsAppendixSlide(pptx: pptxgen, m: AssumptionsAppendixSlideModel) {
  const s = pptx.addSlide();
  addBrandHeader(s, { categoryLabel: "Appendix", title: "Assumptions & Sources", companyName: m.companyName });
  addAssumptionsAppendixTable(s, { modules: m.modules, sources: m.sources, x: L.content.left, y: 1.4, w: 12 });
  addFooter(s, { companyName: m.companyName, slideNumber: m.slideNumber });
  return s;
}

export function buildInvestmentReturnSlide(pptx: pptxgen, m: InvestmentReturnSlideModel) {
  const s = pptx.addSlide();
  addBrandHeader(s, { categoryLabel: "Planning Analysis", title: "Investment & Return Analysis", companyName: m.companyName });
  s.addText(m.explanationText, { x: L.content.left, y: 1.28, w: 11.7, h: 0.62, fontSize: 14.5, color: c.charcoal, fit: "shrink", breakLine: false });

  const chart = { x: L.content.left, y: 2.12, w: 6.7, h: 3.95 };
  const tableX = 8.15;
  const chartTableGutter = tableX - (chart.x + chart.w);
  s.addShape("rect", { x: chart.x, y: chart.y, w: chart.w, h: chart.h, fill: { color: c.white, transparency: 100 }, line: { color: c.white, transparency: 100 } });
  const points = [...m.cumulativeCashFlowPoints];
  if (points.length > 1) {
    const min = Math.min(0, ...points.map((p) => p.cumulativeNetCashFlow));
    const max = Math.max(0, ...points.map((p) => p.cumulativeNetCashFlow));
    const span = max - min || 1;
    const xFor = (month: number) => chart.x + 0.35 + (month / Math.max(points[points.length - 1].month, 1)) * (chart.w - 0.7);
    const yFor = (value: number) => chart.y + 0.22 + ((max - value) / span) * (chart.h - 0.55);
    const zeroY = yFor(0);
    s.addShape("line", { x: chart.x + 0.25, y: zeroY, w: chart.w - 0.5, h: 0, line: { color: c.sunriseGold, width: 1, transparency: 20 } });
    s.addText("Break-even", { x: chart.x + chart.w - 1.2, y: zeroY - 0.16, w: 0.9, h: 0.14, fontSize: 7.5, color: c.mutedText, align: "right" });
    for (let i = 1; i < points.length; i += 1) {
      const prev = points[i - 1];
      const cur = points[i];
      s.addShape("line", { x: xFor(prev.month), y: yFor(prev.cumulativeNetCashFlow), w: xFor(cur.month) - xFor(prev.month), h: yFor(cur.cumulativeNetCashFlow) - yFor(prev.cumulativeNetCashFlow), line: { color: c.templateBlue, width: 1.7 } });
    }
    if (m.paybackMonths !== null) {
      const px = xFor(m.paybackMonths);
      s.addShape("line", { x: px, y: chart.y + 0.25, w: 0, h: chart.h - 0.55, line: { color: c.forest, width: 1 } });
      s.addText(`Estimated Payback: ${m.paybackDisplay}`, { x: Math.min(px + 0.08, chart.x + chart.w - 2.25), y: chart.y + 0.32, w: 2.1, h: 0.18, fontSize: 8.5, bold: true, color: c.forest, fit: "shrink" });
    } else {
      s.addText(`Estimated Payback: ${m.paybackDisplay}`, { x: chart.x + 0.35, y: chart.y + chart.h - 0.34, w: chart.w - 0.7, h: 0.18, fontSize: 8.2, color: c.mutedText, fit: "shrink" });
    }
  }

  if (chartTableGutter < 0.35) throw new Error("Investment return chart/table gutter must be at least 0.35 inches.");
  const rows: { text: string; options?: { bold?: boolean; color?: string; fontSize?: number; fill?: unknown } }[][] = [
    [{ text: "Financial Measure", options: { bold: true, color: c.white, fill: { color: c.midnight }, fontSize: 12 } }, { text: "Analysis Result", options: { bold: true, color: c.white, fill: { color: c.midnight }, fontSize: 12 } }],
    [{ text: "Initial Investment", options: { fontSize: 10.5 } }, { text: m.initialInvestment, options: { bold: true, fontSize: 11 } }],
    [{ text: "Annual Recurring Investment", options: { fontSize: 10.5 } }, { text: m.annualRecurringInvestment, options: { bold: true, fontSize: 11 } }],
    [{ text: "First-Year ROI", options: { fontSize: 10.5 } }, { text: m.firstYearROI, options: { bold: true, fontSize: 11 } }],
    [{ text: "Estimated Payback", options: { fontSize: 10.5 } }, { text: m.paybackDisplay, options: { bold: true, fontSize: 11 } }],
    [{ text: `${m.horizonYears}-Year ROI`, options: { fontSize: 10.5 } }, { text: m.horizonROI, options: { bold: true, fontSize: 11 } }],
    [{ text: "Net Present Value", options: { fontSize: 10.5 } }, { text: m.netPresentValue, options: { bold: true, fontSize: 11 } }],
    [{ text: "Internal Rate of Return", options: { fontSize: 10.5 } }, { text: m.internalRateOfReturn, options: { bold: true, fontSize: 11 } }],
  ];
  rows.forEach((row, index) => {
    const y = 2.12 + index * 0.34;
    const isHeader = index === 0;
    const fills = isHeader ? c.midnight : c.white;
    s.addShape("rect", { x: tableX, y, w: 2.25, h: 0.34, fill: { color: fills }, line: { color: c.softBorder, width: 0.4 } });
    s.addShape("rect", { x: tableX + 2.25, y, w: 2.0, h: 0.34, fill: { color: fills }, line: { color: c.softBorder, width: 0.4 } });
    row.forEach((cell, cellIndex) => {
      const text = cell.text;
      const options = cell.options ?? {};
      s.addText(text, { x: tableX + (cellIndex === 0 ? 0.08 : 2.33), y: y + 0.08, w: cellIndex === 0 ? 2.08 : 1.84, h: 0.14, fontFace: T.typography.bodyFont, fontSize: Number(options.fontSize ?? 10.2), bold: Boolean(options.bold), color: isHeader ? c.white : String(options.color ?? c.charcoal), fit: "shrink", margin: 0 });
    });
  });
  s.addText("Benefit Realization", { x: tableX, y: 5.08, w: 4.25, h: 0.18, fontSize: 11.5, bold: true, color: c.midnight });
  s.addText(m.adoptionSchedule.map((row) => `Year ${row.year} — ${row.display}`).join("\n"), { x: tableX, y: 5.35, w: 4.25, h: 0.62, fontSize: 9.5, color: c.charcoal, breakLine: false, fit: "shrink" });
  addDisclaimer(s, { text: m.methodologyNote, x: L.content.left, y: 6.48, w: 11.75 });
  addFooter(s, { companyName: m.companyName, slideNumber: m.slideNumber });
  return s;
}
