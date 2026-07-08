import type { TrailerAssetUtilizationInputs } from "../types";
import { result, validOrIssues } from "./helpers";
import { positive } from "../validate";
export function calculateTrailerAssetUtilization(inputs: TrailerAssetUtilizationInputs) {
 return validOrIssues("TRAILER_ASSET_UTILIZATION", inputs, [...positive(inputs.trailer_count,"trailer_count"),...positive(inputs.tractor_count,"tractor_count"),...positive(inputs.asset_life_months,"asset_life_months")], () => {
  const current_trailer_ratio = inputs.trailer_count / inputs.tractor_count;
  const target_trailer_ratio = current_trailer_ratio * (1 - inputs.ratio_improvement_pct);
  const target_trailer_requirement = inputs.tractor_count * target_trailer_ratio;
  const avoided_trailers = inputs.trailer_count - target_trailer_requirement;
  const avoided_capital_investment = avoided_trailers * inputs.average_trailer_value;
  const depreciable_value_pct = 1 - inputs.residual_value_pct;
  const monthly_equivalent_value = avoided_capital_investment * depreciable_value_pct / inputs.asset_life_months;
  return result("TRAILER_ASSET_UTILIZATION", { monthlyRecurringValue: monthly_equivalent_value, annualRecurringValue: monthly_equivalent_value * 12, informationalCapitalValue: avoided_capital_investment }, { current_trailer_ratio, target_trailer_ratio, target_trailer_requirement, avoided_trailers, avoided_capital_investment, depreciable_value_pct, monthly_equivalent_value });
 });
}
