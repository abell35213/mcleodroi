"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { moveAnalysisModule, resetAnalysisNarrativeToTemplate, saveCustomAnalysisNarrative } from "@/lib/analyses/service";

export async function saveNarrativeAction(analysisId: string, analysisModuleId: string, formData: FormData) {
  await saveCustomAnalysisNarrative({ analysisModuleId, narrative: String(formData.get("narrative") ?? "") });
  revalidatePath(`/analyses/${analysisId}/review`);
}

export async function resetNarrativeAction(analysisId: string, analysisModuleId: string) {
  await resetAnalysisNarrativeToTemplate({ analysisModuleId });
  revalidatePath(`/analyses/${analysisId}/review`);
}

export async function moveModuleAction(analysisId: string, analysisModuleId: string, direction: "UP" | "DOWN") {
  await moveAnalysisModule({ analysisModuleId, direction });
  revalidatePath(`/analyses/${analysisId}/review`);
  redirect(`/analyses/${analysisId}/review`);
}
