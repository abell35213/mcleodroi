import pptxgen from "pptxgenjs";
import { presentationLayout as L } from "@/lib/presentation/layout";
import { presentationTheme as T } from "@/lib/presentation/theme";
import type { CategoryOverviewSlideModel, CoverSlideModel, DualModuleSlideModel, ExecutiveSummarySlideModel, OpportunitySummarySlideModel, SingleModuleSlideModel } from "@/lib/presentation/types";
import { addAssumptionGrid, addBrandHeader, addDisclaimer, addFooter, addHeroMetric, addNarrativeBlock, addSummaryBand, addValueCard } from "@/lib/presentation/pptx/components";

const c = T.colors;

export function buildCoverSlide(pptx: pptxgen, m: CoverSlideModel) {
  const s = pptx.addSlide();
  const logoPath = m.coverLogoPath ?? T.assets.coverLogoPath;
  s.background = { color: c.midnight };
  if (m.themeImagePath) s.addImage({ path: m.themeImagePath, x: 0, y: 0, w: L.slide.width, h: L.slide.height, transparency: 25 });
  s.addShape("rect", { x: 0, y: 0, w: L.slide.width, h: L.slide.height, fill: { color: c.midnight, transparency: 12 }, line: { color: c.midnight } });
  if (logoPath) s.addImage({ path: logoPath, x: 0.82, y: 0.62, w: 1.95, h: 0.62, sizing: { type: "contain", w: 1.95, h: 0.62 } });
  s.addText("BUSINESS IMPACT ANALYSIS", { x: 0.8, y: 2.18, w: 8.3, h: 0.58, fontSize: T.typography.coverTitleFontSize, bold: true, color: c.white, fit: "shrink" });
  s.addShape("line", { x: 0.82, y: 2.95, w: 1.35, h: 0, line: { color: c.sunriseGold, width: 3 } });
  s.addText(`Prepared for:\n${m.companyName}`, { x: 0.82, y: 3.28, w: 6.2, h: 0.82, fontSize: 19, color: c.white, breakLine: false, fit: "shrink" });
  if (!logoPath) s.addText("McLeod Software", { x: 0.82, y: 6.55, w: 3, h: 0.25, fontSize: 12, bold: true, color: c.white });
  if (m.analysisDate) s.addText(m.analysisDate, { x: 9.8, y: 6.55, w: 2.5, h: 0.2, align: "right", fontSize: 9, color: c.white });
  return s;
}

export function buildExecutiveSummarySlide(pptx: pptxgen, m: ExecutiveSummarySlideModel) {
  if (m.cards.length > 4) throw new Error("Executive summary supports at most four cards.");
  const s = pptx.addSlide();
  addBrandHeader(s, { categoryLabel: "Executive Summary", title: "Identified Economic Opportunity", companyName: m.companyName });
  addSummaryBand(s, { x: L.content.left, y: 1.5, w: 12, h: 1.08, metrics: [m.annualOpportunity, ...(m.monthlyOpportunity ? [m.monthlyOpportunity] : [])] });
  const gap = 0.2;
  const cw = (12 - gap * (Math.max(m.cards.length, 1) - 1)) / Math.max(m.cards.length, 1);
  m.cards.forEach((card, i) => addValueCard(s, { ...card, x: L.content.left + i * (cw + gap), y: 3.12, w: cw, h: 1.65 }));
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
