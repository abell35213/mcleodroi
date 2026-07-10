import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { PresentationSnapshot } from "@/lib/presentation/types";
import { buildPresentationExportModel, type ExportMetric } from "./model";

const MIDNIGHT = rgb(0x0b / 255, 0x1d / 255, 0x33 / 255);
const GOLD = rgb(0xd8 / 255, 0x9b / 255, 0x2b / 255);
const WHITE = rgb(1, 1, 1);
const CANVAS = rgb(0xf8 / 255, 0xf1 / 255, 0xe4 / 255);
const MUTED = rgb(0x62 / 255, 0x70 / 255, 0x85 / 255);
const FOREST = rgb(0x28 / 255, 0x61 / 255, 0x4a / 255);

const PAGE_WIDTH = 612; // US Letter, 72dpi
const PAGE_HEIGHT = 792;
const MARGIN = 54;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
/** Fixed epoch keeps generated PDFs byte-stable across runs of one snapshot. */
const FIXED_DATE = new Date(0);

type Fonts = { regular: PDFFont; bold: PDFFont };

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\n+/)) {
    let current = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    lines.push(current);
  }
  return lines;
}

function decodeDataUri(dataUri: string): { mime: string; bytes: Uint8Array } | null {
  const match = /^data:([^;]+);base64,([\s\S]*)$/.exec(dataUri);
  if (!match) return null;
  return { mime: match[1], bytes: Uint8Array.from(Buffer.from(match[2], "base64")) };
}

/** Cursor-based writer that lays out flowing content and adds pages as needed. */
class PdfWriter {
  page: PDFPage;
  y: number;
  constructor(private doc: PDFDocument, private fonts: Fonts) {
    this.page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.y = PAGE_HEIGHT - MARGIN;
  }
  private ensure(space: number) {
    if (this.y - space < MARGIN) {
      this.page = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      this.y = PAGE_HEIGHT - MARGIN;
    }
  }
  heading(text: string, size = 16) {
    this.ensure(size + 12);
    this.y -= size;
    this.page.drawText(text, { x: MARGIN, y: this.y, size, font: this.fonts.bold, color: MIDNIGHT });
    this.y -= 6;
  }
  paragraph(text: string, size = 11, color = rgb(0.2, 0.27, 0.36)) {
    for (const line of wrapText(text, this.fonts.regular, size, CONTENT_WIDTH)) {
      this.ensure(size + 4);
      this.y -= size + 2;
      this.page.drawText(line, { x: MARGIN, y: this.y, size, font: this.fonts.regular, color });
    }
  }
  labelledMetric(metric: ExportMetric) {
    this.ensure(30);
    this.y -= 12;
    this.page.drawText(metric.label.toUpperCase(), { x: MARGIN, y: this.y, size: 8, font: this.fonts.bold, color: MUTED });
    this.y -= 14;
    const suffix = metric.note ? `   (${metric.note})` : "";
    this.page.drawText(`${metric.value}${suffix}`, { x: MARGIN, y: this.y, size: 14, font: this.fonts.bold, color: FOREST });
    this.y -= 4;
  }
  gap(space = 10) {
    this.y -= space;
  }
}

/**
 * Render a branded PDF (executive one-pager followed by the full value story)
 * from the immutable snapshot, so the PDF and PPTX never diverge. Rendered
 * locally with pdf-lib — no cloud print service (Phase 4.1). Output is
 * deterministic for byte-stability.
 */
export async function renderPresentationPdf(snapshot: PresentationSnapshot): Promise<Uint8Array> {
  const model = buildPresentationExportModel(snapshot);
  const doc = await PDFDocument.create();
  doc.setTitle(`${model.companyName} Business Impact Analysis`);
  doc.setAuthor("McLeod Software");
  doc.setProducer("McLeod ROI Builder");
  doc.setCreator("McLeod ROI Builder");
  doc.setCreationDate(FIXED_DATE);
  doc.setModificationDate(FIXED_DATE);
  const fonts: Fonts = { regular: await doc.embedFont(StandardFonts.Helvetica), bold: await doc.embedFont(StandardFonts.HelveticaBold) };

  // Executive one-pager: branded cover band + headline + summary/ROI metrics.
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 150, width: PAGE_WIDTH, height: 150, color: MIDNIGHT });
  page.drawText(`${model.businessTypeLabel.toUpperCase()} VALUE ANALYSIS`, { x: MARGIN, y: PAGE_HEIGHT - 60, size: 10, font: fonts.bold, color: GOLD });
  page.drawText(model.companyName, { x: MARGIN, y: PAGE_HEIGHT - 92, size: 26, font: fonts.bold, color: WHITE });
  page.drawText(`Prepared by ${model.preparedBy}  ·  ${model.analysisDate}`, { x: MARGIN, y: PAGE_HEIGHT - 118, size: 11, font: fonts.regular, color: WHITE });

  if (model.logoDataUri) {
    const decoded = decodeDataUri(model.logoDataUri);
    if (decoded && (decoded.mime === "image/png" || decoded.mime === "image/jpeg")) {
      try {
        const image = decoded.mime === "image/png" ? await doc.embedPng(decoded.bytes) : await doc.embedJpg(decoded.bytes);
        const scaled = image.scaleToFit(120, 54);
        page.drawImage(image, { x: PAGE_WIDTH - MARGIN - scaled.width, y: PAGE_HEIGHT - 60 - scaled.height / 2, width: scaled.width, height: scaled.height });
      } catch {
        // Ignore malformed images; the PDF still renders without the logo.
      }
    }
  }

  let y = PAGE_HEIGHT - 200;
  page.drawRectangle({ x: MARGIN, y: y - 80, width: CONTENT_WIDTH, height: 96, color: CANVAS });
  page.drawText(model.headline.label.toUpperCase(), { x: MARGIN + 16, y: y - 12, size: 10, font: fonts.bold, color: FOREST });
  page.drawText(model.headline.value, { x: MARGIN + 16, y: y - 52, size: 34, font: fonts.bold, color: MIDNIGHT });
  y -= 120;

  const drawMetricRow = (metrics: ExportMetric[]) => {
    if (metrics.length === 0) return;
    const columns = Math.min(3, metrics.length);
    const columnWidth = CONTENT_WIDTH / columns;
    metrics.forEach((metric, index) => {
      const column = index % columns;
      if (column === 0 && index > 0) y -= 52;
      const x = MARGIN + column * columnWidth;
      page.drawText(metric.label.toUpperCase(), { x, y, size: 8, font: fonts.bold, color: MUTED });
      page.drawText(metric.value, { x, y: y - 16, size: 15, font: fonts.bold, color: MIDNIGHT });
      if (metric.note) page.drawText(metric.note, { x, y: y - 30, size: 9, font: fonts.regular, color: MUTED });
    });
    y -= 64;
  };

  page.drawText("EXECUTIVE SUMMARY", { x: MARGIN, y, size: 11, font: fonts.bold, color: MIDNIGHT });
  y -= 24;
  drawMetricRow(model.summaryMetrics);
  if (model.roiMetrics.length) {
    page.drawText("RETURN ON INVESTMENT", { x: MARGIN, y, size: 11, font: fonts.bold, color: MIDNIGHT });
    y -= 24;
    drawMetricRow(model.roiMetrics);
  }
  if (model.valueTypeCards.length) {
    page.drawText("VALUE TYPE BREAKDOWN", { x: MARGIN, y, size: 11, font: fonts.bold, color: MIDNIGHT });
    y -= 20;
    for (const card of model.valueTypeCards) {
      if (y < MARGIN + 20) break;
      page.drawText(`${card.value}  ·  ${card.label}${card.note ? `  (${card.note})` : ""}`, { x: MARGIN, y, size: 10, font: fonts.regular, color: rgb(0.2, 0.27, 0.36) });
      y -= 16;
    }
  }

  // Full value story on subsequent pages.
  const writer = new PdfWriter(doc, fonts);
  writer.heading("Value Story", 20);
  writer.gap(6);
  for (const category of model.categories) {
    writer.heading(category.name, 15);
    for (const module of category.modules) {
      writer.heading(module.moduleName, 13);
      writer.labelledMetric({ label: module.metricLabel, value: module.metricValue });
      writer.gap(4);
      if (module.narrative) writer.paragraph(module.narrative);
      if (module.valueNarrative) {
        writer.gap(4);
        writer.paragraph(module.valueNarrative);
      }
      if (module.disclaimer) writer.paragraph(module.disclaimer, 8, MUTED);
      writer.gap(12);
    }
  }
  if (model.overlapNotices.length) {
    writer.heading("Overlap Notices", 15);
    for (const notice of model.overlapNotices) writer.paragraph(`• ${notice}`, 10, MUTED);
  }

  return doc.save();
}
