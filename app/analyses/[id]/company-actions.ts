"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { updateAnalysisDetails } from "@/lib/analyses/service";
import { createAnalysisSchema } from "@/lib/validation/analysis";

export type UpdateAnalysisDetailsState = { errors?: Record<string, string>; message?: string };

export async function updateAnalysisDetailsAction(analysisId: string, _state: UpdateAnalysisDetailsState, formData: FormData): Promise<UpdateAnalysisDetailsState> {
  const raw = {
    companyName: formData.get("companyName"),
    customerContact: formData.get("customerContact") || undefined,
    businessType: formData.get("businessType"),
    preparedBy: formData.get("preparedBy"),
    analysisDate: formData.get("analysisDate"),
  };
  const parsed = createAnalysisSchema.safeParse(raw);
  if (!parsed.success) return { errors: Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0] ?? "form"), issue.message])) };
  const result = await updateAnalysisDetails({ analysisId, input: parsed.data });
  if (!result.ok) return { message: result.error.message };
  revalidatePath(`/analyses/${analysisId}`);
  redirect(`/analyses/${analysisId}/opportunities`);
}
