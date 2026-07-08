import type { IncreaseUtilizationInputs } from "../types";
import { monthlyOutputs, result, validOrIssues } from "./helpers";
import { positive } from "../validate";
export function calculateIncreaseUtilization(inputs: IncreaseUtilizationInputs) {
 return validOrIssues("INCREASE_UTILIZATION", inputs, [...positive(inputs.monthly_miles,"monthly_miles"),...positive(inputs.monthly_loads,"monthly_loads")], () => {
  const average_miles_per_load = inputs.monthly_miles / inputs.monthly_loads;
  const additional_productive_miles = inputs.monthly_miles * inputs.utilization_improvement_pct;
  const estimated_additional_loads = additional_productive_miles / average_miles_per_load;
  const additional_revenue_capacity = estimated_additional_loads * inputs.average_revenue_per_load;
  const monthly_opportunity = additional_revenue_capacity * inputs.incremental_margin_pct;
  return result("INCREASE_UTILIZATION", monthlyOutputs(monthly_opportunity), { average_miles_per_load, additional_productive_miles, estimated_additional_loads, additional_revenue_capacity, monthly_opportunity });
 });
}
