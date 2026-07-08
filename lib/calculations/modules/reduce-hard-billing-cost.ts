import type { ReduceHardBillingCostInputs } from "../types";
import { monthlyOutputs, result, validOrIssues } from "./helpers";
import { valueNotMoreThanCurrent } from "../validate";
export function calculateReduceHardBillingCost(inputs: ReduceHardBillingCostInputs) {
 return validOrIssues("REDUCE_HARD_BILLING_COST", inputs, valueNotMoreThanCurrent(inputs.invoices_converted_month,inputs.paper_invoices_month,"invoices_converted_month","Invoices converted cannot exceed current paper invoices."), () => {
  const remaining_paper_invoices = inputs.paper_invoices_month - inputs.invoices_converted_month;
  const monthly_opportunity = inputs.invoices_converted_month * inputs.hard_cost_per_invoice;
  return result("REDUCE_HARD_BILLING_COST", monthlyOutputs(monthly_opportunity), { remaining_paper_invoices, monthly_opportunity });
 });
}
