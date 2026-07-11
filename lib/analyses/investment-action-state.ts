import type { AnalysisInvestmentInput } from "@/lib/validation/analysis";

export type InvestmentFieldKey = keyof AnalysisInvestmentInput;
export type InvestmentFormValues = Record<InvestmentFieldKey, string>;
export type InvestmentActionState = {
  status: "IDLE" | "SUCCESS" | "ERROR";
  message?: string;
  fieldErrors?: Partial<Record<InvestmentFieldKey, string[]>>;
  submittedValues?: InvestmentFormValues;
};

export const initialInvestmentActionState: InvestmentActionState = { status: "IDLE" };
