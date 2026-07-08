import type { RecurringOrderAutomationInputs } from "../types";
import { monthlyOutputs, result, validOrIssues } from "./helpers";
import { valueNotMoreThanCurrent } from "../validate";
export function calculateRecurringOrderAutomation(inputs: RecurringOrderAutomationInputs) {
 return validOrIssues("RECURRING_ORDER_AUTOMATION", inputs, valueNotMoreThanCurrent(inputs.hours_saved_month, inputs.current_recurring_order_hours_month, "hours_saved_month", "Hours saved cannot exceed the current monthly manual hours."), () => {
  const remaining_recurring_order_hours = inputs.current_recurring_order_hours_month - inputs.hours_saved_month;
  const monthly_capacity_value = inputs.hours_saved_month * inputs.hourly_labor_rate;
  return result("RECURRING_ORDER_AUTOMATION", monthlyOutputs(monthly_capacity_value), { remaining_recurring_order_hours, monthly_capacity_value });
 });
}
