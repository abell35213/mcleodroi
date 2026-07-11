import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { saveAnalysisInvestment, saveAnalysisModuleInputs, selectAnalysisModule } from "@/lib/analyses";
import { createPresentationSnapshot } from "@/lib/presentation";
import { renderPresentationHtml } from "@/lib/presentation/export/html";
import { renderPresentationPdf } from "@/lib/presentation/export/pdf";

let db: PrismaClient;
let tempDir: string;

beforeAll(() => {
  tempDir = mkdtempSync(join(tmpdir(), "mcleod-export-"));
  const dbUrl = `file:${join(tempDir, "test.db")}`;
  execFileSync("npx", ["--no-install", "prisma", "migrate", "deploy"], { env: { ...process.env, DATABASE_URL: dbUrl }, stdio: "pipe" });
  db = new PrismaClient({ datasourceUrl: dbUrl });
});
afterAll(async () => {
  await db.$disconnect();
  rmSync(tempDir, { recursive: true, force: true });
});
beforeEach(async () => {
  await db.presentationGeneration.deleteMany();
  await db.analysisModuleInput.deleteMany();
  await db.analysisModule.deleteMany();
  await db.analysis.deleteMany();
});

async function readySnapshot() {
  const analysis = await db.analysis.create({ data: { companyName: "Acme <Freight> & Co", customerContact: "Jane", businessType: "TRUCKLOAD", preparedBy: "Rep", analysisDate: new Date("2026-07-08T00:00:00Z") } });
  const deadhead = await selectAnalysisModule({ analysisId: analysis.id, moduleKey: "REDUCE_DEADHEAD", db });
  if (!deadhead.ok) throw new Error("select failed");
  await saveAnalysisModuleInputs({ analysisModuleId: deadhead.value.analysisModuleId, inputs: { current_deadhead_pct: 0.17, target_deadhead_pct: 0.16, monthly_miles: 2500000, variable_cost_per_mile: 0.45 }, db });
  await saveAnalysisInvestment({ analysisId: analysis.id, input: { investmentOneTimeCost: 250000, investmentAnnualRecurringCost: 60000, roiHorizonYears: 3 }, db });
  const result = await createPresentationSnapshot({ analysisId: analysis.id, db });
  if (!result.ok) throw new Error(`snapshot failed: ${result.error.message}`);
  return result.value.snapshot;
}

describe("presentation exports", () => {
  it("renders a self-contained HTML export with escaped content and embedded snapshot", async () => {
    const snapshot = await readySnapshot();
    const html = renderPresentationHtml(snapshot);
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
    // Company name with angle brackets/ampersand must be HTML-escaped, not raw.
    expect(html).toContain("Acme &lt;Freight&gt; &amp; Co");
    expect(html).not.toContain("Acme <Freight>");
    // ROI section present because an investment was entered.
    expect(html).toContain("Return on Investment");
    // Self-contained: embeds the verbatim snapshot JSON and loads no external resources.
    expect(html).toContain('id="mcleod-presentation-snapshot"');
    expect(html).not.toMatch(/(?:src|href)\s*=\s*"https?:\/\//);
    expect(html).not.toContain("@import");
    // Inline SVG charts are present.
    expect(html).toContain("<svg");
  });

  it("renders a deterministic branded PDF", async () => {
    const snapshot = await readySnapshot();
    const first = await renderPresentationPdf(snapshot);
    const second = await renderPresentationPdf(snapshot);
    expect(Buffer.from(first.slice(0, 5)).toString()).toBe("%PDF-");
    expect(first.byteLength).toBeGreaterThan(1000);
    // Byte-stable across runs of the same immutable snapshot.
    expect(Buffer.from(first).equals(Buffer.from(second))).toBe(true);
  });
});
