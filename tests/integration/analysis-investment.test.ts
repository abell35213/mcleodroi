import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  calculateAnalysis,
  saveAnalysisInvestment,
  saveAnalysisModuleInputs,
  selectAnalysisModule,
} from "@/lib/analyses";
import { DEFAULT_ANALYSIS_DISCOUNT_RATE, DEFAULT_ROI_HORIZON_YEARS } from "@/lib/calculations";

let db: PrismaClient;
let dbUrl: string;
let tempDir: string;

beforeAll(() => {
  tempDir = mkdtempSync(join(tmpdir(), "mcleod-roi-p1-investment-"));
  dbUrl = `file:${join(tempDir, "test.db")}`;
  execFileSync("npx", ["--no-install", "prisma", "migrate", "deploy"], { env: { ...process.env, DATABASE_URL: dbUrl }, stdio: "pipe" });
  db = new PrismaClient({ datasourceUrl: dbUrl });
});

afterAll(async () => {
  await db.$disconnect();
  rmSync(tempDir, { recursive: true, force: true });
});

beforeEach(async () => {
  await db.analysisModuleInput.deleteMany();
  await db.analysisModule.deleteMany();
  await db.analysis.deleteMany();
});

async function createCompletedAnalysis() {
  const analysis = await db.analysis.create({ data: { companyName: "Investment Customer", businessType: "TRUCKLOAD", preparedBy: "Tester", analysisDate: new Date("2026-07-10T00:00:00Z") } });
  const selected = await selectAnalysisModule({ analysisId: analysis.id, moduleKey: "REDUCE_DEADHEAD", db });
  if (!selected.ok) throw new Error(selected.error.message);
  const saved = await saveAnalysisModuleInputs({
    analysisModuleId: selected.value.analysisModuleId,
    inputs: { current_deadhead_pct: 0.17, target_deadhead_pct: 0.16, monthly_miles: 2600000, variable_cost_per_mile: 0.45 },
    db,
  });
  if (!saved.ok) throw new Error(saved.error.message);
  return analysis;
}

describe("analysis investment & ROI wiring", () => {
  it("leaves ROI absent until a one-time investment is entered", async () => {
    const analysis = await createCompletedAnalysis();
    const before = await calculateAnalysis({ analysisId: analysis.id, db });
    expect(before.ok).toBe(true);
    if (!before.ok) throw new Error("expected success");
    expect(before.value.roi).toBeNull();
    expect(before.value.investment.investmentOneTimeCost).toBeNull();
    expect(before.value.summary.totalIdentifiedAnnualEconomicOpportunity).toBeGreaterThan(0);
  });

  it("derives ROI from the identified opportunity and applies the finance-grade discount default", async () => {
    const analysis = await createCompletedAnalysis();
    const saved = await saveAnalysisInvestment({ analysisId: analysis.id, input: { investmentOneTimeCost: 150000, investmentAnnualRecurringCost: 40000 }, db });
    expect(saved.ok).toBe(true);

    const calculated = await calculateAnalysis({ analysisId: analysis.id, db });
    expect(calculated.ok).toBe(true);
    if (!calculated.ok) throw new Error("expected success");
    const { roi, summary } = calculated.value;
    expect(roi).not.toBeNull();
    if (!roi) throw new Error("expected roi");
    expect(roi.annualValue).toBe(summary.totalIdentifiedAnnualEconomicOpportunity);
    expect(roi.investment).toBe(150000);
    expect(roi.annualRecurringCost).toBe(40000);
    expect(roi.horizonYears).toBe(DEFAULT_ROI_HORIZON_YEARS);
    expect(roi.discountRatePct).toBe(DEFAULT_ANALYSIS_DISCOUNT_RATE);
    expect(roi.netAnnualValue).toBeCloseTo(summary.totalIdentifiedAnnualEconomicOpportunity - 40000, 6);
    expect(roi.cumulativeBenefitCurve).toHaveLength(DEFAULT_ROI_HORIZON_YEARS);
  });

  it("adds change-management cost into the total investment and honors a persisted adoption ramp", async () => {
    const analysis = await createCompletedAnalysis();
    const saved = await saveAnalysisInvestment({
      analysisId: analysis.id,
      input: { investmentOneTimeCost: 100000, investmentChangeManagementCost: 25000, roiHorizonYears: 3, roiDiscountRatePct: 0.08, adoptionSchedulePct: [0.5, 0.75, 1] },
      db,
    });
    expect(saved.ok).toBe(true);

    const calculated = await calculateAnalysis({ analysisId: analysis.id, db });
    if (!calculated.ok) throw new Error("expected success");
    const roi = calculated.value.roi;
    if (!roi) throw new Error("expected roi");
    expect(roi.investment).toBe(125000);
    expect(roi.discountRatePct).toBe(0.08);
    expect(roi.adoptionSchedulePct).toEqual([0.5, 0.75, 1]);
    expect(roi.cumulativeBenefitCurve[0].adoptionPct).toBe(0.5);
  });

  it("rejects an adoption schedule that does not match the horizon", async () => {
    const analysis = await createCompletedAnalysis();
    const saved = await saveAnalysisInvestment({ analysisId: analysis.id, input: { investmentOneTimeCost: 100000, roiHorizonYears: 3, adoptionSchedulePct: [0.5, 1] }, db });
    expect(saved.ok).toBe(false);
    if (saved.ok) throw new Error("expected failure");
    expect(saved.error.code).toBe("INVALID_INVESTMENT_INPUT");
  });

  it("rejects negative investment amounts", async () => {
    const analysis = await createCompletedAnalysis();
    const saved = await saveAnalysisInvestment({ analysisId: analysis.id, input: { investmentOneTimeCost: -1 }, db });
    expect(saved.ok).toBe(false);
    if (saved.ok) throw new Error("expected failure");
    expect(saved.error.code).toBe("INVALID_INVESTMENT_INPUT");
  });

  it("clears investment when saved without a one-time cost", async () => {
    const analysis = await createCompletedAnalysis();
    await saveAnalysisInvestment({ analysisId: analysis.id, input: { investmentOneTimeCost: 100000 }, db });
    const cleared = await saveAnalysisInvestment({ analysisId: analysis.id, input: {}, db });
    expect(cleared.ok).toBe(true);
    const calculated = await calculateAnalysis({ analysisId: analysis.id, db });
    if (!calculated.ok) throw new Error("expected success");
    expect(calculated.value.roi).toBeNull();
    expect(calculated.value.investment.investmentOneTimeCost).toBeNull();
  });
});
