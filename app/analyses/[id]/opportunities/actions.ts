"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { calculateAnalysis, removeAnalysisModule, selectAnalysisModule } from "@/lib/analyses/service";

export async function toggleModuleAction(analysisId: string, moduleKey: string, analysisModuleId?: string) {
  const result = analysisModuleId ? await removeAnalysisModule({ analysisModuleId }) : await selectAnalysisModule({ analysisId, moduleKey });
  if (!result.ok) throw new Error(result.error.message);
  revalidatePath(`/analyses/${analysisId}/opportunities`);
}

export async function continueToAssessmentAction(analysisId: string) {
  const calculated = await calculateAnalysis({ analysisId });
  if (!calculated.ok || calculated.value.calculatedModules.length === 0) return;
  redirect(`/analyses/${analysisId}/assessment`);
}
