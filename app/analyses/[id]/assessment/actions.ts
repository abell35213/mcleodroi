"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearAnalysisModuleInput, removeAnalysisModule, saveAnalysisModuleInputs } from "@/lib/analyses/service";
import { getValueModule } from "@/lib/modules";
import { toEngineInputValue } from "@/lib/analyses/ui";

export async function saveInputsAction(analysisId: string, analysisModuleId: string, moduleKey: string, formData: FormData) {
  const definition = getValueModule(moduleKey as never);
  const inputs: Record<string, number> = {};
  const clears: string[] = [];
  for (const input of definition.inputDefinitions) {
    const raw = String(formData.get(input.key) ?? "").trim();
    if (raw === "") {
      clears.push(input.key);
      continue;
    }

    const numeric = Number(raw);
    if (!Number.isFinite(numeric)) {
      clears.push(input.key);
      continue;
    }

    inputs[input.key] = toEngineInputValue(input, numeric);
  }
  if (Object.keys(inputs).length) await saveAnalysisModuleInputs({ analysisModuleId, inputs });
  for (const inputKey of clears) await clearAnalysisModuleInput({ analysisModuleId, inputKey });
  revalidatePath(`/analyses/${analysisId}/assessment`);
  redirect(`/analyses/${analysisId}/assessment?module=${moduleKey}`);
}

export async function removeFromAssessmentAction(analysisId: string, analysisModuleId: string) {
  await removeAnalysisModule({ analysisModuleId });
  revalidatePath(`/analyses/${analysisId}/assessment`);
  redirect(`/analyses/${analysisId}/assessment`);
}
