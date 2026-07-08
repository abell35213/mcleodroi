import type { ValueModuleKey } from "@/lib/modules";
import { validationCodes } from "./errors";
import type { CalculationOutcome, ModuleCalculator, ModuleInputMap, ModuleResultMap } from "./types";
import { calculateBrokerProductivity } from "./modules/broker-productivity";
import { calculateBrokerageLtl } from "./modules/brokerage-ltl";
import { calculateDriverDetention } from "./modules/driver-detention";
import { calculateDriverTurnover } from "./modules/driver-turnover";
import { calculateEdiOrderAutomation } from "./modules/edi-order-automation";
import { calculateIncreaseUtilization } from "./modules/increase-utilization";
import { calculateInsuranceCreditMonitoring } from "./modules/insurance-credit-monitoring";
import { calculateNonOpsProductivity } from "./modules/non-ops-productivity";
import { calculateOperationsEfficiency } from "./modules/operations-efficiency";
import { calculateProfitMarginIncrease } from "./modules/profit-margin-increase";
import { calculateRecurringOrderAutomation } from "./modules/recurring-order-automation";
import { calculateReduceBillingLabor } from "./modules/reduce-billing-labor";
import { calculateReduceDeadhead } from "./modules/reduce-deadhead";
import { calculateReduceEdiVanCharges } from "./modules/reduce-edi-van-charges";
import { calculateReduceHardBillingCost } from "./modules/reduce-hard-billing-cost";
import { calculateReduceOutOfRoute } from "./modules/reduce-out-of-route";
import { calculateRfpGrowthOpportunity } from "./modules/rfp-growth-opportunity";
import { calculateRfpProcessEfficiency } from "./modules/rfp-process-efficiency";
import { calculateShortHaulEfficiency } from "./modules/short-haul-efficiency";
import { calculateStreamlineBackOffice } from "./modules/streamline-back-office";
import { calculateTrailerAssetUtilization } from "./modules/trailer-asset-utilization";

export const moduleCalculators = {
  INCREASE_UTILIZATION: calculateIncreaseUtilization,
  REDUCE_DEADHEAD: calculateReduceDeadhead,
  REDUCE_OUT_OF_ROUTE: calculateReduceOutOfRoute,
  DRIVER_DETENTION: calculateDriverDetention,
  DRIVER_TURNOVER: calculateDriverTurnover,
  STREAMLINE_BACK_OFFICE: calculateStreamlineBackOffice,
  OPERATIONS_EFFICIENCY: calculateOperationsEfficiency,
  TRAILER_ASSET_UTILIZATION: calculateTrailerAssetUtilization,
  BROKER_PRODUCTIVITY: calculateBrokerProductivity,
  INSURANCE_CREDIT_MONITORING: calculateInsuranceCreditMonitoring,
  PROFIT_MARGIN_INCREASE: calculateProfitMarginIncrease,
  NON_OPS_PRODUCTIVITY: calculateNonOpsProductivity,
  BROKERAGE_LTL: calculateBrokerageLtl,
  RECURRING_ORDER_AUTOMATION: calculateRecurringOrderAutomation,
  RFP_PROCESS_EFFICIENCY: calculateRfpProcessEfficiency,
  RFP_GROWTH_OPPORTUNITY: calculateRfpGrowthOpportunity,
  EDI_ORDER_AUTOMATION: calculateEdiOrderAutomation,
  REDUCE_EDI_VAN_CHARGES: calculateReduceEdiVanCharges,
  REDUCE_HARD_BILLING_COST: calculateReduceHardBillingCost,
  REDUCE_BILLING_LABOR: calculateReduceBillingLabor,
  SHORT_HAUL_EFFICIENCY: calculateShortHaulEfficiency,
} satisfies { readonly [K in ValueModuleKey]: ModuleCalculator<K> };

export function hasCalculationImplementation(moduleKey: string): moduleKey is ValueModuleKey {
  return Object.hasOwn(moduleCalculators, moduleKey);
}

export function calculateValueModule<K extends ValueModuleKey>(moduleKey: K, inputs: ModuleInputMap[K]): CalculationOutcome<ModuleResultMap[K]>;
export function calculateValueModule(moduleKey: string, inputs: Record<string, number>): CalculationOutcome<ModuleResultMap[ValueModuleKey]>;
export function calculateValueModule(moduleKey: string, inputs: Record<string, number>): CalculationOutcome<ModuleResultMap[ValueModuleKey]> {
  if (!hasCalculationImplementation(moduleKey)) {
    return { success: false, issues: [{ code: validationCodes.INVALID_MODULE_INPUT, message: "Unknown value module selected." }] };
  }
  const calculator = moduleCalculators[moduleKey] as (input: Record<string, number>) => CalculationOutcome<ModuleResultMap[ValueModuleKey]>;
  return calculator(inputs);
}
