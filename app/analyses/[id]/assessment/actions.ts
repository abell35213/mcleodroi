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
import type { CustomOpportunityInput } from "@/lib/custom-opportunities";

export type CustomOpportunityFormValues = Omit<CustomOpportunityInput, "enteredValue"> & { enteredValue: string };
export type CustomOpportunityActionState = {
  status: "IDLE" | "SUCCESS" | "ERROR";
  message?: string;
  fieldErrors?: Partial<Record<"title" | "categoryKey" | "valueClassification" | "valueFrequency" | "enteredValue" | "calculationRationale" | "assumptions", string[]>>;
  submittedValues?: CustomOpportunityFormValues;
};

function readCustomOpportunityFormData(formData: FormData): CustomOpportunityFormValues {
  return {
    title: String(formData.get("title") ?? ""),
    shortTitle: String(formData.get("shortTitle") ?? ""),
    categoryKey: String(formData.get("categoryKey") ?? ""),
    valueClassification: String(formData.get("valueClassification") ?? ""),
    valueFrequency: String(formData.get("valueFrequency") ?? ""),
    enteredValue: String(formData.get("enteredValue") ?? ""),
    calculationRationale: String(formData.get("calculationRationale") ?? ""),
    howMcLeodHelps: String(formData.get("howMcLeodHelps") ?? ""),
    customerBusinessImpact: String(formData.get("customerBusinessImpact") ?? ""),
    presentationCallout: String(formData.get("presentationCallout") ?? ""),
    methodologyNote: String(formData.get("methodologyNote") ?? ""),
    sourceNote: String(formData.get("sourceNote") ?? ""),
    assumptions: Array.from({ length: 8 }, (_, index) => ({
      label: String(formData.get(`assumptionLabel${index}`) ?? ""),
      displayValue: String(formData.get(`assumptionValue${index}`) ?? ""),
      unit: String(formData.get(`assumptionUnit${index}`) ?? ""),
      sourceNote: String(formData.get(`assumptionSource${index}`) ?? ""),
      displayOrder: index,
    })),
  };
}

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

export async function saveCustomOpportunityAction(analysisId: string, customOpportunityId: string, _prevState: CustomOpportunityActionState, formData: FormData): Promise<CustomOpportunityActionState> {
  const submittedValues = readCustomOpportunityFormData(formData);
  const result = await saveCustomOpportunity({ analysisId, customOpportunityId, input: submittedValues });
  if (!result.ok) {
    const fieldErrors: CustomOpportunityActionState["fieldErrors"] = {};
    if (result.error.message.includes("Calculation rationale is required.")) fieldErrors.calculationRationale = ["Calculation rationale is required."];
    if (result.error.message.includes("Opportunity title is required.")) fieldErrors.title = ["Opportunity title is required."];
    if (result.error.message.includes("Category is required.")) fieldErrors.categoryKey = ["Category is required."];
    if (result.error.message.includes("Value classification is required.")) fieldErrors.valueClassification = ["Value classification is required."];
    if (result.error.message.includes("Value frequency is required.")) fieldErrors.valueFrequency = ["Value frequency is required."];
    if (result.error.message.includes("Informational Capital must use informational capital frequency.")) fieldErrors.valueFrequency = ["Informational Capital must use informational capital frequency."];
    if (result.error.message.includes("Only Informational Capital may use informational capital frequency.")) fieldErrors.valueFrequency = ["Only Informational Capital may use informational capital frequency."];
    if (result.error.message.includes("Annual-Only Value must use annual-only frequency.")) fieldErrors.valueFrequency = ["Annual-Only Value must use annual-only frequency."];
    if (result.error.message.includes("financial amount")) fieldErrors.enteredValue = ["Enter a finite financial amount using digits and an optional decimal."];
    if (result.error.message.includes("At least one assumption")) fieldErrors.assumptions = ["At least one assumption with a label and value is required."];
    if (result.error.code === "INVALID_INPUT_KEY") return { status: "ERROR", message: "Complete the highlighted required fields before saving.", fieldErrors, submittedValues };
    console.error("Custom opportunity save failed", { analysisId, customOpportunityId, code: result.error.code });
    return { status: "ERROR", message: "We could not save this custom opportunity. Please try again.", submittedValues };
  }
  revalidatePath(`/analyses/${analysisId}/assessment`);
  redirect(`/analyses/${analysisId}/assessment?custom=${customOpportunityId}`);
}
