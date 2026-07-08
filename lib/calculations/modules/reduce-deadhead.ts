import type { ReduceDeadheadInputs } from "../types";
import { monthlyOutputs, result, validOrIssues } from "./helpers";
import { positive, targetLower } from "../validate";
export function calculateReduceDeadhead(inputs: ReduceDeadheadInputs) {
 return validOrIssues("REDUCE_DEADHEAD", inputs, [...positive(inputs.monthly_miles,"monthly_miles"),...targetLower(inputs.target_deadhead_pct,inputs.current_deadhead_pct,"target_deadhead_pct","Target deadhead percentage must be lower than the current deadhead percentage.")], () => {
  const deadhead_improvement_pct = inputs.current_deadhead_pct - inputs.target_deadhead_pct;
  const avoided_deadhead_miles = deadhead_improvement_pct * inputs.monthly_miles;
  const monthly_opportunity = avoided_deadhead_miles * inputs.variable_cost_per_mile;
  return result("REDUCE_DEADHEAD", monthlyOutputs(monthly_opportunity), { deadhead_improvement_pct, avoided_deadhead_miles, monthly_opportunity });
 });
}
