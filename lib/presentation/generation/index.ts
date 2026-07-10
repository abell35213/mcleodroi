import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname } from "node:path";
import JSZip from "jszip";
import type { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/db";
import { getGeneratedPresentationPath } from "@/lib/presentation/paths";
import { createPresentation } from "@/lib/presentation/pptx/create-presentation";
import { buildCategoryOverviewSlide, buildCoverSlide, buildDualModuleSlide, buildExecutiveSummarySlide, buildOpportunitySummarySlide, buildSingleModuleSlide } from "@/lib/presentation/slides";
import { composePresentationSlidePlan } from "@/lib/presentation/composition";
import { parsePresentationSnapshot } from "@/lib/presentation/snapshot";
import type { PresentationServiceResult } from "@/lib/presentation/types";

type Db = PrismaClient;

type GeneratedPresentation = { generationId: string; filePath: string; slideCount: number };
function fail<T>(code: string, message: string): PresentationServiceResult<T> { return { ok: false, error: { code, message } }; }

async function validatePptx(path: string): Promise<boolean> {
  if (!existsSync(path) || statSync(path).size <= 0) return false;
  const zip = await JSZip.loadAsync(readFileSync(path));
  return zip.file("[Content_Types].xml") !== null && zip.folder("ppt/slides") !== null;
}

export async function generatePresentationPptx(args: { presentationGenerationId: string; db?: Db }): Promise<PresentationServiceResult<GeneratedPresentation>> {
  const db = args.db ?? defaultPrisma;
  const generation = await db.presentationGeneration.findUnique({ where: { id: args.presentationGenerationId } });
  if (!generation) return fail("PRESENTATION_GENERATION_NOT_FOUND", "Presentation generation was not found.");
  await db.presentationGeneration.update({ where: { id: generation.id }, data: { status: "GENERATING", filePath: null } });
  try {
    const snapshot = parsePresentationSnapshot(generation.snapshotJson);
    const slidePlan = composePresentationSlidePlan(snapshot);
    const filePath = getGeneratedPresentationPath({ companyName: snapshot.analysis.companyName, generationId: generation.id });
    mkdirSync(dirname(filePath), { recursive: true });
    const pptx = createPresentation({ title: `${snapshot.analysis.companyName} Business Impact Analysis`, company: "McLeod Software" });
    for (const plan of slidePlan) {
      if (plan.kind === "cover") buildCoverSlide(pptx, plan.model);
      else if (plan.kind === "executiveSummary") buildExecutiveSummarySlide(pptx, plan.model);
      else if (plan.kind === "singleModule") buildSingleModuleSlide(pptx, plan.model);
      else if (plan.kind === "dualModule") buildDualModuleSlide(pptx, plan.model);
      else if (plan.kind === "categoryOverview") buildCategoryOverviewSlide(pptx, plan.model);
      else buildOpportunitySummarySlide(pptx, plan.model);
    }
    await pptx.writeFile({ fileName: filePath });
    if (!(await validatePptx(filePath))) throw new Error("PPTX package validation failed.");
    await db.presentationGeneration.update({ where: { id: generation.id }, data: { status: "COMPLETE", filePath } });
    return { ok: true, value: { generationId: generation.id, filePath, slideCount: slidePlan.length } };
  } catch {
    await db.presentationGeneration.update({ where: { id: generation.id }, data: { status: "FAILED", filePath: null } });
    return fail("PRESENTATION_GENERATION_FAILED", "PowerPoint generation failed. Please review the analysis and try again.");
  }
}

export async function createAndGeneratePresentationPptx(args: { analysisId: string; db?: Db }) {
  const { createPresentationSnapshot } = await import("@/lib/presentation/snapshot");
  const db = args.db ?? defaultPrisma;
  const snapshot = await createPresentationSnapshot({ analysisId: args.analysisId, db });
  if (!snapshot.ok) return snapshot;
  const generated = await generatePresentationPptx({ presentationGenerationId: snapshot.value.generation.id, db });
  if (!generated.ok) return generated;
  return { ok: true as const, value: { generation: { ...snapshot.value.generation, status: "COMPLETE" as const, filePath: generated.value.filePath }, snapshot: snapshot.value.snapshot, filePath: generated.value.filePath } };
}
