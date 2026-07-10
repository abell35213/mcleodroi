import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { calculateAnalysis, saveAnalysisModuleInputs, saveCustomAnalysisNarrative, selectAnalysisModule } from "@/lib/analyses";
import { NARRATIVE_REGISTRY_VERSION } from "@/lib/narratives/fingerprint";
import { createPresentationSnapshot, parsePresentationSnapshot, PRESENTATION_TEMPLATE_VERSION } from "@/lib/presentation";
import { generatePresentationPptx } from "@/lib/presentation/generation";

let db: PrismaClient; let tempDir: string;
beforeAll(() => { tempDir = mkdtempSync(join(tmpdir(), "mcleod-roi-p1-8-")); const dbUrl = `file:${join(tempDir, "test.db")}`; execFileSync("npx", ["--no-install", "prisma", "migrate", "deploy"], { env: { ...process.env, DATABASE_URL: dbUrl }, stdio: "pipe" }); db = new PrismaClient({ datasourceUrl: dbUrl }); });
afterAll(async () => { await db.$disconnect(); rmSync(tempDir, { recursive: true, force: true }); });
beforeEach(async () => { await db.presentationGeneration.deleteMany(); await db.analysisModuleInput.deleteMany(); await db.analysisModule.deleteMany(); await db.analysis.deleteMany(); });
async function createReadyAnalysis() { const analysis = await db.analysis.create({ data: { companyName: "Snapshot Customer", customerContact: "Jane", businessType: "TRUCKLOAD", preparedBy: "Tester", analysisDate: new Date("2026-07-08T00:00:00Z") } }); const broker = await selectAnalysisModule({ analysisId: analysis.id, moduleKey: "REDUCE_DEADHEAD", db }); expect(broker.ok).toBe(true); if (!broker.ok) throw new Error(); await saveAnalysisModuleInputs({ analysisModuleId: broker.value.analysisModuleId, inputs: { current_deadhead_pct: 0.17, target_deadhead_pct: 0.16, monthly_miles: 2500000, variable_cost_per_mile: 0.45 }, db }); const trailer = await selectAnalysisModule({ analysisId: analysis.id, moduleKey: "TRAILER_ASSET_UTILIZATION", db }); expect(trailer.ok).toBe(true); if (!trailer.ok) throw new Error(); await saveAnalysisModuleInputs({ analysisModuleId: trailer.value.analysisModuleId, inputs: { trailer_count: 400, tractor_count: 155, average_trailer_value: 57500, ratio_improvement_pct: 0.02 }, db }); return { analysis, broker: broker.value, trailer: trailer.value }; }

describe("presentation snapshots", () => {
  it("creates persisted immutable snapshots with versions, ordering, summary, and informational capital", async () => {
    const { analysis, broker } = await createReadyAnalysis();
    await saveCustomAnalysisNarrative({ analysisModuleId: broker.analysisModuleId, narrative: "Custom customer-approved deadhead reduction narrative.", db });
    const result = await createPresentationSnapshot({ analysisId: analysis.id, db, now: new Date("2026-07-08T12:00:00Z") });
    expect(result.ok).toBe(true); if (!result.ok) return;
    expect(result.value.generation.templateVersion).toBe(PRESENTATION_TEMPLATE_VERSION);
    expect(result.value.generation.filePath).toBeNull();
    const record = await db.presentationGeneration.findUnique({ where: { id: result.value.generation.id } });
    expect(record).toBeTruthy();
    const snapshot = parsePresentationSnapshot(record!.snapshotJson);
    expect(snapshot.presentationTemplateVersion).toBe(PRESENTATION_TEMPLATE_VERSION);
    expect(snapshot.narrativeRegistryVersion).toBe(NARRATIVE_REGISTRY_VERSION);
    expect(snapshot.analysis.customerContact).toBe("Jane");
    expect(snapshot.summary.informationalCapitalValueTotal).toBeGreaterThan(0);
    expect(snapshot.summary.informationalCapitalValues).toEqual(expect.arrayContaining([expect.objectContaining({ moduleKey: "TRAILER_ASSET_UTILIZATION" })]));
    expect(snapshot.categories.flatMap((c) => c.modules).map((m) => m.moduleKey)).toEqual(["REDUCE_DEADHEAD", "TRAILER_ASSET_UTILIZATION"]);
    const brokerModule = snapshot.categories.flatMap((c) => c.modules).find((m) => m.moduleKey === "REDUCE_DEADHEAD")!;
    expect(brokerModule.effectiveCustomerAnalysis).toBe("Custom customer-approved deadhead reduction narrative.");
    expect(brokerModule.defaultCustomerAnalysis).not.toBe(brokerModule.effectiveCustomerAnalysis);
    const calculated = await calculateAnalysis({ analysisId: analysis.id, db });
    expect(calculated.ok && snapshot.summary.totalIdentifiedAnnualEconomicOpportunity).toBeCloseTo(calculated.ok ? calculated.value.summary.totalIdentifiedAnnualEconomicOpportunity : 0);
  });

  it("generates an openable themed PPTX with a written executive summary", async () => {
    const { analysis } = await createReadyAnalysis();
    const snapshotResult = await createPresentationSnapshot({ analysisId: analysis.id, db, now: new Date("2026-07-08T12:00:00Z") });
    expect(snapshotResult.ok).toBe(true); if (!snapshotResult.ok) return;
    const generated = await generatePresentationPptx({ presentationGenerationId: snapshotResult.value.generation.id, db });
    expect(generated.ok).toBe(true); if (!generated.ok) return;
    expect(generated.value.slideCount).toBeGreaterThan(2);
    const zipDir = mkdtempSync(join(tmpdir(), "mcleod-roi-pptx-"));
    try {
      execFileSync("unzip", ["-q", generated.value.filePath, "-d", zipDir]);
      const xml = execFileSync("sh", ["-c", `cat "${join(zipDir, "ppt/slides")}"/*.xml`]).toString();
      expect(xml).toContain("Snapshot Customer");
      expect(xml).toContain("Reduce Deadhead Miles");
      expect(xml).toContain("Trailer Asset Utilization");
      expect(xml).toContain("McLeod");
      expect(xml).toContain("platform addresses your key areas of need");
      expect(xml).toContain("Proprietary &amp; Confidential");
    } finally {
      rmSync(zipDir, { recursive: true, force: true });
    }
  });

  it("rejects incomplete analyses", async () => {
    const analysis = await db.analysis.create({ data: { companyName: "Incomplete", businessType: "TRUCKLOAD", preparedBy: "Tester", analysisDate: new Date("2026-07-08T00:00:00Z") } });
    await selectAnalysisModule({ analysisId: analysis.id, moduleKey: "REDUCE_DEADHEAD", db });
    const result = await createPresentationSnapshot({ analysisId: analysis.id, db });
    expect(result.ok).toBe(false);
  });
  it("stores template narrative as effective narrative", async () => {
    const { analysis } = await createReadyAnalysis();
    const result = await createPresentationSnapshot({ analysisId: analysis.id, db });
    expect(result.ok).toBe(true); if (!result.ok) return;
    const snapshotModule = result.value.snapshot.categories.flatMap((c) => c.modules).find((m) => m.moduleKey === "REDUCE_DEADHEAD")!;
    expect(snapshotModule.narrativeMode).toBe("TEMPLATE");
    expect(snapshotModule.effectiveCustomerAnalysis).toBe(snapshotModule.defaultCustomerAnalysis);
  });
  it("keeps old snapshots immutable and creates new snapshots for changed state", async () => {
    const { analysis, broker } = await createReadyAnalysis();
    const first = await createPresentationSnapshot({ analysisId: analysis.id, db });
    expect(first.ok).toBe(true); if (!first.ok) return;
    const firstMonthly = first.value.snapshot.summary.monthlyRecurringValueTotal;
    await saveAnalysisModuleInputs({ analysisModuleId: broker.analysisModuleId, inputs: { target_deadhead_pct: 0.15 }, db });
    const storedFirst = await db.presentationGeneration.findUnique({ where: { id: first.value.generation.id } });
    expect(parsePresentationSnapshot(storedFirst!.snapshotJson).summary.monthlyRecurringValueTotal).toBe(firstMonthly);
    const second = await createPresentationSnapshot({ analysisId: analysis.id, db });
    expect(second.ok).toBe(true); if (!second.ok) return;
    expect(second.value.snapshot.summary.monthlyRecurringValueTotal).not.toBe(firstMonthly);
    expect(second.value.generation.id).not.toBe(first.value.generation.id);
  });
});
