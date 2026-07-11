import type { BusinessType, CategoryKey, NarrativeStatus, OverlapNotice, ProductContext, ValueModuleKey, ValueType } from "@/lib/modules";
import type { InformationalCapitalValue, NarrativeMode, ValueTypeSummary } from "@/lib/analyses/types";
import type { BreakdownData, CumulativeBenefitData, WaterfallData } from "@/lib/analyses/charts";
import type { RoiMetrics } from "@/lib/calculations/roi";
import type { PresentationGenerationStatus } from "@prisma/client";

export type SnapshotScalarMap = Record<string, number | string | boolean | null>;
export type PresentationSnapshotModule = {
  analysisModuleId: string; moduleKey: ValueModuleKey; moduleName: string; categoryKey: CategoryKey; categoryName: string; displayOrder: number; valueType: ValueType; narrativeStatus: NarrativeStatus; narrativeMode: NarrativeMode;
  inputs: SnapshotScalarMap; financialOutputs: SnapshotScalarMap; derivedMetrics: SnapshotScalarMap;
  opportunityHeadline: string; valueNarrative: string; defaultCustomerAnalysis: string; effectiveCustomerAnalysis: string; presentationDisclaimer: string; presentationCallout: string; customNarrativeSourceFingerprint: string | null;
};
export type PresentationSnapshotCategory = { categoryKey: CategoryKey; name: string; displayOrder: number; modules: PresentationSnapshotModule[] };
/** ROI/payback/NPV and value-story charts folded into the snapshot (Phase 4.5). */
export type PresentationSnapshotCharts = {
  waterfall: WaterfallData;
  valueTypeBreakdown: BreakdownData;
  categoryBreakdown: BreakdownData;
  cumulativeBenefit: CumulativeBenefitData | null;
};
export type PresentationSnapshotBranding = { customerLogoPath: string | null; customerLogoDataUri: string | null };
export type PresentationSnapshot = {
  snapshotVersion: string; presentationTemplateVersion: string; narrativeRegistryVersion: string; createdAt: string;
  analysis: { id: string; companyName: string; customerContact: string | null; businessType: BusinessType; productContext: ProductContext; preparedBy: string; analysisDate: string };
  summary: { monthlyRecurringValueTotal: number; annualRecurringValueTotal: number; annualOnlyValueTotal: number; totalIdentifiedAnnualEconomicOpportunity: number; informationalCapitalValueTotal: number; valueTypeBreakdown: readonly ValueTypeSummary[]; informationalCapitalValues: readonly InformationalCapitalValue[] };
  overlapNotices: readonly OverlapNotice[]; categories: PresentationSnapshotCategory[];
  /** Finance-grade ROI folded into the snapshot; `null` when no investment entered. Optional for backward compatibility with 1.0.0 snapshots. */
  roi?: RoiMetrics | null;
  /** Value-story chart datasets rendered identically across PPTX/PDF/HTML. Optional for backward compatibility. */
  charts?: PresentationSnapshotCharts;
  /** Customer logo path and self-contained embedded data URI. Optional for backward compatibility. */
  branding?: PresentationSnapshotBranding;
};
export type PresentationGenerationMetadata = { id: string; analysisId: string; templateVersion: string; filePath: string | null; status: PresentationGenerationStatus; generatedAt: Date };
export type PresentationServiceResult<T> = { ok: true; value: T } | { ok: false; error: { code: string; message: string } };

export type MetricModel = { value: string; period?: string; label: string; supportingText?: string };
export type CoverSlideModel = { companyName: string; analysisDate?: string; preparedBy?: string; titleSlideImagePath?: string | null; slideNumber?: number };
export type ValueCardModel = { title: string; value: string; period?: string; label: string; supportingMetric?: string; valueType?: ValueType };
export type ExecutiveSummarySlideModel = { companyName: string; businessTypeLabel: string; productName: string; categoryNames: string[]; moduleNames: string[]; discussionSummary: string; alignmentSummary: string; keyAreasLeadIn: string; needThemes: { heading: string; bullets: string[] }[]; annualOpportunity: MetricModel; monthlyOpportunity?: MetricModel; slideNumber: number };
export type AssumptionItemModel = { label: string; value: string };
export type SingleModuleSlideModel = { companyName: string; categoryLabel: string; moduleTitle: string; analysisText: string; valueNarrative?: string; effectiveCustomerAnalysis?: string; presentationCallout?: string; heroMetric: MetricModel & { variant?: "standard" | "annual" | "capital" }; assumptions: AssumptionItemModel[]; disclaimer?: string; informationalCapitalCallout?: string; slideNumber: number };
export type DualModuleItemModel = { title: string; primaryMetric: string; period?: string; label: string; supportingMetric?: string; analysisText: string; howMcLeodHelps?: string; customerImpact?: string; disclaimerMarker?: string };
export type DualModuleSlideModel = { companyName: string; categoryLabel: string; title: string; modules: [DualModuleItemModel, DualModuleItemModel]; slideNumber: number };
export type CategoryOverviewSlideModel = { companyName: string; categoryName: string; categoryOpportunity: MetricModel; cards: ValueCardModel[]; slideNumber: number };
export type OpportunitySummarySlideModel = { companyName: string; classifications: ValueCardModel[]; monthlyOpportunity?: MetricModel; annualOpportunity: MetricModel; informationalCapital?: MetricModel; disclaimer: string; slideNumber: number };
export type AssumptionsAppendixRowModel = { label: string; enteredValue: string; typicalRange: string; sourceLabel: string };
export type AssumptionsAppendixModuleModel = { moduleName: string; categoryName: string; rows: readonly AssumptionsAppendixRowModel[] };
export type AssumptionsAppendixSourceModel = { label: string; citation: string };
export type AssumptionsAppendixSlideModel = { companyName: string; modules: readonly AssumptionsAppendixModuleModel[]; sources: readonly AssumptionsAppendixSourceModel[]; slideNumber: number };
