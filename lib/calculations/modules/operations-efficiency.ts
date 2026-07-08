import type { OperationsEfficiencyInputs } from "../types";
import { monthlyOutputs, result, validOrIssues } from "./helpers";
import { positive } from "../validate";
export function calculateOperationsEfficiency(inputs: OperationsEfficiencyInputs) {
 return validOrIssues("OPERATIONS_EFFICIENCY", inputs, [...positive(inputs.operations_staff_count,"operations_staff_count"),...positive(inputs.working_days_month,"working_days_month")], () => {
  const monthly_operations_hours = inputs.operations_staff_count * inputs.working_days_month * 8;
  const addressable_operations_hours = monthly_operations_hours * inputs.redundant_activity_pct;
  const monthly_capacity_value = addressable_operations_hours * inputs.hourly_labor_rate;
  return result("OPERATIONS_EFFICIENCY", monthlyOutputs(monthly_capacity_value), { monthly_operations_hours, addressable_operations_hours, monthly_capacity_value });
 });
}
