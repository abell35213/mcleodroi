import type { ReduceEdiVanChargesInputs } from "../types";
import { monthlyOutputs, result, validOrIssues } from "./helpers";
export function calculateReduceEdiVanCharges(inputs: ReduceEdiVanChargesInputs) {
 return validOrIssues("REDUCE_EDI_VAN_CHARGES", inputs, [], () => {
  const remaining_van_cost = inputs.monthly_van_cost * (1 - inputs.eliminated_cost_pct);
  const monthly_opportunity = inputs.monthly_van_cost * inputs.eliminated_cost_pct;
  return result("REDUCE_EDI_VAN_CHARGES", monthlyOutputs(monthly_opportunity), { remaining_van_cost, monthly_opportunity });
 });
}
