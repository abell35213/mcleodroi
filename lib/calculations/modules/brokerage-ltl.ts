import type { BrokerageLtlInputs } from "../types";
import { monthlyOutputs, result, validOrIssues } from "./helpers";
import { valueNotMoreThanCurrent } from "../validate";
export function calculateBrokerageLtl(inputs: BrokerageLtlInputs) {
 return validOrIssues("BROKERAGE_LTL", inputs, valueNotMoreThanCurrent(inputs.hours_saved_month, inputs.current_manual_hours_month, "hours_saved_month", "Hours saved cannot exceed the current monthly manual hours."), () => {
  const remaining_manual_hours = inputs.current_manual_hours_month - inputs.hours_saved_month;
  const monthly_capacity_value = inputs.hours_saved_month * inputs.hourly_labor_rate;
  return result("BROKERAGE_LTL", monthlyOutputs(monthly_capacity_value), { remaining_manual_hours, monthly_capacity_value });
 });
}
