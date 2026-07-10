import { formatPresentationCurrency, formatPresentationPercentage } from "@/lib/presentation/format";
import type { PresentationSnapshot } from "@/lib/presentation/types";

/** A single labelled metric shown in exec summary / ROI blocks. */
export type ExportMetric = { label: string; value: string; note?: string };

/** One module's value story rendered identically across PDF and HTML. */
export type ExportModule = {
  categoryName: string;
  moduleName: string;
  opportunityHeadline: string;
  metricLabel: string;
  metricValue: string;
  narrative: string;
  valueNarrative: string;
  disclaimer: string;
};

/** Structured, format-agnostic view model derived from the immutable snapshot. */
export type PresentationExportModel = {
  companyName: string;
  preparedBy: string;
  analysisDate: string;
  businessTypeLabel: string;
  logoDataUri: string | null;
  headline: ExportMetric;
  summaryMetrics: ExportMetric[];
  roiMetrics: ExportMetric[];
  valueTypeCards: ExportMetric[];
  categories: { name: string; modules: ExportModule[] }[];
  informationalCapital: ExportMetric[];
  informationalCapitalTotal: number;
  overlapNotices: string[];
  snapshotVersion: string;
  createdAt: string;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

function moduleMetric(module: PresentationSnapshot["categories"][number]["modules"][number]): { label: string; value: string } {
  const outputs = module.financialOutputs;
  const monthly = outputs.monthlyRecurringValue;
  const annualOnly = outputs.annualOnlyValue;
  const capital = outputs.informationalCapitalValue;
  if (typeof monthly === "number") return { label: "Monthly recurring value", value: `${formatPresentationCurrency(monthly)} / month` };
  if (typeof annualOnly === "number") return { label: "Annual value", value: `${formatPresentationCurrency(annualOnly)} / year` };
  if (typeof capital === "number") return { label: "Potential avoided capital", value: formatPresentationCurrency(capital) };
  const annualRecurring = outputs.annualRecurringValue;
  return { label: "Annual recurring value", value: typeof annualRecurring === "number" ? formatPresentationCurrency(annualRecurring) : "—" };
}

/**
 * Build the shared export view model from a presentation snapshot. Pure and
 * deterministic so the PDF, HTML, and (already) PPTX outputs derive from one
 * immutable source and never diverge.
 */
export function buildPresentationExportModel(snapshot: PresentationSnapshot): PresentationExportModel {
  const summary = snapshot.summary;
  const summaryMetrics: ExportMetric[] = [
    { label: "Recurring economic opportunity", value: `${formatPresentationCurrency(summary.monthlyRecurringValueTotal)} / month` },
    { label: "Annual recurring value", value: formatPresentationCurrency(summary.annualRecurringValueTotal) },
  ];
  if (summary.annualOnlyValueTotal > 0) summaryMetrics.push({ label: "Annual-only cost avoidance", value: formatPresentationCurrency(summary.annualOnlyValueTotal) });

  const roi = snapshot.roi ?? null;
  const roiMetrics: ExportMetric[] = roi
    ? [
        { label: "Payback", value: roi.paybackMonths === null ? "Does not recoup" : `${roi.paybackMonths.toFixed(1)} months` },
        { label: `${roi.horizonYears}-year ROI`, value: formatPresentationPercentage(roi.horizonRoiPct) },
        { label: "Net present value", value: formatPresentationCurrency(roi.npv) },
      ]
    : [];

  const valueTypeCards: ExportMetric[] = snapshot.charts?.valueTypeBreakdown.segments.map((segment) => ({
    label: segment.label,
    value: formatPresentationCurrency(segment.value),
    note: formatPresentationPercentage(segment.share),
  })) ?? [];

  const categories = [...snapshot.categories]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((category) => ({
      name: category.name,
      modules: [...category.modules]
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((module): ExportModule => {
          const metric = moduleMetric(module);
          return {
            categoryName: category.name,
            moduleName: module.moduleName,
            opportunityHeadline: module.opportunityHeadline,
            metricLabel: metric.label,
            metricValue: metric.value,
            narrative: module.effectiveCustomerAnalysis,
            valueNarrative: module.valueNarrative,
            disclaimer: module.presentationDisclaimer,
          };
        }),
    }));

  return {
    companyName: snapshot.analysis.companyName,
    preparedBy: snapshot.analysis.preparedBy,
    analysisDate: formatDate(snapshot.analysis.analysisDate),
    businessTypeLabel: snapshot.analysis.businessType === "BROKERAGE" ? "Brokerage" : "Truckload",
    logoDataUri: snapshot.branding?.customerLogoDataUri ?? null,
    headline: { label: "Annual Identified Economic Opportunity", value: formatPresentationCurrency(summary.totalIdentifiedAnnualEconomicOpportunity) },
    summaryMetrics,
    roiMetrics,
    valueTypeCards,
    categories,
    informationalCapital: summary.informationalCapitalValues.map((entry) => ({ label: entry.moduleKey, value: formatPresentationCurrency(entry.value) })),
    informationalCapitalTotal: summary.informationalCapitalValueTotal,
    overlapNotices: snapshot.overlapNotices.map((notice) => notice.message),
    snapshotVersion: snapshot.snapshotVersion,
    createdAt: snapshot.createdAt,
  };
}
