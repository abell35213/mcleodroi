import pptxgen from "pptxgenjs";
import { presentationLayout as L } from "@/lib/presentation/layout";
import { presentationTheme as T, requireGoldenPresentationAsset } from "@/lib/presentation/theme";
import type { AssumptionItemModel, AssumptionsAppendixModuleModel, AssumptionsAppendixSourceModel, MetricModel, ValueCardModel } from "@/lib/presentation/types";

const c = T.colors;
const font = T.typography;

export function addCategoryHeader(slide: pptxgen.Slide, o: { label: string; x?: number; y?: number; w?: number }) {
  slide.addText(o.label.toUpperCase(), { x: o.x ?? L.content.left, y: o.y ?? 0.48, w: o.w ?? 5, h: 0.18, fontFace: font.bodyFont, fontSize: 8, bold: true, color: c.templateBlue });
}

export function addFullSlideThemeBackground(slide: pptxgen.Slide, imagePath: string | null = T.assets.themeImagePath) {
  slide.background = { color: c.white };
  if (imagePath) slide.addImage({ path: requireGoldenPresentationAsset(imagePath), x: 0, y: 0, w: L.slide.width, h: L.slide.height });
}

export function addBrandHeader(slide: pptxgen.Slide, o: { categoryLabel: string; title: string; companyName?: string; themeImagePath?: string | null; logoPath?: string | null }) {
  addFullSlideThemeBackground(slide, o.themeImagePath === undefined ? T.assets.themeImagePath : o.themeImagePath);
  addCategoryHeader(slide, { label: o.categoryLabel, x: L.content.left, y: 0.33, w: 4.8 });
  slide.addText(o.title, { x: L.content.left, y: 0.55, w: 9.4, h: 0.42, fontFace: font.headingFont, fontSize: font.slideTitleFontSize, bold: true, color: "000000", margin: 0, fit: "shrink" });
  slide.addShape("line", { x: L.content.left, y: 1.04, w: 1.28, h: 0, line: { color: c.sunriseGold, width: 2.2 } });
  const logoPath = o.logoPath === undefined ? T.assets.logoPath : o.logoPath;
  if (logoPath) slide.addImage({ path: logoPath, x: 10.65, y: 0.45, w: 1.8, h: 0.34, sizing: { type: "contain", w: 1.8, h: 0.34 } });
  else slide.addText("McLeod Software", { x: 10.45, y: 0.48, w: 1.95, h: 0.22, align: "right", fontFace: font.bodyFont, fontSize: 8, bold: true, color: c.charcoal });
  if (o.companyName) slide.addText(o.companyName, { x: 9.0, y: 0.82, w: 3.4, h: 0.16, align: "right", fontSize: 7, color: c.mutedText });
}

export function addFooter(slide: pptxgen.Slide, o: { companyName: string; slideNumber?: number; hideSlideNumber?: boolean }) {
  slide.addShape("line", { x: L.content.left, y: 7.08, w: 11.6, h: 0, line: { color: c.softBorder, width: 0.7 } });
  if (!o.hideSlideNumber && o.slideNumber) slide.addText(String(o.slideNumber), { x: 12.22, y: 7.16, w: 0.35, h: 0.12, fontSize: 7, color: c.mutedText, align: "right" });
}

export function addHeroMetric(slide: pptxgen.Slide, o: MetricModel & { x: number; y: number; w: number; h?: number; variant?: string }) {
  slide.addShape("rect", { x: o.x, y: o.y, w: o.w, h: o.h ?? 1.55, fill: { color: c.white }, line: { color: c.softBorder } });
  slide.addShape("line", { x: o.x + 0.18, y: o.y + 0.18, w: 0.8, h: 0, line: { color: c.sunriseGold, width: 2 } });
  slide.addText(o.value, { x: o.x + 0.18, y: o.y + 0.37, w: o.w - 0.36, h: 0.45, fontFace: font.metricFont, fontSize: o.variant === "capital" ? 28 : 32, bold: true, color: c.midnight, margin: 0 });
  if (o.period) slide.addText(o.period.toUpperCase(), { x: o.x + 0.22, y: o.y + 0.88, w: o.w - 0.4, h: 0.18, fontSize: 9, bold: true, color: c.mutedBlue });
  slide.addText(o.label.toUpperCase(), { x: o.x + 0.2, y: o.y + 1.12, w: o.w - 0.4, h: 0.28, fontSize: 8, bold: true, color: c.charcoal, fit: "shrink" });
  if (o.supportingText) slide.addText(o.supportingText, { x: o.x + 0.2, y: o.y + 1.38, w: o.w - 0.4, h: 0.18, fontSize: 8, color: c.mutedText });
}

export function addAssumptionGrid(slide: pptxgen.Slide, o: { items: AssumptionItemModel[]; x: number; y: number; w: number }) {
  if (o.items.length > 4) throw new Error("Assumption grid supports at most four items.");
  const gap = 0.12;
  const cw = (o.w - gap * (o.items.length - 1)) / Math.max(o.items.length, 1);
  o.items.forEach((it, i) => {
    const x = o.x + i * (cw + gap);
    slide.addShape("rect", { x, y: o.y, w: cw, h: 0.72, fill: { color: c.white }, line: { color: c.softBorder } });
    slide.addText(it.label.toUpperCase(), { x: x + 0.12, y: o.y + 0.12, w: cw - 0.24, h: 0.14, fontSize: 6.7, bold: true, color: c.mutedText, fit: "shrink" });
    slide.addText(it.value, { x: x + 0.12, y: o.y + 0.36, w: cw - 0.24, h: 0.2, fontSize: 11, bold: true, color: c.charcoal, fit: "shrink" });
  });
}

export function addNarrativeBlock(slide: pptxgen.Slide, o: { heading: string; text: string; secondaryText?: string; x: number; y: number; w: number; h: number }) {
  slide.addText(o.heading.toUpperCase(), { x: o.x, y: o.y, w: o.w, h: 0.2, fontSize: 9.5, bold: true, color: c.sunriseGold });
  slide.addText(o.text, { x: o.x, y: o.y + 0.3, w: o.w, h: o.h - 0.34, fontSize: font.minBodyFontSize, color: c.charcoal, breakLine: false, fit: "shrink" });
  if (o.secondaryText) slide.addText(o.secondaryText, { x: o.x, y: o.y + o.h - 0.28, w: o.w, h: 0.22, fontSize: 10, color: c.forest });
}

export function addValueCard(slide: pptxgen.Slide, o: ValueCardModel & { x: number; y: number; w: number; h: number }) {
  slide.addShape("rect", { x: o.x, y: o.y, w: o.w, h: o.h, fill: { color: c.white }, line: { color: c.softBorder } });
  slide.addText(o.title, { x: o.x + 0.16, y: o.y + 0.12, w: o.w - 0.32, h: 0.24, fontSize: 12, bold: true, color: c.charcoal, fit: "shrink" });
  slide.addText(o.value, { x: o.x + 0.16, y: o.y + 0.42, w: o.w - 0.32, h: 0.34, fontSize: 21, bold: true, color: c.midnight, fit: "shrink" });
  if (o.supportingMetric) slide.addText(o.supportingMetric, { x: o.x + 0.16, y: o.y + Math.min(1.32, o.h - 0.28), w: o.w - 0.32, h: 0.18, fontSize: 8, bold: true, color: c.forest, fit: "shrink" });
}

export function addSummaryBand(slide: pptxgen.Slide, o: { metrics: MetricModel[]; x: number; y: number; w: number; h: number }) {
  if (o.metrics.length < 1 || o.metrics.length > 2) throw new Error("Summary band supports one or two metrics.");
  slide.addShape("rect", { x: o.x, y: o.y, w: o.w, h: o.h, fill: { color: c.midnight }, line: { color: c.midnight } });
  const mw = o.w / o.metrics.length;
  o.metrics.forEach((m, i) => {
    const x = o.x + i * mw + 0.25;
    slide.addText(m.value, { x, y: o.y + 0.22, w: mw - 0.5, h: 0.45, fontSize: 28, bold: true, color: c.white, fit: "shrink" });
    slide.addText(m.label.toUpperCase(), { x, y: o.y + 0.75, w: mw - 0.5, h: 0.18, fontSize: 8, bold: true, color: c.sunriseGold, fit: "shrink" });
  });
}

export function addDisclaimer(slide: pptxgen.Slide, o: { text: string; x: number; y: number; w: number }) {
  slide.addText(o.text, { x: o.x, y: o.y, w: o.w, h: 0.32, fontSize: font.minDisclaimerFontSize, color: c.mutedText, fit: "shrink" });
}

export function addAssumptionsAppendixTable(slide: pptxgen.Slide, o: { modules: readonly AssumptionsAppendixModuleModel[]; sources: readonly AssumptionsAppendixSourceModel[]; x: number; y: number; w: number }) {
  const colW = [o.w * 0.35, o.w * 0.18, o.w * 0.24, o.w * 0.23];
  const rowH = 0.34;
  let y = o.y;
  const addCell = (text: string, x: number, w: number, opts: { fill: string; color: string; bold?: boolean; fontSize: number }) => {
    slide.addShape("rect", { x, y, w, h: rowH, fill: { color: opts.fill }, line: { color: c.softBorder, width: 0.5 } });
    slide.addText(text, { x: x + 0.05, y: y + 0.08, w: w - 0.1, h: 0.14, fontFace: font.bodyFont, fontSize: opts.fontSize, bold: opts.bold, color: opts.color, fit: "shrink", margin: 0 });
  };
  ["Assumption", "Entered", "Planning Reference", "Source"].forEach((header, index) => {
    const x = o.x + colW.slice(0, index).reduce((sum, width) => sum + width, 0);
    addCell(header, x, colW[index], { fill: c.midnight, color: c.white, bold: true, fontSize: 12 });
  });
  y += rowH;
  for (const mod of o.modules) {
    addCell(`${mod.categoryName} — ${mod.moduleName}`, o.x, o.w, { fill: c.warmCanvas, color: c.midnight, bold: true, fontSize: 10 });
    y += rowH;
    for (const row of mod.rows) {
      [row.label, row.enteredValue, row.typicalRange, row.sourceLabel].forEach((text, index) => {
        const x = o.x + colW.slice(0, index).reduce((sum, width) => sum + width, 0);
        addCell(text, x, colW[index], { fill: c.white, color: index === 1 ? c.midnight : index === 3 ? c.mutedText : c.charcoal, bold: index === 1, fontSize: 9 });
      });
      y += rowH;
    }
  }
  const legend = o.sources.map((source) => `${source.label}: ${source.citation}`).join("\n");
  if (legend) slide.addText(`Sources — ${legend}`, { x: o.x, y: 6.35, w: o.w, h: 0.6, fontSize: font.minDisclaimerFontSize, color: c.mutedText, fit: "shrink" });
}
