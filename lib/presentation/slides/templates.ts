import pptxgen from "pptxgenjs";
import { presentationLayout as L } from "@/lib/presentation/layout";
import { PROPRIETARY_FOOTER_TEXT, presentationTheme as T } from "@/lib/presentation/theme";
import type { AssumptionsAppendixSlideModel, CategoryOverviewSlideModel, CoverSlideModel, DualModuleSlideModel, ExecutiveSummarySlideModel, OpportunitySummarySlideModel, SingleModuleSlideModel } from "@/lib/presentation/types";
import { addAssumptionGrid, addAssumptionsAppendixTable, addBrandHeader, addDisclaimer, addFooter, addHeroMetric, addNarrativeBlock, addSummaryBand, addValueCard } from "@/lib/presentation/pptx/components";

const c = T.colors;

export function buildCoverSlide(pptx: pptxgen, m: CoverSlideModel) {
  const s = pptx.addSlide();
  const titleImagePath = m.titleSlideImagePath === undefined ? T.assets.titleSlideImagePath : m.titleSlideImagePath;
  const coverLogoPath = m.coverLogoPath === undefined ? T.assets.coverLogoPath : m.coverLogoPath;
  s.background = { color: c.midnight };
  if (titleImagePath) s.addImage({ path: titleImagePath, x: 0, y: 0, w: L.slide.width, h: L.slide.height });
  s.addShape("rect", { x: 0, y: 0, w: 5.05, h: L.slide.height, fill: { color: c.midnight, transparency: 7 }, line: { color: c.midnight, transparency: 100 } });
  if (coverLogoPath) s.addImage({ path: coverLogoPath, x: 0.78, y: 0.66, w: 1.8, h: 0.34, sizing: { type: "contain", w: 1.8, h: 0.34 } });
  if (m.customerLogoDataUri) s.addImage({ data: m.customerLogoDataUri, x: 9.65, y: 0.55, w: 2.6, h: 0.72, sizing: { type: "contain", w: 2.6, h: 0.72 } });
  s.addShape("line", { x: 5.05, y: 0.62, w: 0, h: 5.9, line: { color: c.sunriseGold, width: 2 } });
  s.addText("Business Impact Analysis", { x: 0.76, y: 1.58, w: 3.95, h: 1.16, fontFace: T.typography.headingFont, fontSize: 35, bold: true, color: c.white, fit: "shrink", breakLine: false, margin: 0 });
  s.addShape("line", { x: 0.78, y: 2.92, w: 1.48, h: 0, line: { color: c.sunriseGold, width: 3.2 } });
  s.addText(`Prepared for\n${m.companyName}`, { x: 0.78, y: 3.24, w: 3.75, h: 0.78, fontFace: T.typography.bodyFont, fontSize: 16, color: c.white, breakLine: false, fit: "shrink", margin: 0.02 });
  s.addText(PROPRIETARY_FOOTER_TEXT, { x: 0.78, y: 6.83, w: 4.05, h: 0.18, fontFace: T.typography.bodyFont, fontSize: 7, color: c.white, transparency: 8, fit: "shrink" });
  if (m.analysisDate) s.addText(m.analysisDate, { x: 9.65, y: 6.88, w: 2.6, h: 0.2, align: "right", fontFace: T.typography.bodyFont, fontSize: 9, color: c.white });
  return s;
}

export function buildExecutiveSummarySlide(pptx: pptxgen, m: ExecutiveSummarySlideModel) {
  const s = pptx.addSlide();
  addBrandHeader(s, { categoryLabel: "Executive Summary", title: "Executive Summary", companyName: m.companyName });
  s.addText(m.discussionSummary, { x: L.content.left, y: 1.32, w: 11.05, h: 0.62, fontSize: 13, color: c.charcoal, fit: "shrink", breakLine: false });
  s.addText(m.alignmentSummary, { x: L.content.left, y: 2.08, w: 11.05, h: 0.72, fontSize: 11.5, color: c.charcoal, fit: "shrink", breakLine: false });
  s.addText(m.keyAreasLeadIn, { x: L.content.left, y: 3.0, w: 11.05, h: 0.28, fontSize: 13, bold: true, color: c.midnight, fit: "shrink" });
  const themeY = 3.5;
  m.needThemes.slice(0, 4).forEach((theme, i) => {
    const y = themeY + i * 0.62;
    s.addText(theme.heading, { x: L.content.left, y, w: 3.4, h: 0.22, fontSize: 10.7, bold: true, color: c.midnight, fit: "shrink" });
    s.addText(theme.bullets.slice(0, 2).join("\n"), { x: 3.86, y: y - 0.02, w: 8.12, h: 0.48, fontSize: 9.1, color: c.charcoal, bullet: { type: "bullet" }, fit: "shrink", breakLine: false });
  });
  addSummaryBand(s, { x: L.content.left, y: 6.22, w: 11.55, h: 0.58, metrics: [m.annualOpportunity, ...(m.monthlyOpportunity ? [m.monthlyOpportunity] : [])] });
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
  addBrandHeader(s, { categoryLabel: "Opportunity Summary", title: "The Identified Opportunity", companyName: m.companyName });
  const cards = m.classifications.slice(0, 6);
  const cw = 3.82;
  const gap = 0.18;
  cards.forEach((card, i) => addValueCard(s, { ...card, x: L.content.left + (i % 3) * (cw + gap), y: 1.45 + Math.floor(i / 3) * 1.55, w: cw, h: 1.3 }));
  addSummaryBand(s, { x: L.content.left, y: 4.7, w: 12, h: 1.0, metrics: [...(m.monthlyOpportunity ? [m.monthlyOpportunity] : []), m.annualOpportunity].slice(0, 2) });
  if (m.informationalCapital) addDisclaimer(s, { text: `Informational capital value shown separately: ${m.informationalCapital.value} ${m.informationalCapital.label}`, x: L.content.left, y: 5.9, w: 12 });
  addDisclaimer(s, { text: m.disclaimer, x: L.content.left, y: 6.28, w: 12 });
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
