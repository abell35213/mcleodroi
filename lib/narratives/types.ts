import type { BusinessType, NarrativeStatus, ProductContext, ValueModuleDefinition, ValueModuleKey } from "@/lib/modules";
import type { ModuleInputMap, ModuleResultMap } from "@/lib/calculations";
import type { CalculatedAnalysis, CalculatedAnalysisModule, NarrativeMode } from "@/lib/analyses/types";

export type NarrativeRenderContext<K extends ValueModuleKey = ValueModuleKey> = {
  readonly companyName: string;
  readonly businessType: BusinessType;
  readonly productContext: ProductContext;
  readonly module: ValueModuleDefinition;
  readonly inputs: ModuleInputMap[K];
  readonly result: ModuleResultMap[K];
};

type NarrativeText<K extends ValueModuleKey> = string | ((context: NarrativeRenderContext<K>) => string);

export type NarrativeVariantFor<K extends ValueModuleKey> = {
  readonly moduleKey: K;
  readonly productContext: ProductContext;
  readonly opportunityHeadline: NarrativeText<K>;
  readonly valueNarrative: NarrativeText<K>;
  readonly customerAnalysis: (context: NarrativeRenderContext<K>) => string;
  readonly fullDisclaimer: NarrativeText<K>;
  readonly presentationDisclaimer: NarrativeText<K>;
  readonly presentationCallout: (context: NarrativeRenderContext<K>) => string;
  readonly status: NarrativeStatus;
};

export type NarrativeVariant = { [K in ValueModuleKey]: NarrativeVariantFor<K> }[ValueModuleKey];

export type RenderedModuleNarrative = {
  readonly moduleKey: ValueModuleKey;
  readonly productContext: ProductContext;
  readonly status: NarrativeStatus;
  readonly opportunityHeadline: string;
  readonly valueNarrative: string;
  readonly customerAnalysis: string;
  readonly fullDisclaimer: string;
  readonly presentationDisclaimer: string;
  readonly presentationCallout: string;
};

export type PresentationModuleNarrative = Omit<RenderedModuleNarrative, "fullDisclaimer"> & {
  readonly effectiveAnalysis: string;
};

export const narrativeErrorCodes = ["NARRATIVE_VARIANT_NOT_FOUND", "MODULE_NOT_COMPLETE", "CALCULATION_NOT_SUCCESSFUL", "ANALYSIS_NOT_REVIEW_READY", "CUSTOM_NARRATIVE_REQUIRED"] as const;
export type NarrativeErrorCode = (typeof narrativeErrorCodes)[number];
export type NarrativeError = { readonly code: NarrativeErrorCode; readonly message: string };
export type NarrativeResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: NarrativeError };

export type RenderCalculatedModuleNarrativeArgs = {
  readonly analysis: CalculatedAnalysis["analysis"];
  readonly calculatedModule: CalculatedAnalysisModule;
};

export type EffectiveNarrativeArgs = {
  readonly renderedDefaultNarrative: RenderedModuleNarrative;
  readonly narrativeMode: NarrativeMode;
  readonly customNarrative: string | null;
};
