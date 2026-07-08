import type { ReduceOutOfRouteInputs } from "../types";
import { monthlyOutputs, result, validOrIssues } from "./helpers";
import { positive, targetLower } from "../validate";
export function calculateReduceOutOfRoute(inputs: ReduceOutOfRouteInputs) {
 return validOrIssues("REDUCE_OUT_OF_ROUTE", inputs, [...positive(inputs.tractor_count,"tractor_count"),...positive(inputs.miles_per_tractor_month,"miles_per_tractor_month"),...positive(inputs.average_mpg,"average_mpg"),...targetLower(inputs.target_oor_pct,inputs.current_oor_pct,"target_oor_pct","Target out-of-route percentage must be lower than the current out-of-route percentage.")], () => {
  const monthly_fleet_miles = inputs.tractor_count * inputs.miles_per_tractor_month;
  const oor_improvement_pct = inputs.current_oor_pct - inputs.target_oor_pct;
  const avoided_oor_miles = monthly_fleet_miles * oor_improvement_pct;
  const avoided_fuel_gallons = avoided_oor_miles / inputs.average_mpg;
  const monthly_opportunity = avoided_fuel_gallons * inputs.fuel_cost_per_gallon;
  return result("REDUCE_OUT_OF_ROUTE", monthlyOutputs(monthly_opportunity), { monthly_fleet_miles, oor_improvement_pct, avoided_oor_miles, avoided_fuel_gallons, monthly_opportunity });
 });
}
