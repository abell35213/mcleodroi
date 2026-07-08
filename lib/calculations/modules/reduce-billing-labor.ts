import type { ReduceBillingLaborInputs } from "../types";
import { monthlyOutputs, result, validOrIssues } from "./helpers";
import { valueNotMoreThanCurrent } from "../validate";
export function calculateReduceBillingLabor(inputs: ReduceBillingLaborInputs) {
 return validOrIssues("REDUCE_BILLING_LABOR", inputs, valueNotMoreThanCurrent(inputs.billing_hours_saved_month, inputs.current_billing_hours_month, "billing_hours_saved_month", "Hours saved cannot exceed the current monthly manual hours."), () => {
  const remaining_manual_hours = inputs.current_billing_hours_month - inputs.billing_hours_saved_month;
  const monthly_capacity_value = inputs.billing_hours_saved_month * inputs.hourly_labor_rate;
  return result("REDUCE_BILLING_LABOR", monthlyOutputs(monthly_capacity_value), { remaining_manual_hours, monthly_capacity_value });
 });
}
