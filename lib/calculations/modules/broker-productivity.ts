import type { BrokerProductivityInputs } from "../types";
import { monthlyOutputs, result, validOrIssues } from "./helpers";
import { positive, targetHigher } from "../validate";
export function calculateBrokerProductivity(inputs: BrokerProductivityInputs) {
 return validOrIssues("BROKER_PRODUCTIVITY", inputs, [...targetHigher(inputs.target_loads_per_broker_day,inputs.current_loads_per_broker_day,"target_loads_per_broker_day","Target loads per broker per day must be greater than the current average."),...positive(inputs.broker_count,"broker_count"),...positive(inputs.working_days_month,"working_days_month")], () => {
  const additional_loads_per_broker_day = inputs.target_loads_per_broker_day - inputs.current_loads_per_broker_day;
  const additional_loads_per_day = additional_loads_per_broker_day * inputs.broker_count;
  const additional_loads_per_month = additional_loads_per_day * inputs.working_days_month;
  const monthly_opportunity = additional_loads_per_month * inputs.average_margin_per_load;
  return result("BROKER_PRODUCTIVITY", monthlyOutputs(monthly_opportunity), { additional_loads_per_broker_day, additional_loads_per_day, additional_loads_per_month, monthly_opportunity });
 });
}
