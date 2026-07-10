import pptxgen from "pptxgenjs";
import { presentationLayout as L } from "@/lib/presentation/layout";
import { PROPRIETARY_FOOTER_TEXT, presentationTheme as T } from "@/lib/presentation/theme";
import type { CategoryOverviewSlideModel, CoverSlideModel, DualModuleSlideModel, ExecutiveSummarySlideModel, OpportunitySummarySlideModel, SingleModuleSlideModel } from "@/lib/presentation/types";
import { addAssumptionGrid, addBrandHeader, addDisclaimer, addFooter, addHeroMetric, addNarrativeBlock, addSummaryBand, addValueCard } from "@/lib/presentation/pptx/components";

const c = T.colors;

export function buildCoverSlide(pptx: pptxgen, m: CoverSlideModel) {
  const s = pptx.addSlide();
  const logoPath = m.coverLogoPath === undefined ? T.assets.coverLogoPath : m.coverLogoPath;
  s.background = { color: c.midnight };
  if (m.themeImagePath) s.addImage({ path: m.themeImagePath, x: 0, y: 0, w: L.slide.width, h: L.slide.height, transparency: 18 });
  s.addShape("rect", { x: 0, y: 0, w: L.slide.width, h: L.slide.height, fill: { color: c.midnight, transparency: 15 }, line: { color: c.midnight } });
  s.addShape("rect", { x: 0, y: 0, w: 4.25, h: L.slide.height, fill: { color: c.midnight, transparency: 5 }, line: { color: c.midnight } });
  s.addShape("line", { x: 4.25, y: 0.55, w: 0, h: 5.95, line: { color: c.sunriseGold, width: 1.4 } });
  if (logoPath) s.addImage({ path: logoPath, x: 0.72, y: 5.82, w: 2.25, h: 0.65, sizing: { type: "contain", w: 2.25, h: 0.65 } });
  s.addText("Business Impact Analysis", { x: 0.72, y: 1.68, w: 3.3, h: 1.1, fontSize: T.typography.coverTitleFontSize, bold: true, color: c.white, fit: "shrink", breakLine: false });
  s.addShape("line", { x: 0.72, y: 2.98, w: 1.35, h: 0, line: { color: c.sunriseGold, width: 3 } });
  s.addText(`Prepared for\n${m.companyName}`, { x: 0.72, y: 3.28, w: 3.2, h: 0.72, fontSize: 16, color: c.white, breakLine: false, fit: "shrink" });
  s.addText(PROPRIETARY_FOOTER_TEXT, { x: 0.72, y: 6.95, w: 3.7, h: 0.16, fontSize: 7, color: c.white, transparency: 10, fit: "shrink" });
  if (m.analysisDate) s.addText(m.analysisDate, { x: 9.65, y: 6.9, w: 2.6, h: 0.2, align: "right", fontSize: 9, color: c.white });
  return s;
}

export function buildExecutiveSummarySlide(pptx: pptxgen, m: ExecutiveSummarySlideModel) {
  const s = pptx.addSlide();
  addBrandHeader(s, { categoryLabel: "Executive Summary", title: "Executive Summary", companyName: m.companyName, themeImagePath: T.assets.themeImagePath });
  s.addText(m.discussionSummary, { x: L.content.left, y: 1.35, w: 11.1, h: 0.62, fontSize: 12.5, color: c.charcoal, fit: "shrink", breakLine: false });
  s.addText("During our discussions…", { x: L.content.left, y: 2.18, w: 5.35, h: 0.24, fontSize: 12.5, bold: true, underline: { style: "sng" }, color: "000000" });
  s.addText(`The selected business-impact opportunities centered on ${m.moduleNames.slice(0, 6).join(", ")}${m.moduleNames.length > 6 ? ", and related areas" : ""}. These opportunities are grouped across ${m.categoryNames.join(", ")} for ${m.companyName}.`, { x: L.content.left, y: 2.5, w: 5.35, h: 0.88, fontSize: 11.3, color: c.charcoal, fit: "shrink" });
  s.addText("McLeod’s platform addresses your key areas of need by…", { x: 6.85, y: 2.18, w: 5.25, h: 0.38, fontSize: 12.5, bold: true, underline: { style: "sng" }, color: "000000", fit: "shrink" });
  s.addText(m.alignmentSummary, { x: 6.85, y: 2.62, w: 5.25, h: 0.76, fontSize: 11.3, color: c.charcoal, fit: "shrink" });
  const themeY = 3.72;
  m.needThemes.slice(0, 3).forEach((theme, i) => {
    const y = themeY + i * 0.72;
    s.addText(theme.heading, { x: L.content.left, y, w: 3.45, h: 0.18, fontSize: 10.3, bold: true, underline: { style: "sng" }, color: "000000", fit: "shrink" });
    s.addText(theme.bullets.join("\n"), { x: 3.75, y: y - 0.02, w: 8.35, h: 0.46, fontSize: 8.8, color: c.charcoal, bullet: { type: "bullet" }, fit: "shrink" });
  });
  addSummaryBand(s, { x: L.content.left, y: 6.05, w: 11.55, h: 0.7, metrics: [m.annualOpportunity, ...(m.monthlyOpportunity ? [m.monthlyOpportunity] : [])] });
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
