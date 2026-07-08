import type { RfpGrowthOpportunityInputs } from "../types";
import { WEEKS_PER_MONTH } from "../constants";
import { monthlyOutputs, result, validOrIssues } from "./helpers";
export function calculateRfpGrowthOpportunity(inputs: RfpGrowthOpportunityInputs) {
 return validOrIssues("RFP_GROWTH_OPPORTUNITY", inputs, [], () => {
  const weeks_per_month = WEEKS_PER_MONTH;
  const additional_loads_month = inputs.additional_loads_week * WEEKS_PER_MONTH;
  const monthly_opportunity = additional_loads_month * inputs.average_margin_per_load;
  return result("RFP_GROWTH_OPPORTUNITY", monthlyOutputs(monthly_opportunity), { weeks_per_month, additional_loads_month, monthly_opportunity });
 });
}
