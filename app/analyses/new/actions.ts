"use server";

import { redirect } from "next/navigation";
import { createAnalysis } from "@/lib/analyses/service";
import { createAnalysisSchema } from "@/lib/validation/analysis";

export type CreateAnalysisFormState = { errors?: Record<string, string>; message?: string };

export async function createAnalysisAction(_state: CreateAnalysisFormState, formData: FormData): Promise<CreateAnalysisFormState> {
  const raw = {
    companyName: formData.get("companyName"),
    customerContact: formData.get("customerContact") || undefined,
    businessType: formData.get("businessType"),
    preparedBy: formData.get("preparedBy"),
    analysisDate: formData.get("analysisDate"),
  };
  const parsed = createAnalysisSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0] ?? "form"), issue.message])) };
  }
  const result = await createAnalysis({ input: parsed.data });
  if (!result.ok) return { message: result.error.message };
  redirect(`/analyses/${result.value.id}/opportunities`);
}
