import type { DriverTurnoverInputs } from "../types";
import { result, validOrIssues } from "./helpers";
import { positive, targetLower } from "../validate";
export function calculateDriverTurnover(inputs: DriverTurnoverInputs) {
 return validOrIssues("DRIVER_TURNOVER", inputs, [...positive(inputs.driver_count,"driver_count"),...targetLower(inputs.target_annual_turnover_pct,inputs.current_annual_turnover_pct,"target_annual_turnover_pct","Target annual turnover percentage must be lower than current annual turnover percentage.")], () => {
  const turnover_improvement_pct = inputs.current_annual_turnover_pct - inputs.target_annual_turnover_pct;
  const avoided_driver_replacements_annual = turnover_improvement_pct * inputs.driver_count;
  const annual_opportunity = avoided_driver_replacements_annual * inputs.recruiting_cost_per_driver;
  const monthly_equivalent = annual_opportunity / 12;
  return result("DRIVER_TURNOVER", { annualOnlyValue: annual_opportunity }, { turnover_improvement_pct, avoided_driver_replacements_annual, annual_opportunity, monthly_equivalent });
 });
}
