import type { EdiOrderAutomationInputs } from "../types";
import { monthlyOutputs, result, validOrIssues } from "./helpers";
export function calculateEdiOrderAutomation(inputs: EdiOrderAutomationInputs) {
 return validOrIssues("EDI_ORDER_AUTOMATION", inputs, [], () => {
  const minutes_recovered_month = inputs.edi_eligible_orders_month * inputs.minutes_saved_per_order;
  const hours_recovered_month = minutes_recovered_month / 60;
  const monthly_capacity_value = hours_recovered_month * inputs.hourly_labor_rate;
  return result("EDI_ORDER_AUTOMATION", monthlyOutputs(monthly_capacity_value), { minutes_recovered_month, hours_recovered_month, monthly_capacity_value });
 });
}
