import type { ProfitMarginIncreaseInputs } from "../types";
import { monthlyOutputs, result, validOrIssues } from "./helpers";
import { targetHigher } from "../validate";
export function calculateProfitMarginIncrease(inputs: ProfitMarginIncreaseInputs) {
 return validOrIssues("PROFIT_MARGIN_INCREASE", inputs, targetHigher(inputs.target_margin_pct,inputs.current_margin_pct,"target_margin_pct","Target margin percentage must be greater than current margin percentage."), () => {
  const margin_improvement_points = inputs.target_margin_pct - inputs.current_margin_pct;
  const current_monthly_gross_margin = inputs.monthly_gross_revenue * inputs.current_margin_pct;
  const target_monthly_gross_margin = inputs.monthly_gross_revenue * inputs.target_margin_pct;
  const monthly_opportunity = inputs.monthly_gross_revenue * margin_improvement_points;
  return result("PROFIT_MARGIN_INCREASE", monthlyOutputs(monthly_opportunity), { margin_improvement_points, current_monthly_gross_margin, target_monthly_gross_margin, monthly_opportunity });
 });
}
