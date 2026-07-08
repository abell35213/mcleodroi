import type { DriverDetentionInputs } from "../types";
import { monthlyOutputs, result, validOrIssues } from "./helpers";
import { valueNotMoreThanCurrent } from "../validate";
export function calculateDriverDetention(inputs: DriverDetentionInputs) {
 return validOrIssues("DRIVER_DETENTION", inputs, valueNotMoreThanCurrent(inputs.recoverable_detention_hours_month,inputs.unrecovered_detention_hours_month,"recoverable_detention_hours_month","Recoverable detention hours cannot exceed currently unrecovered detention hours."), () => {
  const remaining_unrecovered_hours = inputs.unrecovered_detention_hours_month - inputs.recoverable_detention_hours_month;
  const monthly_opportunity = inputs.recoverable_detention_hours_month * inputs.detention_rate_per_hour;
  return result("DRIVER_DETENTION", monthlyOutputs(monthly_opportunity), { remaining_unrecovered_hours, monthly_opportunity });
 });
}
