import type { NonOpsProductivityInputs } from "../types";
import { monthlyOutputs, result, validOrIssues } from "./helpers";
export function calculateNonOpsProductivity(inputs: NonOpsProductivityInputs) {
 return validOrIssues("NON_OPS_PRODUCTIVITY", inputs, [], () => {
  const monthly_capacity_value = inputs.redundant_hours_month * inputs.hourly_labor_rate;
  return result("NON_OPS_PRODUCTIVITY", monthlyOutputs(monthly_capacity_value), { monthly_capacity_value });
 });
}
