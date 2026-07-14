import type { PrismaClient } from "@prisma/client";
import {
  createAnalysisSchema,
  analysisInvestmentSchema,
  type CreateAnalysisInput,
  type AnalysisInvestmentInput,
} from "@/lib/validation/analysis";
import { prisma as defaultPrisma } from "@/lib/db";
import { calculateValueModule, calculateRoi, DEFAULT_ANALYSIS_DISCOUNT_RATE, DEFAULT_ROI_HORIZON_YEARS } from "@/lib/calculations";
import { renderCalculatedModuleNarrative } from "@/lib/narratives";
import { buildOverlapReviewStates, toOverlapDispositionRecord, completedOverlapDispositions } from "./overlap-dispositions";
import {
  createNarrativeSourceFingerprint,
  normalizeNarrativeForComparison,
} from "@/lib/narratives/fingerprint";
import type { CalculationOutcome, CalculationResult, RoiMetrics } from "@/lib/calculations";
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
import type {
  BusinessType,
  CategoryKey,
  ValueModuleDefinition,
  ValueModuleKey,
  ValueType,
} from "@/lib/modules";
import { CUSTOM_OPPORTUNITY_OVERLAP_GROUP_KEY, CUSTOM_OPPORTUNITY_OVERLAP_MESSAGE, customOpportunityNarrativeStatus, deriveCustomValues, fingerprintCustomOpportunity, validateCustomOpportunityInput, type CustomOpportunityInput } from "@/lib/custom-opportunities";
import type {
  AnalysisCalculationSummary,
  AnalysisInvestment,
  AnalysisModuleState,
  AnalysisModuleStatus,
  CalculatedAnalysis,
  CalculatedAnalysisModule,
  CalculatedCustomOpportunity,
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
type AnalysisRecord = {
  id: string;
  companyName: string;
  businessType: BusinessType;
  status: string;
};
type ModuleRecord = {
  id: string;
  analysisId: string;
  moduleKey: string;
  status: string;
  displayOrder: number;
  narrativeMode: string;
  customNarrative: string | null;
  customNarrativeSourceFingerprint: string | null;
  inputs: { inputKey: string; numericValue: number }[];
  analysis?: AnalysisRecord;
};

function err<T>(
  code: AnalysisServiceErrorCode,
  message: string,
): ServiceResult<T> {
  return { ok: false, error: { code, message } };
}

function ok<T>(value: T): ServiceResult<T> {
  return { ok: true, value };
}

function parseModuleKey(moduleKey: string): ValueModuleKey | null {
  return moduleKeySet.has(moduleKey) ? (moduleKey as ValueModuleKey) : null;
}

function inputDefinitionsByKey(
  definition: ValueModuleDefinition,
): Map<string, ValueModuleDefinition["inputDefinitions"][number]> {
  return new Map(
    definition.inputDefinitions.map((input) => [input.key, input]),
  );
}

function toPersistedInputs(
  rows: readonly { inputKey: string; numericValue: number }[],
): PersistedModuleInput[] {
  return rows.map((row) => ({
    inputKey: row.inputKey,
    numericValue: row.numericValue,
  }));
}

export function reconstructCalculationInputs(
  definition: ValueModuleDefinition,
  persistedInputs: readonly PersistedModuleInput[],
): Partial<Record<string, number>> {
  const reconstructed: Partial<Record<string, number>> = {};
  for (const input of definition.inputDefinitions) {
    const persisted = persistedInputs.find(
      (candidate) => candidate.inputKey === input.key,
    );
    if (persisted) {
      reconstructed[input.key] = persisted.numericValue;
    } else if (input.defaultValue !== undefined) {
      reconstructed[input.key] = input.defaultValue;
    }
  }
  return reconstructed;
}

export function getMissingRequiredInputKeys(
  definition: ValueModuleDefinition,
  persistedInputs: readonly PersistedModuleInput[],
): string[] {
  const persisted = new Set(persistedInputs.map((input) => input.inputKey));
  return definition.inputDefinitions
    .filter(
      (input) =>
        input.required &&
        input.defaultValue === undefined &&
        !persisted.has(input.key),
    )
    .map((input) => input.key);
}

export function deriveAnalysisModuleStatus(
  definition: ValueModuleDefinition,
  persistedInputs: readonly PersistedModuleInput[],
): {
  status: AnalysisModuleStatus;
  outcome: CalculationOutcome<CalculationResult> | null;
  missingRequiredInputKeys: string[];
} {
  if (persistedInputs.length === 0) {
    return {
      status: "NOT_STARTED",
      outcome: null,
      missingRequiredInputKeys: getMissingRequiredInputKeys(
        definition,
        persistedInputs,
      ),
    };
  }
  const missingRequiredInputKeys = getMissingRequiredInputKeys(
    definition,
    persistedInputs,
  );
  if (missingRequiredInputKeys.length > 0) {
    return { status: "IN_PROGRESS", outcome: null, missingRequiredInputKeys };
  }
  const outcome = calculateValueModule(
    definition.key,
    reconstructCalculationInputs(definition, persistedInputs) as Record<
      string,
      number
    >,
  );
  return {
    status: outcome.success ? "COMPLETE" : "IN_PROGRESS",
    outcome,
    missingRequiredInputKeys,
  };
}

function categoryFor(
  moduleKey: ValueModuleKey,
  businessType: BusinessType,
): CategoryKey {
  const category = getCategoryForModule(moduleKey, businessType);
  if (!category) {
    throw new Error(`No category mapping for ${moduleKey} and ${businessType}`);
  }
  return category;
}

async function updatePersistedStatus(
  db: Db,
  record: ModuleRecord,
): Promise<AnalysisModuleStatus> {
  const moduleKey = parseModuleKey(record.moduleKey);
  if (!moduleKey) return "IN_PROGRESS";
  const status = deriveAnalysisModuleStatus(
    getValueModule(moduleKey),
    toPersistedInputs(record.inputs),
  ).status;
  if (record.status !== status) {
    await db.analysisModule.update({
      where: { id: record.id },
      data: { status },
    });
  }
  return status;
}

function toState(
  record: ModuleRecord,
  status: AnalysisModuleStatus,
): AnalysisModuleState {
  const moduleKey = parseModuleKey(record.moduleKey);
  if (!moduleKey)
    throw new Error(`Invalid persisted module key: ${record.moduleKey}`);
  return {
    analysisModuleId: record.id,
    analysisId: record.analysisId,
    moduleKey,
    status,
    displayOrder: record.displayOrder,
    narrativeMode: record.narrativeMode as NarrativeMode,
    customNarrative: record.customNarrative,
    customNarrativeSourceFingerprint: record.customNarrativeSourceFingerprint,
    inputs: toPersistedInputs(record.inputs),
  };
}

export async function selectAnalysisModule(args: {
  analysisId: string;
  moduleKey: string;
  db?: Db;
}): Promise<ServiceResult<AnalysisModuleState>> {
  const db = args.db ?? defaultPrisma;
  const moduleKey = parseModuleKey(args.moduleKey);
  if (!moduleKey)
    return err(
      "MODULE_NOT_FOUND",
      "Value module was not found in the canonical registry.",
    );
  const analysis = await db.analysis.findUnique({
    where: { id: args.analysisId },
  });
  if (!analysis) return err("ANALYSIS_NOT_FOUND", "Analysis was not found.");
  if (!isModuleAvailableForBusinessType(moduleKey, analysis.businessType))
    return err(
      "MODULE_NOT_AVAILABLE_FOR_BUSINESS_TYPE",
      "Value module is not available for this analysis business type.",
    );
  const duplicate = await db.analysisModule.findUnique({
    where: { analysisId_moduleKey: { analysisId: args.analysisId, moduleKey } },
    include: { inputs: true },
  });
  if (duplicate)
    return err(
      "MODULE_ALREADY_SELECTED",
      "Value module is already selected for this analysis.",
    );
  const category = categoryFor(moduleKey, analysis.businessType);
  const selected = await db.analysisModule.findMany({
    where: { analysisId: args.analysisId },
  });
  const selectedInCategory = selected.filter((selectedAnalysisModule) => {
    const selectedKey = parseModuleKey(selectedAnalysisModule.moduleKey);
    return selectedKey
      ? getCategoryForModule(selectedKey, analysis.businessType) === category
      : false;
  });
  const displayOrder =
    selectedInCategory.reduce(
      (max, selectedAnalysisModule) =>
        Math.max(max, selectedAnalysisModule.displayOrder),
      0,
    ) + DISPLAY_ORDER_STEP;
  try {
    const created = await db.analysisModule.create({
      data: { analysisId: args.analysisId, moduleKey, displayOrder },
      include: { inputs: true },
    });
    return ok(toState(created, "NOT_STARTED"));
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return err(
        "MODULE_ALREADY_SELECTED",
        "Value module is already selected for this analysis.",
      );
    }
    throw error;
  }
}

export async function removeAnalysisModule(args: {
  analysisModuleId: string;
  db?: Db;
}): Promise<ServiceResult<{ analysisModuleId: string }>> {
  const db = args.db ?? defaultPrisma;
  const existing = await db.analysisModule.findUnique({
    where: { id: args.analysisModuleId },
  });
  if (!existing)
    return err(
      "ANALYSIS_MODULE_NOT_FOUND",
      "Selected analysis module was not found.",
    );
  await db.analysisModule.delete({ where: { id: args.analysisModuleId } });
  return ok({ analysisModuleId: args.analysisModuleId });
}

async function loadModule(
  db: Db,
  analysisModuleId: string,
): Promise<ModuleRecord | null> {
  return db.analysisModule.findUnique({
    where: { id: analysisModuleId },
    include: { inputs: true, analysis: true },
  });
}

export async function saveAnalysisModuleInputs(args: {
  analysisModuleId: string;
  inputs: Record<string, number>;
  db?: Db;
}): Promise<ServiceResult<AnalysisModuleState>> {
  const db = args.db ?? defaultPrisma;
  const selectedModule = await loadModule(db, args.analysisModuleId);
  if (!selectedModule)
    return err(
      "ANALYSIS_MODULE_NOT_FOUND",
      "Selected analysis module was not found.",
    );
  const moduleKey = parseModuleKey(selectedModule.moduleKey);
  if (!moduleKey)
    return err(
      "MODULE_NOT_FOUND",
      "Value module was not found in the canonical registry.",
    );
  const definitions = inputDefinitionsByKey(getValueModule(moduleKey));
  for (const inputKey of Object.keys(args.inputs)) {
    if (!definitions.has(inputKey))
      return err(
        "INVALID_INPUT_KEY",
        `Input key ${inputKey} does not belong to ${moduleKey}.`,
      );
  }

  const entries = Object.entries(args.inputs);
  if (entries.length > 0) {
    await db.$transaction(
      entries.map(([inputKey, numericValue]) =>
        db.analysisModuleInput.upsert({
          where: {
            analysisModuleId_inputKey: {
              analysisModuleId: args.analysisModuleId,
              inputKey,
            },
          },
          create: {
            analysisModuleId: args.analysisModuleId,
            inputKey,
            numericValue,
          },
          update: { numericValue },
        }),
      ),
    );
  }
  const updated = await loadModule(db, args.analysisModuleId);
  if (!updated)
    return err(
      "ANALYSIS_MODULE_NOT_FOUND",
      "Selected analysis module was not found.",
    );
  const status = await updatePersistedStatus(db, updated);
  return ok(toState(updated, status));
}

export async function clearAnalysisModuleInput(args: {
  analysisModuleId: string;
  inputKey: string;
  db?: Db;
}): Promise<ServiceResult<AnalysisModuleState>> {
  const db = args.db ?? defaultPrisma;
  const selectedModule = await loadModule(db, args.analysisModuleId);
  if (!selectedModule)
    return err(
      "ANALYSIS_MODULE_NOT_FOUND",
      "Selected analysis module was not found.",
    );
  const moduleKey = parseModuleKey(selectedModule.moduleKey);
  if (!moduleKey)
    return err(
      "MODULE_NOT_FOUND",
      "Value module was not found in the canonical registry.",
    );
  if (!inputDefinitionsByKey(getValueModule(moduleKey)).has(args.inputKey))
    return err(
      "INVALID_INPUT_KEY",
      `Input key ${args.inputKey} does not belong to ${moduleKey}.`,
    );
  await db.analysisModuleInput.deleteMany({
    where: { analysisModuleId: args.analysisModuleId, inputKey: args.inputKey },
  });
  const updated = await loadModule(db, args.analysisModuleId);
  if (!updated)
    return err(
      "ANALYSIS_MODULE_NOT_FOUND",
      "Selected analysis module was not found.",
    );
  const status = await updatePersistedStatus(db, updated);
  return ok(toState(updated, status));
}

export async function getCalculatedAnalysisModule(args: {
  analysisModuleId: string;
  db?: Db;
}): Promise<ServiceResult<CalculatedAnalysisModule>> {
  const db = args.db ?? defaultPrisma;
  const selectedModule = await loadModule(db, args.analysisModuleId);
  if (!selectedModule?.analysis)
    return err(
      "ANALYSIS_MODULE_NOT_FOUND",
      "Selected analysis module was not found.",
    );
  return calculateAnalysisModuleRecord(
    db,
    selectedModule,
    selectedModule.analysis,
  );
}

async function calculateAnalysisModuleRecord(
  db: Db,
  selectedModule: ModuleRecord,
  analysis: AnalysisRecord,
): Promise<ServiceResult<CalculatedAnalysisModule>> {
  const moduleKey = parseModuleKey(selectedModule.moduleKey);
  if (!moduleKey)
    return err(
      "MODULE_NOT_FOUND",
      "Value module was not found in the canonical registry.",
    );
  if (!isModuleAvailableForBusinessType(moduleKey, analysis.businessType))
    return err(
      "MODULE_NOT_AVAILABLE_FOR_BUSINESS_TYPE",
      "Value module is not available for this analysis business type.",
    );
  const definition = getValueModule(moduleKey);
  const inputs = toPersistedInputs(selectedModule.inputs);
  const derived = deriveAnalysisModuleStatus(definition, inputs);
  const outcome =
    derived.outcome ??
    (derived.missingRequiredInputKeys.length === 0 && inputs.length > 0
      ? calculateValueModule(
          moduleKey,
          reconstructCalculationInputs(definition, inputs) as Record<
            string,
            number
          >,
        )
      : null);
  if (selectedModule.status !== derived.status)
    await db.analysisModule.update({
      where: { id: selectedModule.id },
      data: { status: derived.status },
    });
  return ok({
    ...toState(selectedModule, derived.status),
    reconstructedInputs: reconstructCalculationInputs(definition, inputs),
    missingRequiredInputKeys: derived.missingRequiredInputKeys,
    calculationOutcome: outcome,
    validationIssues: outcome && !outcome.success ? outcome.issues : [],
    category: categoryFor(moduleKey, analysis.businessType),
    valueType: definition.valueType,
  });
}

function emptyBreakdown(): Map<ValueType, ValueTypeSummary> {
  return new Map(
    valueTypes.map((valueType) => [
      valueType,
      {
        valueType,
        monthlyRecurringValue: 0,
        annualRecurringValue: 0,
        annualOnlyValue: 0,
        annualEconomicOpportunity: 0,
      },
    ]),
  );
}

export function summarizeCalculatedModules(
  modules: readonly CalculatedAnalysisModule[],
  customOpportunities: readonly CalculatedCustomOpportunity[] = [],
): AnalysisCalculationSummary {
  const breakdown = emptyBreakdown();
  const informationalCapitalValues: InformationalCapitalValue[] = [];
  let monthlyRecurringValueTotal = 0;
  let annualRecurringValueTotal = 0;
  let annualOnlyValueTotal = 0;
  let informationalCapitalValueTotal = 0;
  for (const calculatedModule of modules) {
    if (
      calculatedModule.status !== "COMPLETE" ||
      !calculatedModule.calculationOutcome?.success
    )
      continue;
    const outputs = calculatedModule.calculationOutcome.result.financialOutputs;
    const monthly = outputs.monthlyRecurringValue ?? 0;
    const annual = outputs.annualRecurringValue ?? 0;
    const annualOnly = outputs.annualOnlyValue ?? 0;
    monthlyRecurringValueTotal += monthly;
    annualRecurringValueTotal += annual;
    annualOnlyValueTotal += annualOnly;
    const current = breakdown.get(calculatedModule.valueType) ?? {
      valueType: calculatedModule.valueType,
      monthlyRecurringValue: 0,
      annualRecurringValue: 0,
      annualOnlyValue: 0,
      annualEconomicOpportunity: 0,
    };
    breakdown.set(calculatedModule.valueType, {
      valueType: calculatedModule.valueType,
      monthlyRecurringValue: current.monthlyRecurringValue + monthly,
      annualRecurringValue: current.annualRecurringValue + annual,
      annualOnlyValue: current.annualOnlyValue + annualOnly,
      annualEconomicOpportunity:
        current.annualEconomicOpportunity + annual + annualOnly,
    });
    if (outputs.informationalCapitalValue) {
      informationalCapitalValueTotal += outputs.informationalCapitalValue;
      informationalCapitalValues.push({
        moduleKey: calculatedModule.moduleKey,
        analysisModuleId: calculatedModule.analysisModuleId,
        value: outputs.informationalCapitalValue,
      });
    }
  }
  for (const custom of customOpportunities) {
    if (custom.status !== "COMPLETE") continue;
    const monthly = custom.monthlyRecurringValue ?? 0;
    const annual = custom.annualRecurringValue ?? 0;
    const annualOnly = custom.annualOnlyValue ?? 0;
    monthlyRecurringValueTotal += monthly;
    annualRecurringValueTotal += annual;
    annualOnlyValueTotal += annualOnly;
    const current = breakdown.get(custom.valueClassification) ?? { valueType: custom.valueClassification, monthlyRecurringValue: 0, annualRecurringValue: 0, annualOnlyValue: 0, annualEconomicOpportunity: 0 };
    breakdown.set(custom.valueClassification, { valueType: custom.valueClassification, monthlyRecurringValue: current.monthlyRecurringValue + monthly, annualRecurringValue: current.annualRecurringValue + annual, annualOnlyValue: current.annualOnlyValue + annualOnly, annualEconomicOpportunity: current.annualEconomicOpportunity + annual + annualOnly });
    if (custom.informationalCapitalValue) {
      informationalCapitalValueTotal += custom.informationalCapitalValue;
      informationalCapitalValues.push({ customOpportunityId: custom.id, title: custom.title, value: custom.informationalCapitalValue });
    }
  }
  const completeModuleCount = modules.filter(
    (calculatedModule) =>
      calculatedModule.status === "COMPLETE" &&
      calculatedModule.calculationOutcome?.success,
  ).length + customOpportunities.filter((custom) => custom.status === "COMPLETE").length;
  return {
    monthlyRecurringValueTotal,
    annualRecurringValueTotal,
    annualOnlyValueTotal,
    totalIdentifiedAnnualEconomicOpportunity:
      annualRecurringValueTotal + annualOnlyValueTotal,
    informationalCapitalValueTotal,
    valueTypeBreakdown: [...breakdown.values()],
    informationalCapitalValues,
    moduleCount: modules.length + customOpportunities.length,
    completeModuleCount,
    incompleteModuleCount: modules.length + customOpportunities.length - completeModuleCount,
  };
}

export function deriveAnalysisWorkflowReadiness(
  summary: AnalysisCalculationSummary,
) {
  const hasSelectedModules = summary.moduleCount > 0;
  const allSelectedModulesComplete =
    hasSelectedModules && summary.incompleteModuleCount === 0;
  return {
    hasSelectedModules,
    allSelectedModulesComplete,
    canReview: allSelectedModulesComplete,
    canGeneratePresentation: allSelectedModulesComplete,
  };
}

type InvestmentRecordFields = {
  investmentOneTimeCost: number | null;
  investmentAnnualRecurringCost: number | null;
  investmentChangeManagementCost: number | null;
  roiHorizonYears: number | null;
  roiDiscountRatePct: number | null;
  adoptionSchedulePctJson: string | null;
};

function parseAdoptionSchedule(json: string | null): { schedule: number[] | null; integrityError: boolean } {
  if (json === null) return { schedule: null, integrityError: false };
  try {
    const parsed: unknown = JSON.parse(json);
    if (Array.isArray(parsed)) {
      return { schedule: parsed as number[], integrityError: false };
    }
  } catch {
    // A persisted but malformed schedule is an integrity error; do not silently default it.
  }
  return { schedule: null, integrityError: true };
}

export function toAnalysisInvestment(
  record: InvestmentRecordFields,
): AnalysisInvestment {
  const parsedSchedule = parseAdoptionSchedule(record.adoptionSchedulePctJson);
  return {
    investmentOneTimeCost: record.investmentOneTimeCost,
    investmentAnnualRecurringCost: record.investmentAnnualRecurringCost,
    investmentChangeManagementCost: record.investmentChangeManagementCost,
    roiHorizonYears: record.roiHorizonYears,
    roiDiscountRatePct: record.roiDiscountRatePct,
    adoptionSchedulePct: parsedSchedule.schedule,
    adoptionScheduleIntegrityError: parsedSchedule.integrityError,
  };
}

/**
 * Derive finance-grade ROI for an explicit gross annual benefit and the
 * seller-entered investment. Returns `null` when there is no positive one-time
 * investment. Shared by the base ROI derivation and the scenario engine so
 * conservative/expected/aggressive cases stay consistent with the headline ROI.
 */
export function deriveRoiForAnnualValue(
  investment: AnalysisInvestment,
  annualValue: number,
): RoiMetrics | null {
  const oneTime = investment.investmentOneTimeCost ?? 0;
  const changeManagement = investment.investmentChangeManagementCost ?? 0;
  const totalInvestment = oneTime + changeManagement;
  if (!(totalInvestment > 0)) return null;
  const horizonYears = investment.roiHorizonYears ?? DEFAULT_ROI_HORIZON_YEARS;
  const adoptionSchedulePct = investment.adoptionSchedulePct ?? undefined;
  const outcome = calculateRoi({
    annualValue,
    investment: totalInvestment,
    annualRecurringCost: investment.investmentAnnualRecurringCost ?? 0,
    horizonYears,
    discountRatePct: investment.roiDiscountRatePct ?? DEFAULT_ANALYSIS_DISCOUNT_RATE,
    adoptionSchedulePct,
  });
  return outcome.success ? outcome.result : null;
}

/**
 * Derive finance-grade ROI from the identified opportunity and the seller-entered
 * investment. Returns `null` when there is no positive one-time investment, so
 * identified-opportunity-only analyses are unaffected.
 */
export function deriveAnalysisRoi(
  investment: AnalysisInvestment,
  summary: AnalysisCalculationSummary,
): RoiMetrics | null {
  return deriveRoiForAnnualValue(
    investment,
    summary.totalIdentifiedAnnualEconomicOpportunity,
  );
}

/**
 * Persist seller-entered investment inputs and ROI assumptions on the analysis.
 * A save replaces the entire investment block, so omitting a field clears it.
 */
export async function saveAnalysisInvestment(args: {
  analysisId: string;
  input: AnalysisInvestmentInput;
  db?: Db;
}): Promise<ServiceResult<AnalysisInvestment>> {
  const db = args.db ?? defaultPrisma;
  const parsed = analysisInvestmentSchema.safeParse(args.input);
  if (!parsed.success) {
    return err(
      "INVALID_INVESTMENT_INPUT",
      parsed.error.issues.map((issue) => issue.message).join(" "),
    );
  }
  const existing = await db.analysis.findUnique({
    where: { id: args.analysisId },
  });
  if (!existing) return err("ANALYSIS_NOT_FOUND", "Analysis was not found.");

  const data = parsed.data;
  const horizonYears =
    data.roiHorizonYears ?? existing.roiHorizonYears ?? DEFAULT_ROI_HORIZON_YEARS;
  if (data.adoptionSchedulePct && data.adoptionSchedulePct.length !== horizonYears) {
    return err(
      "INVALID_INVESTMENT_INPUT",
      "Adoption schedule must provide exactly one value per horizon year.",
    );
  }

  const updated = await db.analysis.update({
    where: { id: args.analysisId },
    data: {
      investmentOneTimeCost: data.investmentOneTimeCost ?? null,
      investmentAnnualRecurringCost: data.investmentAnnualRecurringCost ?? null,
      investmentChangeManagementCost: data.investmentChangeManagementCost ?? null,
      roiHorizonYears: data.roiHorizonYears ?? null,
      roiDiscountRatePct: data.roiDiscountRatePct ?? null,
      adoptionSchedulePctJson: data.adoptionSchedulePct
        ? JSON.stringify(data.adoptionSchedulePct)
        : null,
    },
  });
  return ok(toAnalysisInvestment(updated));
}

export async function calculateAnalysis(args: {
  analysisId: string;
  db?: Db;
}): Promise<ServiceResult<CalculatedAnalysis>> {
  const db = args.db ?? defaultPrisma;
  const analysis = await db.analysis.findUnique({
    where: { id: args.analysisId },
    include: { modules: { include: { inputs: true } }, customOpportunities: { include: { assumptions: true } } },
  });
  if (!analysis) return err("ANALYSIS_NOT_FOUND", "Analysis was not found.");
  const calculated: CalculatedAnalysisModule[] = [];
  for (const selectedAnalysisModule of analysis.modules) {
    const result = await calculateAnalysisModuleRecord(
      db,
      selectedAnalysisModule,
      analysis,
    );
    if (!result.ok) {
      if (result.error.code === "MODULE_NOT_FOUND") {
        return err(
          "ANALYSIS_MODULE_INTEGRITY_ERROR",
          `Analysis contains an invalid selected opportunity key (${selectedAnalysisModule.moduleKey}). Please remove it before continuing.`,
        );
      }
      if (result.error.code === "MODULE_NOT_AVAILABLE_FOR_BUSINESS_TYPE") {
        return err(
          "ANALYSIS_MODULE_INTEGRITY_ERROR",
          `Analysis contains a selected opportunity (${selectedAnalysisModule.moduleKey}) that is incompatible with business type (${analysis.businessType}). Please remove it or restore the correct business type before continuing.`,
        );
      }
      return result;
    }
    calculated.push(result.value);
  }
  const allModules = new Map(
    getAllValueModules().map((valueModule) => [valueModule.key, valueModule]),
  );
  calculated.sort((left, right) => {
    const leftCategory =
      getCategoryByKey(left.category)?.displayOrder ?? Number.MAX_SAFE_INTEGER;
    const rightCategory =
      getCategoryByKey(right.category)?.displayOrder ?? Number.MAX_SAFE_INTEGER;
    return (
      leftCategory - rightCategory ||
      left.displayOrder - right.displayOrder ||
      (allModules.get(left.moduleKey)?.displayOrder ?? 0) -
        (allModules.get(right.moduleKey)?.displayOrder ?? 0)
    );
  });
  const customOpportunities = analysis.customOpportunities.map(toCalculatedCustomOpportunity);
  const economicCustomOpportunities = customOpportunities.filter((custom) => custom.status === "COMPLETE" && custom.valueFrequency !== "INFORMATIONAL_CAPITAL");
  const registryOverlapNotices = getOverlapNoticesForSelectedModules(
    calculated.map((calculatedModule) => calculatedModule.moduleKey),
  );
  const overlapNotices = economicCustomOpportunities.length > 0 && calculated.some((module) => module.status === "COMPLETE")
    ? [...registryOverlapNotices, { key: CUSTOM_OPPORTUNITY_OVERLAP_GROUP_KEY as never, type: "REVIEW" as const, message: CUSTOM_OPPORTUNITY_OVERLAP_MESSAGE, modules: calculated.map((module) => module.moduleKey), selectedModuleKeys: calculated.map((module) => module.moduleKey) }]
    : registryOverlapNotices;
  const persistedDispositions = (await db.analysisOverlapDisposition.findMany({ where: { analysisId: args.analysisId } }))
    .map(toOverlapDispositionRecord)
    .filter((record): record is NonNullable<typeof record> => record !== null);
  const overlapReviewStates = buildOverlapReviewStates({ notices: overlapNotices, modules: calculated, dispositions: persistedDispositions, customSourceFingerprint: economicCustomOpportunities.map((custom) => custom.sourceFingerprint).sort().join(":") });
  const summary = summarizeCalculatedModules(calculated, customOpportunities);
  const investment = toAnalysisInvestment(analysis);
  const persistedInvestmentValidation = analysisInvestmentSchema.safeParse({
    investmentOneTimeCost: investment.investmentOneTimeCost ?? undefined,
    investmentAnnualRecurringCost: investment.investmentAnnualRecurringCost ?? undefined,
    investmentChangeManagementCost: investment.investmentChangeManagementCost ?? undefined,
    roiHorizonYears: investment.roiHorizonYears ?? undefined,
    roiDiscountRatePct: investment.roiDiscountRatePct ?? undefined,
    adoptionSchedulePct: investment.adoptionSchedulePct ?? undefined,
  });
  if (!persistedInvestmentValidation.success) {
    return err("INVALID_INVESTMENT_CONFIGURATION", "Investment assumptions require correction before return metrics can be calculated.");
  }
  const totalInvestment =
    (investment.investmentOneTimeCost ?? 0) +
    (investment.investmentChangeManagementCost ?? 0);
  if (investment.adoptionScheduleIntegrityError) {
    return err("ADOPTION_SCHEDULE_INTEGRITY_ERROR", "Persisted adoption schedule is malformed and must be corrected before ROI can be calculated.");
  }
  const roi = deriveAnalysisRoi(investment, summary);
  if (investment.adoptionSchedulePct && roi === null && totalInvestment > 0) {
    return err("ADOPTION_SCHEDULE_INTEGRITY_ERROR", "Persisted adoption schedule is invalid (must match the ROI horizon, contain finite values in [0, 1], and be non-decreasing) and must be corrected before ROI can be calculated.");
  }
  return ok({
    analysis: {
      id: analysis.id,
      companyName: analysis.companyName,
      businessType: analysis.businessType,
      status: analysis.status,
    },
    calculatedModules: calculated,
    customOpportunities,
    overlapNotices,
    overlapReviewStates,
    summary,
    workflowReadiness: (() => {
      const readiness = deriveAnalysisWorkflowReadiness(summary);
      return {
        ...readiness,
        canGeneratePresentation:
          readiness.canGeneratePresentation &&
          !overlapReviewStates.some((state) => state.blocksPresentation),
      };
    })(),
    investment,
    roi,
  });
}

export async function saveOverlapDisposition(args: { analysisId: string; overlapGroupKey: string; disposition: string; acknowledgmentText?: string; db?: Db }): Promise<ServiceResult<{ overlapGroupKey: string }>> {
  const db = args.db ?? defaultPrisma;
  if (![...completedOverlapDispositions, "NEEDS_REVISION"].includes(args.disposition as never)) {
    return err("OVERLAP_REVIEW_REQUIRED", "Choose a valid overlap disposition. Exclude from totals is not enabled in this release; remove the related module instead.");
  }
  const calculated = await calculateAnalysis({ analysisId: args.analysisId, db });
  if (!calculated.ok) return calculated;
  const state = calculated.value.overlapReviewStates.find((candidate) => candidate.notice.key === args.overlapGroupKey && candidate.notice.type === "REVIEW");
  if (!state) return err("OVERLAP_REVIEW_REQUIRED", "No current review-required overlap was found for this analysis.");
  await db.analysisOverlapDisposition.upsert({
    where: { analysisId_overlapGroupKey: { analysisId: args.analysisId, overlapGroupKey: state.notice.key } },
    create: { analysisId: args.analysisId, overlapGroupKey: state.notice.key, disposition: args.disposition as never, acknowledgmentText: args.acknowledgmentText?.trim() || null, sourceFingerprint: state.sourceFingerprint, excludedModuleKeysJson: null, reviewedAt: new Date() },
    update: { disposition: args.disposition as never, acknowledgmentText: args.acknowledgmentText?.trim() || null, sourceFingerprint: state.sourceFingerprint, excludedModuleKeysJson: null, reviewedAt: new Date() },
  });
  return ok({ overlapGroupKey: state.notice.key });
}

export async function saveCustomAnalysisNarrative(args: {
  analysisModuleId: string;
  narrative: string;
  db?: Db;
}): Promise<ServiceResult<AnalysisModuleState>> {
  const db = args.db ?? defaultPrisma;
  const selectedModule = await loadModule(db, args.analysisModuleId);
  if (!selectedModule?.analysis)
    return err(
      "ANALYSIS_MODULE_NOT_FOUND",
      "Selected analysis module was not found.",
    );
  const calculated = await calculateAnalysisModuleRecord(
    db,
    selectedModule,
    selectedModule.analysis,
  );
  if (!calculated.ok) return calculated;
  if (calculated.value.status !== "COMPLETE")
    return err(
      "MODULE_NOT_COMPLETE",
      "Only complete modules can save customer analysis narratives.",
    );
  const rendered = renderCalculatedModuleNarrative({
    analysis: selectedModule.analysis,
    calculatedModule: calculated.value,
  });
  if (!rendered.ok)
    return err("NARRATIVE_RENDER_FAILED", rendered.error.message);
  const trimmed = args.narrative.trim();
  if (!trimmed)
    return err(
      "CUSTOM_NARRATIVE_REQUIRED",
      "Customer analysis narrative cannot be blank.",
    );
  const sameAsDefault =
    normalizeNarrativeForComparison(args.narrative) ===
    normalizeNarrativeForComparison(rendered.value.customerAnalysis);
  const updated = await db.analysisModule.update({
    where: { id: args.analysisModuleId },
    data: sameAsDefault
      ? {
          narrativeMode: "TEMPLATE",
          customNarrative: null,
          customNarrativeSourceFingerprint: null,
        }
      : {
          narrativeMode: "CUSTOM",
          customNarrative: args.narrative,
          customNarrativeSourceFingerprint: createNarrativeSourceFingerprint({
            module: calculated.value,
            businessType: selectedModule.analysis.businessType,
          }),
        },
    include: { inputs: true },
  });
  return ok(toState(updated, calculated.value.status));
}

export async function resetAnalysisNarrativeToTemplate(args: {
  analysisModuleId: string;
  db?: Db;
}): Promise<ServiceResult<AnalysisModuleState>> {
  const db = args.db ?? defaultPrisma;
  const selectedModule = await loadModule(db, args.analysisModuleId);
  if (!selectedModule)
    return err(
      "ANALYSIS_MODULE_NOT_FOUND",
      "Selected analysis module was not found.",
    );
  const updated = await db.analysisModule.update({
    where: { id: args.analysisModuleId },
    data: {
      narrativeMode: "TEMPLATE",
      customNarrative: null,
      customNarrativeSourceFingerprint: null,
    },
    include: { inputs: true },
  });
  return ok(toState(updated, selectedModule.status as AnalysisModuleStatus));
}

export async function moveAnalysisModule(args: {
  analysisModuleId: string;
  direction: "UP" | "DOWN";
  db?: Db;
}): Promise<ServiceResult<{ analysisModuleId: string; moved: boolean }>> {
  const db = args.db ?? defaultPrisma;
  const selectedModule = await loadModule(db, args.analysisModuleId);
  if (!selectedModule?.analysis)
    return err(
      "ANALYSIS_MODULE_NOT_FOUND",
      "Selected analysis module was not found.",
    );
  const moduleKey = parseModuleKey(selectedModule.moduleKey);
  if (!moduleKey)
    return err(
      "MODULE_NOT_FOUND",
      "Value module was not found in the canonical registry.",
    );
  const category = categoryFor(moduleKey, selectedModule.analysis.businessType);
  const siblings = (
    await db.analysisModule.findMany({
      where: { analysisId: selectedModule.analysisId },
      include: { inputs: true },
    })
  )
    .filter((candidate) => {
      const key = parseModuleKey(candidate.moduleKey);
      return key
        ? getCategoryForModule(key, selectedModule.analysis!.businessType) ===
            category
        : false;
    })
    .sort((a, b) => a.displayOrder - b.displayOrder);
  const index = siblings.findIndex(
    (candidate) => candidate.id === args.analysisModuleId,
  );
  const adjacentIndex = args.direction === "UP" ? index - 1 : index + 1;
  if (index < 0 || adjacentIndex < 0 || adjacentIndex >= siblings.length)
    return ok({ analysisModuleId: args.analysisModuleId, moved: false });
  const current = siblings[index];
  const adjacent = siblings[adjacentIndex];
  await db.$transaction([
    db.analysisModule.update({
      where: { id: current.id },
      data: { displayOrder: adjacent.displayOrder },
    }),
    db.analysisModule.update({
      where: { id: adjacent.id },
      data: { displayOrder: current.displayOrder },
    }),
  ]);
  return ok({ analysisModuleId: args.analysisModuleId, moved: true });
}

export async function createAnalysis(args: {
  input: CreateAnalysisInput;
  db?: Db;
}): Promise<ServiceResult<{ id: string }>> {
  const db = args.db ?? defaultPrisma;
  const parsed = createAnalysisSchema.safeParse(args.input);
  if (!parsed.success)
    return err(
      "INVALID_INPUT_KEY",
      parsed.error.issues.map((issue) => issue.message).join(" "),
    );
  const created = await db.analysis.create({ data: parsed.data });
  return ok({ id: created.id });
}


export async function updateAnalysisDetails(args: {
  analysisId: string;
  input: CreateAnalysisInput;
  db?: Db;
}): Promise<ServiceResult<{ id: string }>> {
  const db = args.db ?? defaultPrisma;
  const parsed = createAnalysisSchema.safeParse(args.input);
  if (!parsed.success) return err("INVALID_INPUT_KEY", parsed.error.issues.map((issue) => issue.message).join(" "));
  const existing = await db.analysis.findUnique({
    where: { id: args.analysisId },
    select: { id: true, businessType: true, _count: { select: { modules: true } } },
  });
  if (!existing) return err("ANALYSIS_NOT_FOUND", "Analysis not found.");
  if (
    existing.businessType !== parsed.data.businessType &&
    existing._count.modules > 0
  ) {
    return err(
      "BUSINESS_TYPE_CHANGE_REQUIRES_NEW_ANALYSIS",
      "Business type cannot be changed after opportunities have been selected. Create a new analysis or remove all selected opportunities first.",
    );
  }
  await db.analysis.update({ where: { id: args.analysisId }, data: parsed.data });
  return ok({ id: args.analysisId });
}

type CustomOpportunityRecord = {
  id: string; analysisId: string; title: string; shortTitle: string | null; categoryKey: string; valueClassification: string; valueFrequency: string; enteredValue: number; calculationRationale: string; howMcLeodHelps: string | null; customerBusinessImpact: string | null; presentationCallout: string | null; methodologyNote: string | null; sourceNote: string | null; version: number; status: "DRAFT" | "COMPLETE" | "NEEDS_REVISION" | "RETIRED"; displayOrder: number; assumptions: { id: string; label: string; displayValue: string; numericValue: number | null; unit: string | null; sourceNote: string | null; displayOrder: number }[];
};

function toCalculatedCustomOpportunity(record: CustomOpportunityRecord): CalculatedCustomOpportunity {
  const derived = deriveCustomValues(record.valueFrequency as "MONTHLY_RECURRING" | "ANNUAL_ONLY" | "INFORMATIONAL_CAPITAL", record.enteredValue);
  const assumptions = [...record.assumptions].sort((a, b) => a.displayOrder - b.displayOrder).map((assumption) => ({ id: assumption.id, label: assumption.label, displayValue: assumption.displayValue, numericValue: assumption.numericValue, unit: assumption.unit, sourceNote: assumption.sourceNote, displayOrder: assumption.displayOrder }));
  const base = { title: record.title, shortTitle: record.shortTitle, categoryKey: record.categoryKey as CategoryKey, valueClassification: record.valueClassification as ValueType, valueFrequency: record.valueFrequency as "MONTHLY_RECURRING" | "ANNUAL_ONLY" | "INFORMATIONAL_CAPITAL", enteredValue: record.enteredValue, calculationRationale: record.calculationRationale, assumptions, howMcLeodHelps: record.howMcLeodHelps, customerBusinessImpact: record.customerBusinessImpact, presentationCallout: record.presentationCallout, methodologyNote: record.methodologyNote, sourceNote: record.sourceNote, displayOrder: record.displayOrder, ...derived };
  const fingerprint = fingerprintCustomOpportunity(base);
  return { id: record.id, analysisId: record.analysisId, version: record.version, status: record.status, sourceFingerprint: fingerprint, narrativeStatus: customOpportunityNarrativeStatus(record), ...base };
}

export async function createCustomOpportunityDraft(args: { analysisId: string; db?: Db }): Promise<ServiceResult<{ customOpportunityId: string }>> {
  const db = args.db ?? defaultPrisma;
  const analysis = await db.analysis.findUnique({ where: { id: args.analysisId }, include: { customOpportunities: true } });
  if (!analysis) return err("ANALYSIS_NOT_FOUND", "Analysis was not found.");
  const displayOrder = (analysis.customOpportunities.reduce((max, item) => Math.max(max, item.displayOrder), 0) || 0) + DISPLAY_ORDER_STEP;
  const draft = await db.customOpportunity.create({ data: { analysisId: args.analysisId, title: "Untitled Custom Opportunity", categoryKey: analysis.businessType === "BROKERAGE" ? "BR_STRATEGIC" : "TL_STRATEGY_ANALYTICS", valueClassification: "REVENUE_MARGIN_OPPORTUNITY", valueFrequency: "MONTHLY_RECURRING", enteredValue: 0, monthlyRecurringValue: 0, annualRecurringValue: 0, calculationRationale: "Draft rationale pending seller input.", status: "DRAFT", displayOrder, sourceFingerprint: "draft" } });
  return ok({ customOpportunityId: draft.id });
}

export async function removeCustomOpportunity(args: { customOpportunityId: string; db?: Db }): Promise<ServiceResult<{ customOpportunityId: string }>> {
  const db = args.db ?? defaultPrisma;
  await db.customOpportunity.delete({ where: { id: args.customOpportunityId } });
  return ok({ customOpportunityId: args.customOpportunityId });
}

export async function saveCustomOpportunity(args: { analysisId: string; customOpportunityId: string; input: CustomOpportunityInput; db?: Db }): Promise<ServiceResult<CalculatedCustomOpportunity>> {
  const db = args.db ?? defaultPrisma;
  const current = await db.customOpportunity.findUnique({ where: { id: args.customOpportunityId }, include: { assumptions: true } });
  if (!current || current.analysisId !== args.analysisId) return err("ANALYSIS_MODULE_NOT_FOUND", "Custom opportunity was not found.");
  const validated = validateCustomOpportunityInput({ ...args.input, displayOrder: current.displayOrder });
  if (!validated.ok) return err("INVALID_INPUT_KEY", validated.issues.map((issue) => issue.message).join(" "));
  const v = validated.value;
  const updated = await db.customOpportunity.update({ where: { id: current.id }, data: { title: v.title, shortTitle: v.shortTitle, categoryKey: v.categoryKey, valueClassification: v.valueClassification, valueFrequency: v.valueFrequency, enteredValue: v.enteredValue, monthlyRecurringValue: v.monthlyRecurringValue, annualRecurringValue: v.annualRecurringValue, annualOnlyValue: v.annualOnlyValue, informationalCapitalValue: v.informationalCapitalValue, calculationRationale: v.calculationRationale, howMcLeodHelps: v.howMcLeodHelps, customerBusinessImpact: v.customerBusinessImpact, presentationCallout: v.presentationCallout, methodologyNote: v.methodologyNote, sourceNote: v.sourceNote, status: "COMPLETE", version: { increment: v.sourceFingerprint === current.sourceFingerprint ? 0 : 1 }, sourceFingerprint: v.sourceFingerprint, assumptions: { deleteMany: {}, create: v.assumptions.map((a, index) => ({ label: a.label, displayValue: a.displayValue, numericValue: a.numericValue, unit: a.unit, sourceNote: a.sourceNote, displayOrder: a.displayOrder ?? index })) } }, include: { assumptions: true } });
  return ok(toCalculatedCustomOpportunity(updated));
}
