"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { moveAnalysisModule, resetAnalysisNarrativeToTemplate, saveCustomAnalysisNarrative, saveAnalysisInvestment } from "@/lib/analyses/service";
import { prisma } from "@/lib/db";
import { deleteCustomerLogoFiles, saveCustomerLogoFile } from "@/lib/presentation/logo";
import type { AnalysisInvestmentInput } from "@/lib/validation/analysis";

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

function optionalNumber(value: FormDataEntryValue | null): number | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function optionalPercentAsDecimal(value: FormDataEntryValue | null): number | undefined {
  const percent = optionalNumber(value);
  return percent === undefined ? undefined : percent / 100;
}

function optionalAdoptionSchedule(value: FormDataEntryValue | null): number[] | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  return value.split(",").map((part) => Number(part.trim()) / 100);
}

export async function saveInvestmentAction(analysisId: string, formData: FormData) {
  const input: AnalysisInvestmentInput = {
    investmentOneTimeCost: optionalNumber(formData.get("investmentOneTimeCost")),
    investmentAnnualRecurringCost: optionalNumber(formData.get("investmentAnnualRecurringCost")),
    investmentChangeManagementCost: optionalNumber(formData.get("investmentChangeManagementCost")),
    roiHorizonYears: optionalNumber(formData.get("roiHorizonYears")),
    roiDiscountRatePct: optionalPercentAsDecimal(formData.get("roiDiscountRatePct")),
    adoptionSchedulePct: optionalAdoptionSchedule(formData.get("adoptionSchedulePct")),
  };
  await saveAnalysisInvestment({ analysisId, input });
  revalidatePath(`/analyses/${analysisId}/review`);
  redirect(`/analyses/${analysisId}/review`);
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
