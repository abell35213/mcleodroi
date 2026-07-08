import type { StreamlineBackOfficeInputs } from "../types";
import { monthlyOutputs, result, validOrIssues } from "./helpers";
import { positive } from "../validate";
export function calculateStreamlineBackOffice(inputs: StreamlineBackOfficeInputs) {
 return validOrIssues("STREAMLINE_BACK_OFFICE", inputs, [...positive(inputs.non_ops_staff_count,"non_ops_staff_count"),...positive(inputs.working_days_month,"working_days_month")], () => {
  const monthly_staff_hours = inputs.non_ops_staff_count * inputs.working_days_month * 8;
  const addressable_hours = monthly_staff_hours * inputs.redundant_activity_pct;
  const monthly_capacity_value = addressable_hours * inputs.hourly_labor_rate;
  return result("STREAMLINE_BACK_OFFICE", monthlyOutputs(monthly_capacity_value), { monthly_staff_hours, addressable_hours, monthly_capacity_value });
 });
}
