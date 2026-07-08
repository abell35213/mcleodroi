import type { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/db";
import { calculateValueModule } from "@/lib/calculations";
import type { CalculationOutcome, CalculationResult } from "@/lib/calculations";
import {
  getAllValueModules,
  getCategoryByKey,
  getCategoryForModule,
  getOverlapNoticesForSelectedModules,
  getValueModule,
  isModuleAvailableForBusinessType,
  valueModuleKeys,
  valueTypes,
} from "@/lib/modules";
import type { BusinessType, CategoryKey, ValueModuleDefinition, ValueModuleKey, ValueType } from "@/lib/modules";
import type {
  AnalysisCalculationSummary,
  AnalysisModuleState,
  AnalysisModuleStatus,
  CalculatedAnalysis,
  CalculatedAnalysisModule,
  InformationalCapitalValue,
  NarrativeMode,
  PersistedModuleInput,
  ServiceResult,
  AnalysisServiceErrorCode,
  ValueTypeSummary,
} from "./types";

const moduleKeySet = new Set<string>(valueModuleKeys);
const DISPLAY_ORDER_STEP = 100;

type Db = PrismaClient;
type AnalysisRecord = { id: string; companyName: string; businessType: BusinessType; status: string };
type ModuleRecord = {
  id: string;
  analysisId: string;
  moduleKey: string;
  status: string;
  displayOrder: number;
  narrativeMode: string;
  customNarrative: string | null;
  inputs: { inputKey: string; numericValue: number }[];
  analysis?: AnalysisRecord;
};

function err<T>(code: AnalysisServiceErrorCode, message: string): ServiceResult<T> {
  return { ok: false, error: { code, message } };
}

function ok<T>(value: T): ServiceResult<T> {
  return { ok: true, value };
}

function parseModuleKey(moduleKey: string): ValueModuleKey | null {
  return moduleKeySet.has(moduleKey) ? (moduleKey as ValueModuleKey) : null;
}

function inputDefinitionsByKey(definition: ValueModuleDefinition): Map<string, ValueModuleDefinition["inputDefinitions"][number]> {
  return new Map(definition.inputDefinitions.map((input) => [input.key, input]));
}

function toPersistedInputs(rows: readonly { inputKey: string; numericValue: number }[]): PersistedModuleInput[] {
  return rows.map((row) => ({ inputKey: row.inputKey, numericValue: row.numericValue }));
}

export function reconstructCalculationInputs(definition: ValueModuleDefinition, persistedInputs: readonly PersistedModuleInput[]): Partial<Record<string, number>> {
  const reconstructed: Partial<Record<string, number>> = {};
  for (const input of definition.inputDefinitions) {
    const persisted = persistedInputs.find((candidate) => candidate.inputKey === input.key);
    if (persisted) {
      reconstructed[input.key] = persisted.numericValue;
    } else if (input.defaultValue !== undefined) {
      reconstructed[input.key] = input.defaultValue;
    }
  }
  return reconstructed;
}

export function getMissingRequiredInputKeys(definition: ValueModuleDefinition, persistedInputs: readonly PersistedModuleInput[]): string[] {
  const persisted = new Set(persistedInputs.map((input) => input.inputKey));
  return definition.inputDefinitions.filter((input) => input.required && input.defaultValue === undefined && !persisted.has(input.key)).map((input) => input.key);
}

export function deriveAnalysisModuleStatus(definition: ValueModuleDefinition, persistedInputs: readonly PersistedModuleInput[]): { status: AnalysisModuleStatus; outcome: CalculationOutcome<CalculationResult> | null; missingRequiredInputKeys: string[] } {
  if (persistedInputs.length === 0) {
    return { status: "NOT_STARTED", outcome: null, missingRequiredInputKeys: getMissingRequiredInputKeys(definition, persistedInputs) };
  }
  const missingRequiredInputKeys = getMissingRequiredInputKeys(definition, persistedInputs);
  if (missingRequiredInputKeys.length > 0) {
    return { status: "IN_PROGRESS", outcome: null, missingRequiredInputKeys };
  }
  const outcome = calculateValueModule(definition.key, reconstructCalculationInputs(definition, persistedInputs));
  return { status: outcome.success ? "COMPLETE" : "IN_PROGRESS", outcome, missingRequiredInputKeys };
}

function categoryFor(moduleKey: ValueModuleKey, businessType: BusinessType): CategoryKey {
  const category = getCategoryForModule(moduleKey, businessType);
  if (!category) {
    throw new Error(`No category mapping for ${moduleKey} and ${businessType}`);
  }
  return category;
}

async function updatePersistedStatus(db: Db, record: ModuleRecord): Promise<AnalysisModuleStatus> {
  const moduleKey = parseModuleKey(record.moduleKey);
  if (!moduleKey) return "IN_PROGRESS";
  const status = deriveAnalysisModuleStatus(getValueModule(moduleKey), toPersistedInputs(record.inputs)).status;
  if (record.status !== status) {
    await db.analysisModule.update({ where: { id: record.id }, data: { status } });
  }
  return status;
}

function toState(record: ModuleRecord, status: AnalysisModuleStatus): AnalysisModuleState {
  const moduleKey = parseModuleKey(record.moduleKey);
  if (!moduleKey) throw new Error(`Invalid persisted module key: ${record.moduleKey}`);
  return {
    analysisModuleId: record.id,
    analysisId: record.analysisId,
    moduleKey,
    status,
    displayOrder: record.displayOrder,
    narrativeMode: record.narrativeMode as NarrativeMode,
    customNarrative: record.customNarrative,
    inputs: toPersistedInputs(record.inputs),
  };
}

export async function selectAnalysisModule(args: { analysisId: string; moduleKey: string; db?: Db }): Promise<ServiceResult<AnalysisModuleState>> {
  const db = args.db ?? defaultPrisma;
  const moduleKey = parseModuleKey(args.moduleKey);
  if (!moduleKey) return err("MODULE_NOT_FOUND", "Value module was not found in the canonical registry.");
  const analysis = await db.analysis.findUnique({ where: { id: args.analysisId } });
  if (!analysis) return err("ANALYSIS_NOT_FOUND", "Analysis was not found.");
  if (!isModuleAvailableForBusinessType(moduleKey, analysis.businessType)) return err("MODULE_NOT_AVAILABLE_FOR_BUSINESS_TYPE", "Value module is not available for this analysis business type.");
  const duplicate = await db.analysisModule.findUnique({ where: { analysisId_moduleKey: { analysisId: args.analysisId, moduleKey } }, include: { inputs: true } });
  if (duplicate) return err("MODULE_ALREADY_SELECTED", "Value module is already selected for this analysis.");
  const category = categoryFor(moduleKey, analysis.businessType);
  const selected = await db.analysisModule.findMany({ where: { analysisId: args.analysisId } });
  const selectedInCategory = selected.filter((selectedAnalysisModule) => {
    const selectedKey = parseModuleKey(selectedAnalysisModule.moduleKey);
    return selectedKey ? getCategoryForModule(selectedKey, analysis.businessType) === category : false;
  });
  const displayOrder = selectedInCategory.reduce((max, selectedAnalysisModule) => Math.max(max, selectedAnalysisModule.displayOrder), 0) + DISPLAY_ORDER_STEP;
  try {
    const created = await db.analysisModule.create({ data: { analysisId: args.analysisId, moduleKey, displayOrder }, include: { inputs: true } });
    return ok(toState(created, "NOT_STARTED"));
  } catch (error: any) {
    if (error?.code === "P2002") {
      return err("MODULE_ALREADY_SELECTED", "Value module is already selected for this analysis.");
    }
    throw error;
  }
}

export async function removeAnalysisModule(args: { analysisModuleId: string; db?: Db }): Promise<ServiceResult<{ analysisModuleId: string }>> {
  const db = args.db ?? defaultPrisma;
  const existing = await db.analysisModule.findUnique({ where: { id: args.analysisModuleId } });
  if (!existing) return err("ANALYSIS_MODULE_NOT_FOUND", "Selected analysis module was not found.");
  await db.analysisModule.delete({ where: { id: args.analysisModuleId } });
  return ok({ analysisModuleId: args.analysisModuleId });
}

async function loadModule(db: Db, analysisModuleId: string): Promise<ModuleRecord | null> {
  return db.analysisModule.findUnique({ where: { id: analysisModuleId }, include: { inputs: true, analysis: true } });
}

export async function saveAnalysisModuleInputs(args: { analysisModuleId: string; inputs: Record<string, number>; db?: Db }): Promise<ServiceResult<AnalysisModuleState>> {
  const db = args.db ?? defaultPrisma;
  const selectedModule = await loadModule(db, args.analysisModuleId);
  if (!selectedModule) return err("ANALYSIS_MODULE_NOT_FOUND", "Selected analysis module was not found.");
  const moduleKey = parseModuleKey(selectedModule.moduleKey);
  if (!moduleKey) return err("MODULE_NOT_FOUND", "Value module was not found in the canonical registry.");
  const definitions = inputDefinitionsByKey(getValueModule(moduleKey));
  for (const inputKey of Object.keys(args.inputs)) {
    if (!definitions.has(inputKey)) return err("INVALID_INPUT_KEY", `Input key ${inputKey} does not belong to ${moduleKey}.`);
  }

  const entries = Object.entries(args.inputs);
  if (entries.length > 0) {
    await db.$transaction(
      entries.map(([inputKey, numericValue]) =>
        db.analysisModuleInput.upsert({
          where: { analysisModuleId_inputKey: { analysisModuleId: args.analysisModuleId, inputKey } },
          create: { analysisModuleId: args.analysisModuleId, inputKey, numericValue },
          update: { numericValue },
        }),
      ),
    );
  }
  const updated = await loadModule(db, args.analysisModuleId);
  if (!updated) return err("ANALYSIS_MODULE_NOT_FOUND", "Selected analysis module was not found.");
  const status = await updatePersistedStatus(db, updated);
  return ok(toState(updated, status));
}

export async function clearAnalysisModuleInput(args: { analysisModuleId: string; inputKey: string; db?: Db }): Promise<ServiceResult<AnalysisModuleState>> {
  const db = args.db ?? defaultPrisma;
  const selectedModule = await loadModule(db, args.analysisModuleId);
  if (!selectedModule) return err("ANALYSIS_MODULE_NOT_FOUND", "Selected analysis module was not found.");
  const moduleKey = parseModuleKey(selectedModule.moduleKey);
  if (!moduleKey) return err("MODULE_NOT_FOUND", "Value module was not found in the canonical registry.");
  if (!inputDefinitionsByKey(getValueModule(moduleKey)).has(args.inputKey)) return err("INVALID_INPUT_KEY", `Input key ${args.inputKey} does not belong to ${moduleKey}.`);
  await db.analysisModuleInput.deleteMany({ where: { analysisModuleId: args.analysisModuleId, inputKey: args.inputKey } });
  const updated = await loadModule(db, args.analysisModuleId);
  if (!updated) return err("ANALYSIS_MODULE_NOT_FOUND", "Selected analysis module was not found.");
  const status = await updatePersistedStatus(db, updated);
  return ok(toState(updated, status));
}

export async function getCalculatedAnalysisModule(args: { analysisModuleId: string; db?: Db }): Promise<ServiceResult<CalculatedAnalysisModule>> {
  const db = args.db ?? defaultPrisma;
  const selectedModule = await loadModule(db, args.analysisModuleId);
  if (!selectedModule?.analysis) return err("ANALYSIS_MODULE_NOT_FOUND", "Selected analysis module was not found.");
  const moduleKey = parseModuleKey(selectedModule.moduleKey);
  if (!moduleKey) return err("MODULE_NOT_FOUND", "Value module was not found in the canonical registry.");
  if (!isModuleAvailableForBusinessType(moduleKey, selectedModule.analysis.businessType)) return err("MODULE_NOT_AVAILABLE_FOR_BUSINESS_TYPE", "Value module is not available for this analysis business type.");
  const definition = getValueModule(moduleKey);
  const inputs = toPersistedInputs(selectedModule.inputs);
  const derived = deriveAnalysisModuleStatus(definition, inputs);
  const outcome = derived.outcome ?? (derived.missingRequiredInputKeys.length === 0 && inputs.length > 0 ? calculateValueModule(moduleKey, reconstructCalculationInputs(definition, inputs)) : null);
  if (selectedModule.status !== derived.status) await db.analysisModule.update({ where: { id: selectedModule.id }, data: { status: derived.status } });
  return ok({
    ...toState(selectedModule, derived.status),
    reconstructedInputs: reconstructCalculationInputs(definition, inputs),
    missingRequiredInputKeys: derived.missingRequiredInputKeys,
    calculationOutcome: outcome,
    validationIssues: outcome && !outcome.success ? outcome.issues : [],
    category: categoryFor(moduleKey, selectedModule.analysis.businessType),
    valueType: definition.valueType,
  });
}

function emptyBreakdown(): Map<ValueType, ValueTypeSummary> {
  return new Map(valueTypes.map((valueType) => [valueType, { valueType, monthlyRecurringValue: 0, annualRecurringValue: 0, annualOnlyValue: 0, annualEconomicOpportunity: 0 }]));
}

export function summarizeCalculatedModules(modules: readonly CalculatedAnalysisModule[]): AnalysisCalculationSummary {
  const breakdown = emptyBreakdown();
  const informationalCapitalValues: InformationalCapitalValue[] = [];
  let monthlyRecurringValueTotal = 0;
  let annualRecurringValueTotal = 0;
  let annualOnlyValueTotal = 0;
  let informationalCapitalValueTotal = 0;
  for (const calculatedModule of modules) {
    if (calculatedModule.status !== "COMPLETE" || !calculatedModule.calculationOutcome?.success) continue;
    const outputs = calculatedModule.calculationOutcome.result.financialOutputs;
    const monthly = outputs.monthlyRecurringValue ?? 0;
    const annual = outputs.annualRecurringValue ?? 0;
    const annualOnly = outputs.annualOnlyValue ?? 0;
    monthlyRecurringValueTotal += monthly;
    annualRecurringValueTotal += annual;
    annualOnlyValueTotal += annualOnly;
    const current = breakdown.get(calculatedModule.valueType) ?? { valueType: calculatedModule.valueType, monthlyRecurringValue: 0, annualRecurringValue: 0, annualOnlyValue: 0, annualEconomicOpportunity: 0 };
    breakdown.set(calculatedModule.valueType, { valueType: calculatedModule.valueType, monthlyRecurringValue: current.monthlyRecurringValue + monthly, annualRecurringValue: current.annualRecurringValue + annual, annualOnlyValue: current.annualOnlyValue + annualOnly, annualEconomicOpportunity: current.annualEconomicOpportunity + annual + annualOnly });
    if (outputs.informationalCapitalValue) {
      informationalCapitalValueTotal += outputs.informationalCapitalValue;
      informationalCapitalValues.push({ moduleKey: calculatedModule.moduleKey, analysisModuleId: calculatedModule.analysisModuleId, value: outputs.informationalCapitalValue });
    }
  }
  const completeModuleCount = modules.filter((calculatedModule) => calculatedModule.status === "COMPLETE" && calculatedModule.calculationOutcome?.success).length;
  return { monthlyRecurringValueTotal, annualRecurringValueTotal, annualOnlyValueTotal, totalIdentifiedAnnualEconomicOpportunity: annualRecurringValueTotal + annualOnlyValueTotal, informationalCapitalValueTotal, valueTypeBreakdown: [...breakdown.values()], informationalCapitalValues, moduleCount: modules.length, completeModuleCount, incompleteModuleCount: modules.length - completeModuleCount };
}

export function deriveAnalysisWorkflowReadiness(summary: AnalysisCalculationSummary) {
  const hasSelectedModules = summary.moduleCount > 0;
  const allSelectedModulesComplete = hasSelectedModules && summary.incompleteModuleCount === 0;
  return { hasSelectedModules, allSelectedModulesComplete, canReview: allSelectedModulesComplete, canGeneratePresentation: allSelectedModulesComplete };
}

export async function calculateAnalysis(args: { analysisId: string; db?: Db }): Promise<ServiceResult<CalculatedAnalysis>> {
  const db = args.db ?? defaultPrisma;
  const analysis = await db.analysis.findUnique({ where: { id: args.analysisId }, include: { modules: { include: { inputs: true } } } });
  if (!analysis) return err("ANALYSIS_NOT_FOUND", "Analysis was not found.");
  const calculated: CalculatedAnalysisModule[] = [];
  for (const selectedAnalysisModule of analysis.modules) {
    const result = await getCalculatedAnalysisModule({ analysisModuleId: selectedAnalysisModule.id, db });
    if (result.ok) calculated.push(result.value);
  }
  const allModules = new Map(getAllValueModules().map((valueModule) => [valueModule.key, valueModule]));
  calculated.sort((left, right) => {
    const leftCategory = getCategoryByKey(left.category)?.displayOrder ?? Number.MAX_SAFE_INTEGER;
    const rightCategory = getCategoryByKey(right.category)?.displayOrder ?? Number.MAX_SAFE_INTEGER;
    return leftCategory - rightCategory || left.displayOrder - right.displayOrder || (allModules.get(left.moduleKey)?.displayOrder ?? 0) - (allModules.get(right.moduleKey)?.displayOrder ?? 0);
  });
  const summary = summarizeCalculatedModules(calculated);
  return ok({ analysis: { id: analysis.id, companyName: analysis.companyName, businessType: analysis.businessType, status: analysis.status }, calculatedModules: calculated, overlapNotices: getOverlapNoticesForSelectedModules(calculated.map((calculatedModule) => calculatedModule.moduleKey)), summary, workflowReadiness: deriveAnalysisWorkflowReadiness(summary) });
}
