import type {
  BusinessType,
  CategoryKey,
  OverlapNotice,
  ValueModuleKey,
  ValueType,
} from "@/lib/modules";
import type {
  CalculationOutcome,
  CalculationResult,
  RoiMetrics,
  ValidationIssue,
} from "@/lib/calculations";
import type { OverlapReviewState } from "./overlap-dispositions";

export const analysisModuleStatuses = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "COMPLETE",
] as const;
export type AnalysisModuleStatus = (typeof analysisModuleStatuses)[number];

export const narrativeModes = ["TEMPLATE", "CUSTOM"] as const;
export type NarrativeMode = (typeof narrativeModes)[number];

export type PersistedModuleInput = {
  readonly inputKey: string;
  readonly numericValue: number;
};

export type AnalysisModuleState = {
  readonly analysisModuleId: string;
  readonly analysisId: string;
  readonly moduleKey: ValueModuleKey;
  readonly status: AnalysisModuleStatus;
  readonly displayOrder: number;
  readonly narrativeMode: NarrativeMode;
  readonly customNarrative: string | null;
  readonly customNarrativeSourceFingerprint: string | null;
  readonly inputs: readonly PersistedModuleInput[];
};

export type CalculatedAnalysisModule = AnalysisModuleState & {
  readonly reconstructedInputs: Partial<Record<string, number>>;
  readonly missingRequiredInputKeys: readonly string[];
  readonly calculationOutcome: CalculationOutcome<CalculationResult> | null;
  readonly validationIssues: readonly ValidationIssue[];
  readonly category: CategoryKey;
  readonly valueType: ValueType;
};

export type ValueTypeSummary = {
  readonly valueType: ValueType;
  readonly monthlyRecurringValue: number;
  readonly annualRecurringValue: number;
  readonly annualOnlyValue: number;
  readonly annualEconomicOpportunity: number;
};

export type InformationalCapitalValue = {
  readonly moduleKey: ValueModuleKey;
  readonly analysisModuleId: string;
  readonly value: number;
};

export type AnalysisCalculationSummary = {
  readonly monthlyRecurringValueTotal: number;
  readonly annualRecurringValueTotal: number;
  readonly annualOnlyValueTotal: number;
  readonly totalIdentifiedAnnualEconomicOpportunity: number;
  readonly informationalCapitalValueTotal: number;
  readonly valueTypeBreakdown: readonly ValueTypeSummary[];
  readonly informationalCapitalValues: readonly InformationalCapitalValue[];
  readonly moduleCount: number;
  readonly completeModuleCount: number;
  readonly incompleteModuleCount: number;
};

export type AnalysisWorkflowReadiness = {
  readonly hasSelectedModules: boolean;
  readonly allSelectedModulesComplete: boolean;
  readonly canReview: boolean;
  readonly canGeneratePresentation: boolean;
};

/**
 * Seller-entered, per-deal investment inputs and ROI assumptions persisted on
 * the analysis. Values are `null` until a seller supplies them, keeping ROI
 * outputs opt-in.
 */
export type AnalysisInvestment = {
  readonly investmentOneTimeCost: number | null;
  readonly investmentAnnualRecurringCost: number | null;
  readonly investmentChangeManagementCost: number | null;
  readonly roiHorizonYears: number | null;
  readonly roiDiscountRatePct: number | null;
  readonly adoptionSchedulePct: readonly number[] | null;
  readonly adoptionScheduleIntegrityError?: boolean;
};

export type CalculatedAnalysis = {
  readonly analysis: {
    readonly id: string;
    readonly companyName: string;
    readonly businessType: BusinessType;
    readonly status: string;
  };
  readonly calculatedModules: readonly CalculatedAnalysisModule[];
  readonly overlapNotices: readonly OverlapNotice[];
  readonly overlapReviewStates: readonly OverlapReviewState[];
  readonly summary: AnalysisCalculationSummary;
  readonly workflowReadiness: AnalysisWorkflowReadiness;
  /** Persisted, seller-entered investment inputs (values may all be `null`). */
  readonly investment: AnalysisInvestment;
  /**
   * Finance-grade ROI outputs derived from the identified opportunity and the
   * seller-entered investment. `null` when no one-time investment is present,
   * so identified-opportunity-only analyses are unaffected.
   */
  readonly roi: RoiMetrics | null;
};

export const analysisServiceErrorCodes = [
  "ANALYSIS_NOT_FOUND",
  "ANALYSIS_MODULE_NOT_FOUND",
  "MODULE_NOT_FOUND",
  "MODULE_NOT_AVAILABLE_FOR_BUSINESS_TYPE",
  "MODULE_ALREADY_SELECTED",
  "INVALID_INPUT_KEY",
  "INPUT_NOT_FOUND",
  "MODULE_NOT_COMPLETE",
  "CUSTOM_NARRATIVE_REQUIRED",
  "NARRATIVE_RENDER_FAILED",
  "BUSINESS_TYPE_CHANGE_REQUIRES_NEW_ANALYSIS",
  "ANALYSIS_MODULE_INTEGRITY_ERROR",
  "INVALID_INVESTMENT_INPUT",
  "ADOPTION_SCHEDULE_INTEGRITY_ERROR",
  "OVERLAP_REVIEW_REQUIRED",
] as const;
export type AnalysisServiceErrorCode =
  (typeof analysisServiceErrorCodes)[number];

export type AnalysisServiceError = {
  readonly code: AnalysisServiceErrorCode;
  readonly message: string;
};

export type ServiceResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: AnalysisServiceError };
