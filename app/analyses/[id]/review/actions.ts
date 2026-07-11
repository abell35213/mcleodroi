"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { moveAnalysisModule, resetAnalysisNarrativeToTemplate, saveCustomAnalysisNarrative, saveAnalysisInvestment, saveOverlapDisposition } from "@/lib/analyses/service";
import { prisma } from "@/lib/db";
import { deleteCustomerLogoFiles, saveCustomerLogoFile } from "@/lib/presentation/logo";
import type { InvestmentActionState, InvestmentFieldKey, InvestmentFormValues } from "@/lib/analyses/investment-action-state";
import { analysisInvestmentSchema, type AnalysisInvestmentInput } from "@/lib/validation/analysis";

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

function formString(formData: FormData, key: InvestmentFieldKey): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function submittedValues(formData: FormData): InvestmentFormValues {
  return {
    investmentOneTimeCost: formString(formData, "investmentOneTimeCost"),
    investmentAnnualRecurringCost: formString(formData, "investmentAnnualRecurringCost"),
    investmentChangeManagementCost: formString(formData, "investmentChangeManagementCost"),
    roiHorizonYears: formString(formData, "roiHorizonYears"),
    roiDiscountRatePct: formString(formData, "roiDiscountRatePct"),
    adoptionSchedulePct: formString(formData, "adoptionSchedulePct"),
  };
}

function numberOrUndefined(value: string): number | undefined {
  return value.trim() === "" ? undefined : Number(value);
}

function adoptionScheduleOrUndefined(value: string): number[] | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  return trimmed.split(",").map((part) => {
    const token = part.trim();
    return token === "" ? Number.NaN : Number(token) / 100;
  });
}

function investmentInput(values: InvestmentFormValues): AnalysisInvestmentInput {
  return {
    investmentOneTimeCost: numberOrUndefined(values.investmentOneTimeCost),
    investmentAnnualRecurringCost: numberOrUndefined(values.investmentAnnualRecurringCost),
    investmentChangeManagementCost: numberOrUndefined(values.investmentChangeManagementCost),
    roiHorizonYears: numberOrUndefined(values.roiHorizonYears),
    roiDiscountRatePct: values.roiDiscountRatePct.trim() === "" ? undefined : Number(values.roiDiscountRatePct) / 100,
    adoptionSchedulePct: adoptionScheduleOrUndefined(values.adoptionSchedulePct),
  };
}

function fieldErrorsFor(input: AnalysisInvestmentInput): Partial<Record<InvestmentFieldKey, string[]>> {
  const parsed = analysisInvestmentSchema.safeParse(input);
  if (parsed.success) return {};
  const fieldErrors: Partial<Record<InvestmentFieldKey, string[]>> = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0] as InvestmentFieldKey | undefined;
    if (!key) continue;
    fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
  }
  return fieldErrors;
}

export async function saveInvestmentAction(analysisId: string, _previousState: InvestmentActionState, formData: FormData): Promise<InvestmentActionState> {
  const values = submittedValues(formData);
  const input = investmentInput(values);
  const clientFieldErrors = fieldErrorsFor(input);
  if (Object.keys(clientFieldErrors).length > 0) {
    return { status: "ERROR", message: "Investment assumptions require correction before return metrics can be calculated.", fieldErrors: clientFieldErrors, submittedValues: values };
  }
  const result = await saveAnalysisInvestment({ analysisId, input });
  if (!result.ok) {
    return { status: "ERROR", message: result.error.message, fieldErrors: fieldErrorsFor(input), submittedValues: values };
  }
  revalidatePath(`/analyses/${analysisId}/review`);
  return { status: "SUCCESS", message: "Investment assumptions saved." };
}

export async function saveLogoAction(analysisId: string, formData: FormData) {
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    redirect(`/analyses/${analysisId}/review?logoError=${encodeURIComponent("Choose a logo image to upload.")}`);
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const saved = saveCustomerLogoFile({ analysisId, originalName: file.name, bytes });
  if (!saved.ok) redirect(`/analyses/${analysisId}/review?logoError=${encodeURIComponent(saved.message)}`);
  await prisma.analysis.update({ where: { id: analysisId }, data: { customerLogoPath: saved.storedPath } });
  revalidatePath(`/analyses/${analysisId}/review`);
  redirect(`/analyses/${analysisId}/review`);
}

export async function removeLogoAction(analysisId: string) {
  deleteCustomerLogoFiles(analysisId);
  await prisma.analysis.update({ where: { id: analysisId }, data: { customerLogoPath: null } });
  revalidatePath(`/analyses/${analysisId}/review`);
  redirect(`/analyses/${analysisId}/review`);
}

export async function saveOverlapDispositionAction(analysisId: string, formData: FormData) {
  await saveOverlapDisposition({ analysisId, overlapGroupKey: String(formData.get("overlapGroupKey") ?? ""), disposition: String(formData.get("disposition") ?? ""), acknowledgmentText: String(formData.get("acknowledgmentText") ?? "") });
  revalidatePath(`/analyses/${analysisId}/review`);
  redirect(`/analyses/${analysisId}/review`);
}
