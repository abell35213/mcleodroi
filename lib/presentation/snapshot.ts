import type { PrismaClient } from "@prisma/client";
import { calculateAnalysis } from "@/lib/analyses/service";
import { buildCategoryBreakdown, buildCumulativeBenefitSeries, buildValueTypeBreakdown, buildValueWaterfall } from "@/lib/analyses/charts";
import { prisma as defaultPrisma } from "@/lib/db";
import { NARRATIVE_REGISTRY_VERSION, stableSerialize } from "@/lib/narratives/fingerprint";
import { renderAnalysisNarratives, resolveEffectiveNarrative, productContextForBusinessType } from "@/lib/narratives";
import { getCategoryByKey, getValueModule } from "@/lib/modules";
import { readCustomerLogoDataUri } from "./logo";
import { PRESENTATION_SNAPSHOT_VERSION, PRESENTATION_TEMPLATE_VERSION } from "./version";
import type { PresentationGenerationMetadata, PresentationServiceResult, PresentationSnapshot, PresentationSnapshotCategory, SnapshotScalarMap } from "./types";

type Db = PrismaClient;
function fail<T>(code: string, message: string): PresentationServiceResult<T> { return { ok: false, error: { code, message } }; }
function scalarMap(value: unknown): SnapshotScalarMap { return Object.fromEntries(Object.entries((value ?? {}) as Record<string, unknown>).map(([k,v]) => [k, typeof v === "number" || typeof v === "string" || typeof v === "boolean" || v === null ? v : JSON.stringify(v)])); }

export async function createPresentationSnapshot(args: { analysisId: string; db?: Db; now?: Date }): Promise<PresentationServiceResult<{ generation: PresentationGenerationMetadata; snapshot: PresentationSnapshot }>> {
  const db = args.db ?? defaultPrisma;
  const analysisRecord = await db.analysis.findUnique({ where: { id: args.analysisId } });
  if (!analysisRecord) return fail("ANALYSIS_NOT_FOUND", "Analysis was not found.");
  const calculated = await calculateAnalysis({ analysisId: args.analysisId, db });
  if (!calculated.ok) return fail(calculated.error.code, calculated.error.message);
  if (!calculated.value.workflowReadiness.canGeneratePresentation) return fail("ANALYSIS_NOT_PRESENTATION_READY", "Analysis must be complete and review-ready before creating a presentation snapshot.");
  const rendered = renderAnalysisNarratives(calculated.value);
  if (!rendered.ok) return fail(rendered.error.code, rendered.error.message);
  const narrativeByModule = new Map(rendered.value.map((n) => [n.moduleKey, n]));
  const categories = new Map<string, PresentationSnapshotCategory>();
  for (const calculatedModule of calculated.value.calculatedModules) {
    const narrative = narrativeByModule.get(calculatedModule.moduleKey);
    if (!narrative) return fail("NARRATIVE_RENDER_FAILED", `Narrative missing for ${calculatedModule.moduleKey}.`);
    const effective = resolveEffectiveNarrative({ renderedDefaultNarrative: narrative, narrativeMode: calculatedModule.narrativeMode, customNarrative: calculatedModule.customNarrative });
    if (!effective.ok) return fail(effective.error.code, effective.error.message);
    const category = getCategoryByKey(calculatedModule.category);
    const definition = getValueModule(calculatedModule.moduleKey);
    const result = calculatedModule.calculationOutcome?.success ? calculatedModule.calculationOutcome.result : null;
    if (!category || !result) return fail("SNAPSHOT_SOURCE_INCOMPLETE", `Snapshot source incomplete for ${calculatedModule.moduleKey}.`);
    if (!categories.has(category.key)) categories.set(category.key, { categoryKey: category.key, name: category.name, displayOrder: category.displayOrder, modules: [] });
    categories.get(category.key)!.modules.push({
      analysisModuleId: calculatedModule.analysisModuleId, moduleKey: calculatedModule.moduleKey, moduleName: definition.name, categoryKey: category.key, categoryName: category.name, displayOrder: calculatedModule.displayOrder, valueType: calculatedModule.valueType, narrativeStatus: definition.narrativeStatus, narrativeMode: calculatedModule.narrativeMode,
      inputs: scalarMap(calculatedModule.reconstructedInputs), financialOutputs: scalarMap(result.financialOutputs), derivedMetrics: scalarMap(result.derivedMetrics), opportunityHeadline: narrative.opportunityHeadline, valueNarrative: narrative.valueNarrative, defaultCustomerAnalysis: narrative.customerAnalysis, effectiveCustomerAnalysis: effective.value, presentationDisclaimer: narrative.presentationDisclaimer, presentationCallout: narrative.presentationCallout, customNarrativeSourceFingerprint: calculatedModule.customNarrativeSourceFingerprint,
    });
  }
  const snapshot: PresentationSnapshot = {
    snapshotVersion: PRESENTATION_SNAPSHOT_VERSION, presentationTemplateVersion: PRESENTATION_TEMPLATE_VERSION, narrativeRegistryVersion: NARRATIVE_REGISTRY_VERSION, createdAt: (args.now ?? new Date()).toISOString(),
    analysis: { id: analysisRecord.id, companyName: analysisRecord.companyName, customerContact: analysisRecord.customerContact, businessType: analysisRecord.businessType, productContext: productContextForBusinessType(analysisRecord.businessType), preparedBy: analysisRecord.preparedBy, analysisDate: analysisRecord.analysisDate.toISOString() },
    summary: { monthlyRecurringValueTotal: calculated.value.summary.monthlyRecurringValueTotal, annualRecurringValueTotal: calculated.value.summary.annualRecurringValueTotal, annualOnlyValueTotal: calculated.value.summary.annualOnlyValueTotal, totalIdentifiedAnnualEconomicOpportunity: calculated.value.summary.totalIdentifiedAnnualEconomicOpportunity, informationalCapitalValueTotal: calculated.value.summary.informationalCapitalValueTotal, valueTypeBreakdown: calculated.value.summary.valueTypeBreakdown, informationalCapitalValues: calculated.value.summary.informationalCapitalValues },
    overlapNotices: calculated.value.overlapNotices, categories: [...categories.values()],
    roi: calculated.value.roi ?? null,
    charts: {
      waterfall: buildValueWaterfall(calculated.value),
      valueTypeBreakdown: buildValueTypeBreakdown(calculated.value),
      categoryBreakdown: buildCategoryBreakdown(calculated.value),
      cumulativeBenefit: buildCumulativeBenefitSeries(calculated.value),
    },
    branding: {
      customerLogoPath: analysisRecord.customerLogoPath ?? null,
      customerLogoDataUri: readCustomerLogoDataUri(analysisRecord.customerLogoPath),
    },
  };
  const generation = await db.presentationGeneration.create({ data: { analysisId: args.analysisId, templateVersion: PRESENTATION_TEMPLATE_VERSION, snapshotJson: stableSerialize(snapshot), filePath: null } });
  return { ok: true, value: { generation: { id: generation.id, analysisId: generation.analysisId, templateVersion: generation.templateVersion, filePath: generation.filePath, status: generation.status, generatedAt: generation.generatedAt }, snapshot } };
}
export function parsePresentationSnapshot(snapshotJson: string): PresentationSnapshot { return JSON.parse(snapshotJson) as PresentationSnapshot; }
