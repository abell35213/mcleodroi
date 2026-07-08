import type { ShortHaulEfficiencyInputs } from "../types";
import { WEEKS_PER_MONTH } from "../constants";
import { monthlyOutputs, result, validOrIssues } from "./helpers";
import { positive, targetLower } from "../validate";
export function calculateShortHaulEfficiency(inputs: ShortHaulEfficiencyInputs) {
 return validOrIssues("SHORT_HAUL_EFFICIENCY", inputs, [...positive(inputs.current_minutes_per_ticket,"current_minutes_per_ticket"),...targetLower(inputs.target_minutes_per_ticket,inputs.current_minutes_per_ticket,"target_minutes_per_ticket","Target minutes per ticket must be lower than current minutes per ticket.")], () => {
  const weeks_per_month = WEEKS_PER_MONTH;
  const minutes_saved_per_ticket = inputs.current_minutes_per_ticket - inputs.target_minutes_per_ticket;
  const monthly_ticket_volume = inputs.tickets_per_week * WEEKS_PER_MONTH;
  const hours_recovered_month = monthly_ticket_volume * minutes_saved_per_ticket / 60;
  const gross_capacity_value = hours_recovered_month * inputs.hourly_labor_rate;
  const monthly_transaction_cost = monthly_ticket_volume * inputs.transaction_cost_per_ticket;
  const monthly_net_value = gross_capacity_value - monthly_transaction_cost;
  return result("SHORT_HAUL_EFFICIENCY", monthlyOutputs(monthly_net_value), { weeks_per_month, minutes_saved_per_ticket, monthly_ticket_volume, hours_recovered_month, gross_capacity_value, monthly_transaction_cost, monthly_net_value });
 });
}
