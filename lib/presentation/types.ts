import type { BusinessType, CategoryKey, NarrativeStatus, OverlapNotice, ProductContext, ValueModuleKey, ValueType } from "@/lib/modules";
import type { InformationalCapitalValue, NarrativeMode, ValueTypeSummary } from "@/lib/analyses/types";

export type SnapshotScalarMap = Record<string, number | string | boolean | null>;
export type PresentationSnapshotModule = {
  analysisModuleId: string; moduleKey: ValueModuleKey; moduleName: string; categoryKey: CategoryKey; categoryName: string; displayOrder: number; valueType: ValueType; narrativeStatus: NarrativeStatus; narrativeMode: NarrativeMode;
  inputs: SnapshotScalarMap; financialOutputs: SnapshotScalarMap; derivedMetrics: SnapshotScalarMap;
  opportunityHeadline: string; valueNarrative: string; defaultCustomerAnalysis: string; effectiveCustomerAnalysis: string; presentationDisclaimer: string; presentationCallout: string; customNarrativeSourceFingerprint: string | null;
};
export type PresentationSnapshotCategory = { categoryKey: CategoryKey; name: string; displayOrder: number; modules: PresentationSnapshotModule[] };
export type PresentationSnapshot = {
  snapshotVersion: string; presentationTemplateVersion: string; narrativeRegistryVersion: string; createdAt: string;
  analysis: { id: string; companyName: string; customerContact: string | null; businessType: BusinessType; productContext: ProductContext; preparedBy: string; analysisDate: string };
  summary: { monthlyRecurringValueTotal: number; annualRecurringValueTotal: number; annualOnlyValueTotal: number; totalIdentifiedAnnualEconomicOpportunity: number; informationalCapitalValueTotal: number; valueTypeBreakdown: readonly ValueTypeSummary[]; informationalCapitalValues: readonly InformationalCapitalValue[] };
  overlapNotices: readonly OverlapNotice[]; categories: PresentationSnapshotCategory[];
};
export type PresentationGenerationMetadata = { id: string; analysisId: string; templateVersion: string; filePath: string | null; status: string; generatedAt: Date };
export type PresentationServiceResult<T> = { ok: true; value: T } | { ok: false; error: { code: string; message: string } };

export type MetricModel = { value: string; period?: string; label: string; supportingText?: string };
export type CoverSlideModel = { companyName: string; analysisDate?: string; preparedBy?: string; themeImagePath?: string | null; slideNumber?: number };
export type ValueCardModel = { title: string; value: string; period?: string; label: string; supportingMetric?: string; valueType?: ValueType };
export type ExecutiveSummarySlideModel = { companyName: string; annualOpportunity: MetricModel; monthlyOpportunity?: MetricModel; cards: ValueCardModel[]; slideNumber: number };
export type AssumptionItemModel = { label: string; value: string };
export type SingleModuleSlideModel = { companyName: string; categoryLabel: string; moduleTitle: string; analysisText: string; heroMetric: MetricModel & { variant?: "standard" | "annual" | "capital" }; assumptions: AssumptionItemModel[]; disclaimer?: string; informationalCapitalCallout?: string; slideNumber: number };
export type DualModuleItemModel = { title: string; primaryMetric: string; period?: string; label: string; supportingMetric?: string; analysisText: string; disclaimerMarker?: string };
export type DualModuleSlideModel = { companyName: string; categoryLabel: string; title: string; modules: [DualModuleItemModel, DualModuleItemModel]; slideNumber: number };
export type CategoryOverviewSlideModel = { companyName: string; categoryName: string; categoryOpportunity: MetricModel; cards: ValueCardModel[]; slideNumber: number };
export type OpportunitySummarySlideModel = { companyName: string; classifications: ValueCardModel[]; monthlyOpportunity?: MetricModel; annualOpportunity: MetricModel; informationalCapital?: MetricModel; disclaimer: string; slideNumber: number };
