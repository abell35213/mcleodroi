import type { InsuranceCreditMonitoringInputs } from "../types";
import { monthlyOutputs, result, validOrIssues } from "./helpers";
export function calculateInsuranceCreditMonitoring(inputs: InsuranceCreditMonitoringInputs) {
 return validOrIssues("INSURANCE_CREDIT_MONITORING", inputs, [], () => {
  const monthly_capacity_value = inputs.admin_hours_saved_month * inputs.hourly_labor_rate;
  return result("INSURANCE_CREDIT_MONITORING", monthlyOutputs(monthly_capacity_value), { monthly_capacity_value });
 });
}
