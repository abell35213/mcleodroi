import type { RfpProcessEfficiencyInputs } from "../types";
import { monthlyOutputs, result, validOrIssues } from "./helpers";
import { positive, targetLower } from "../validate";
export function calculateRfpProcessEfficiency(inputs: RfpProcessEfficiencyInputs) {
 return validOrIssues("RFP_PROCESS_EFFICIENCY", inputs, [...positive(inputs.current_minutes_per_rfp,"current_minutes_per_rfp"),...positive(inputs.rfps_per_month,"rfps_per_month"),...targetLower(inputs.target_minutes_per_rfp,inputs.current_minutes_per_rfp,"target_minutes_per_rfp","Target minutes per RFP must be lower than current minutes per RFP.")], () => {
  const minutes_saved_per_rfp = inputs.current_minutes_per_rfp - inputs.target_minutes_per_rfp;
  const current_hours_month = inputs.current_minutes_per_rfp * inputs.rfps_per_month / 60;
  const target_hours_month = inputs.target_minutes_per_rfp * inputs.rfps_per_month / 60;
  const hours_recovered_month = minutes_saved_per_rfp * inputs.rfps_per_month / 60;
  const monthly_capacity_value = hours_recovered_month * inputs.hourly_labor_rate;
  return result("RFP_PROCESS_EFFICIENCY", monthlyOutputs(monthly_capacity_value), { minutes_saved_per_rfp, current_hours_month, target_hours_month, hours_recovered_month, monthly_capacity_value });
 });
}
