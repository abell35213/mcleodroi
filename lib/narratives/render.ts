import type { ModuleInputMap, ModuleResultMap } from "@/lib/calculations";
import type { CalculatedAnalysis, CalculatedAnalysisModule } from "@/lib/analyses/types";
import { getValueModule } from "@/lib/modules";
import type { ValueModuleKey } from "@/lib/modules";
import { getNarrativeVariant, productContextForBusinessType, renderVariant } from "./registry";
import type { EffectiveNarrativeArgs, NarrativeResult, PresentationModuleNarrative, RenderCalculatedModuleNarrativeArgs, RenderedModuleNarrative } from "./types";

function fail<T>(code: Parameters<typeof narrativeError>[0], message: string): NarrativeResult<T> {
  return { ok: false, error: narrativeError(code, message) };
}

function narrativeError(code: "NARRATIVE_VARIANT_NOT_FOUND" | "MODULE_NOT_COMPLETE" | "CALCULATION_NOT_SUCCESSFUL" | "ANALYSIS_NOT_REVIEW_READY" | "CUSTOM_NARRATIVE_REQUIRED", message: string) {
  return { code, message };
}

function typedInputs<K extends ValueModuleKey>(module: CalculatedAnalysisModule & { moduleKey: K }): ModuleInputMap[K] {
  return module.reconstructedInputs as ModuleInputMap[K];
}

function typedResult<K extends ValueModuleKey>(module: CalculatedAnalysisModule & { moduleKey: K }): ModuleResultMap[K] | null {
  if (!module.calculationOutcome?.success) return null;
  return module.calculationOutcome.result as ModuleResultMap[K];
}

export function renderCalculatedModuleNarrative(args: RenderCalculatedModuleNarrativeArgs): NarrativeResult<RenderedModuleNarrative> {
  const { analysis, calculatedModule } = args;
  if (calculatedModule.status !== "COMPLETE") return fail("MODULE_NOT_COMPLETE", "Narratives can only render for COMPLETE selected modules.");
  const result = typedResult(calculatedModule);
  if (!result) return fail("CALCULATION_NOT_SUCCESSFUL", "Narratives can only render successful calculation outcomes.");
  const variant = getNarrativeVariant(calculatedModule.moduleKey, analysis.businessType);
  if (!variant.ok) return variant;
  const context = {
    companyName: analysis.companyName,
    businessType: analysis.businessType,
    productContext: productContextForBusinessType(analysis.businessType),
    module: getValueModule(calculatedModule.moduleKey),
    inputs: typedInputs(calculatedModule),
    result,
  };
  return { ok: true, value: renderVariant(context, variant.value) };
}

export function renderAnalysisNarratives(calculatedAnalysis: CalculatedAnalysis): NarrativeResult<readonly RenderedModuleNarrative[]> {
  if (!calculatedAnalysis.workflowReadiness.canReview) return fail("ANALYSIS_NOT_REVIEW_READY", "Narratives cannot be finalized until all selected modules are complete.");
  const rendered: RenderedModuleNarrative[] = [];
  for (const calculatedModule of calculatedAnalysis.calculatedModules) {
    const result = renderCalculatedModuleNarrative({ analysis: calculatedAnalysis.analysis, calculatedModule });
    if (!result.ok) return result;
    rendered.push(result.value);
  }
  return { ok: true, value: rendered };
}

export function resolveEffectiveNarrative(args: EffectiveNarrativeArgs): NarrativeResult<string> {
  if (args.narrativeMode === "TEMPLATE") return { ok: true, value: args.renderedDefaultNarrative.customerAnalysis };
  const custom = args.customNarrative?.trim();
  if (!custom) return fail("CUSTOM_NARRATIVE_REQUIRED", "Custom narrative mode requires non-empty custom narrative text.");
  return { ok: true, value: custom };
}

export function toPresentationModuleNarrative(args: { readonly renderedDefaultNarrative: RenderedModuleNarrative; readonly narrativeMode: "TEMPLATE" | "CUSTOM"; readonly customNarrative: string | null }): NarrativeResult<PresentationModuleNarrative> {
  const effective = resolveEffectiveNarrative(args);
  if (!effective.ok) return effective;
  const { fullDisclaimer: _fullDisclaimer, ...presentation } = args.renderedDefaultNarrative;
  void _fullDisclaimer;
  return { ok: true, value: { ...presentation, effectiveAnalysis: effective.value } };
}
