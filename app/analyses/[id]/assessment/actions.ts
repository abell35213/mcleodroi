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

import { createCustomOpportunityDraft, removeCustomOpportunity, saveCustomOpportunity } from "@/lib/analyses/service";

export async function addAnotherCustomOpportunityAction(analysisId: string) {
  const result = await createCustomOpportunityDraft({ analysisId });
  if (!result.ok) throw new Error(result.error.message);
  revalidatePath(`/analyses/${analysisId}/assessment`);
  redirect(`/analyses/${analysisId}/assessment?custom=${result.value.customOpportunityId}`);
}

export async function removeCustomOpportunityAction(analysisId: string, customOpportunityId: string) {
  await removeCustomOpportunity({ customOpportunityId });
  revalidatePath(`/analyses/${analysisId}/assessment`);
  redirect(`/analyses/${analysisId}/assessment`);
}

export async function saveCustomOpportunityAction(analysisId: string, customOpportunityId: string, formData: FormData) {
  const assumptions = Array.from({ length: 8 }, (_, index) => ({ label: String(formData.get(`assumptionLabel${index}`) ?? ""), displayValue: String(formData.get(`assumptionValue${index}`) ?? ""), unit: String(formData.get(`assumptionUnit${index}`) ?? ""), sourceNote: String(formData.get(`assumptionSource${index}`) ?? ""), displayOrder: index }));
  const result = await saveCustomOpportunity({ analysisId, customOpportunityId, input: { title: String(formData.get("title") ?? ""), shortTitle: String(formData.get("shortTitle") ?? ""), categoryKey: String(formData.get("categoryKey") ?? ""), valueClassification: String(formData.get("valueClassification") ?? ""), valueFrequency: String(formData.get("valueFrequency") ?? ""), enteredValue: String(formData.get("enteredValue") ?? ""), calculationRationale: String(formData.get("calculationRationale") ?? ""), howMcLeodHelps: String(formData.get("howMcLeodHelps") ?? ""), customerBusinessImpact: String(formData.get("customerBusinessImpact") ?? ""), presentationCallout: String(formData.get("presentationCallout") ?? ""), methodologyNote: String(formData.get("methodologyNote") ?? ""), sourceNote: String(formData.get("sourceNote") ?? ""), assumptions } });
  if (!result.ok) throw new Error(result.error.message);
  revalidatePath(`/analyses/${analysisId}/assessment`);
  redirect(`/analyses/${analysisId}/assessment?custom=${customOpportunityId}`);
}
