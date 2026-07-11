import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  calculateAnalysis,
  clearAnalysisModuleInput,
  getCalculatedAnalysisModule,
  reconstructCalculationInputs,
  saveAnalysisModuleInputs,
  selectAnalysisModule,
  saveCustomAnalysisNarrative,
  resetAnalysisNarrativeToTemplate,
  moveAnalysisModule,
  updateAnalysisDetails,
  saveOverlapDisposition,
} from "@/lib/analyses";
import { getValueModule } from "@/lib/modules";

let db: PrismaClient;
let dbUrl: string;
let tempDir: string;

beforeAll(() => {
  tempDir = mkdtempSync(join(tmpdir(), "mcleod-roi-p1-4-"));
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

async function createAnalysis(businessType: "TRUCKLOAD" | "BROKERAGE") {
  return db.analysis.create({ data: { companyName: `${businessType} Customer`, businessType, preparedBy: "Tester", analysisDate: new Date("2026-07-08T00:00:00Z") } });
}

async function selectOrThrow(analysisId: string, moduleKey: string) {
  const result = await selectAnalysisModule({ analysisId, moduleKey, db });
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

async function saveOrThrow(analysisModuleId: string, inputs: Record<string, number>) {
  const result = await saveAnalysisModuleInputs({ analysisModuleId, inputs, db });
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

describe("analysis module selection", () => {
  it("selects modules by business type and rejects unavailable or duplicate modules", async () => {
    const truckload = await createAnalysis("TRUCKLOAD");
    const brokerage = await createAnalysis("BROKERAGE");
    expect((await selectAnalysisModule({ analysisId: truckload.id, moduleKey: "REDUCE_DEADHEAD", db })).ok).toBe(true);
    expect((await selectAnalysisModule({ analysisId: brokerage.id, moduleKey: "BROKER_PRODUCTIVITY", db })).ok).toBe(true);
    expect((await selectAnalysisModule({ analysisId: truckload.id, moduleKey: "PROFIT_MARGIN_INCREASE", db })).ok).toBe(true);
    expect((await selectAnalysisModule({ analysisId: truckload.id, moduleKey: "BROKER_PRODUCTIVITY", db })).ok).toBe(false);
    expect((await selectAnalysisModule({ analysisId: brokerage.id, moduleKey: "REDUCE_DEADHEAD", db })).ok).toBe(false);
    const duplicate = await selectAnalysisModule({ analysisId: truckload.id, moduleKey: "REDUCE_DEADHEAD", db });
    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) expect(duplicate.error.code).toBe("MODULE_ALREADY_SELECTED");
  });
});

describe("analysis module inputs", () => {
  it("uses PATCH upsert semantics, validates keys, and clears one input without treating it as zero", async () => {
    const analysis = await createAnalysis("TRUCKLOAD");
    const selectedModule = await selectOrThrow(analysis.id, "REDUCE_DEADHEAD");
    await saveOrThrow(selectedModule.analysisModuleId, { current_deadhead_pct: 0.17, target_deadhead_pct: 0.16 });
    await saveOrThrow(selectedModule.analysisModuleId, { monthly_miles: 2500000 });
    await saveOrThrow(selectedModule.analysisModuleId, { monthly_miles: 2600000, variable_cost_per_mile: 0.45 });
    let calculated = await getCalculatedAnalysisModule({ analysisModuleId: selectedModule.analysisModuleId, db });
    expect(calculated.ok && calculated.value.reconstructedInputs.current_deadhead_pct).toBe(0.17);
    expect(calculated.ok && calculated.value.reconstructedInputs.monthly_miles).toBe(2600000);
    const invalid = await saveAnalysisModuleInputs({ analysisModuleId: selectedModule.analysisModuleId, inputs: { not_a_key: 1 }, db });
    expect(invalid.ok).toBe(false);
    const cleared = await clearAnalysisModuleInput({ analysisModuleId: selectedModule.analysisModuleId, inputKey: "monthly_miles", db });
    expect(cleared.ok && cleared.value.status).toBe("IN_PROGRESS");
    calculated = await getCalculatedAnalysisModule({ analysisModuleId: selectedModule.analysisModuleId, db });
    expect(calculated.ok && calculated.value.reconstructedInputs.monthly_miles).toBeUndefined();
  });
});

describe("defaults and status derivation", () => {
  it("reconstructs defaults from registry without persisted rows", async () => {
    const trailerInputs = reconstructCalculationInputs(getValueModule("TRAILER_ASSET_UTILIZATION"), [
      { inputKey: "trailer_count", numericValue: 400 },
      { inputKey: "tractor_count", numericValue: 155 },
      { inputKey: "average_trailer_value", numericValue: 57500 },
      { inputKey: "ratio_improvement_pct", numericValue: 0.02 },
    ]);
    expect(trailerInputs.asset_life_months).toBe(60);
    expect(trailerInputs.residual_value_pct).toBe(0.2);
    expect(reconstructCalculationInputs(getValueModule("SHORT_HAUL_EFFICIENCY"), []).transaction_cost_per_ticket).toBe(0.25);
  });

  it("returns NOT_STARTED, IN_PROGRESS, COMPLETE, and validation issues", async () => {
    const analysis = await createAnalysis("TRUCKLOAD");
    const selectedModule = await selectOrThrow(analysis.id, "REDUCE_DEADHEAD");
    expect((await getCalculatedAnalysisModule({ analysisModuleId: selectedModule.analysisModuleId, db })).ok).toBe(true);
    let state = await saveOrThrow(selectedModule.analysisModuleId, { current_deadhead_pct: 0.17 });
    expect(state.status).toBe("IN_PROGRESS");
    state = await saveOrThrow(selectedModule.analysisModuleId, { target_deadhead_pct: 0.16, monthly_miles: 2500000, variable_cost_per_mile: 0.45 });
    expect(state.status).toBe("COMPLETE");
    state = await saveOrThrow(selectedModule.analysisModuleId, { target_deadhead_pct: 0.18 });
    expect(state.status).toBe("IN_PROGRESS");
    const calculated = await getCalculatedAnalysisModule({ analysisModuleId: selectedModule.analysisModuleId, db });
    expect(calculated.ok && calculated.value.validationIssues.length).toBeGreaterThan(0);
  });

  it("calculates REDUCE_DEADHEAD example", async () => {
    const analysis = await createAnalysis("TRUCKLOAD");
    const selectedModule = await selectOrThrow(analysis.id, "REDUCE_DEADHEAD");
    await saveOrThrow(selectedModule.analysisModuleId, { current_deadhead_pct: 0.17, target_deadhead_pct: 0.16, monthly_miles: 2500000, variable_cost_per_mile: 0.45 });
    const calculated = await getCalculatedAnalysisModule({ analysisModuleId: selectedModule.analysisModuleId, db });
    expect(calculated.ok && calculated.value.status).toBe("COMPLETE");
    if (calculated.ok && calculated.value.calculationOutcome?.success) {
      expect(calculated.value.calculationOutcome.result.derivedMetrics.avoided_deadhead_miles).toBeCloseTo(25000);
      expect(calculated.value.calculationOutcome.result.financialOutputs.monthlyRecurringValue).toBeCloseTo(11250);
    }
  });
});


describe("P1-Audit-1 business type and analysis integrity invariants", () => {
  it("allows changing business type before any opportunities are selected", async () => {
    const analysis = await createAnalysis("TRUCKLOAD");
    const result = await updateAnalysisDetails({
      analysisId: analysis.id,
      db,
      input: {
        companyName: "Updated Customer",
        customerContact: "Pat Pilot",
        businessType: "BROKERAGE",
        preparedBy: "Tester",
        analysisDate: new Date("2026-07-09T00:00:00Z"),
      },
    });

    expect(result.ok).toBe(true);
    const updated = await db.analysis.findUniqueOrThrow({ where: { id: analysis.id } });
    expect(updated.businessType).toBe("BROKERAGE");
    expect(updated.companyName).toBe("Updated Customer");
  });

  it("rejects a different business type after an opportunity is selected", async () => {
    const analysis = await createAnalysis("TRUCKLOAD");
    await selectOrThrow(analysis.id, "REDUCE_DEADHEAD");

    const result = await updateAnalysisDetails({
      analysisId: analysis.id,
      db,
      input: {
        companyName: "Blocked Change",
        businessType: "BROKERAGE",
        preparedBy: "Tester",
        analysisDate: new Date("2026-07-09T00:00:00Z"),
      },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("BUSINESS_TYPE_CHANGE_REQUIRES_NEW_ANALYSIS");
      expect(result.error.message).toContain("Business type cannot be changed after opportunities have been selected");
    }
  });

  it("allows saving the same business type after opportunities are selected", async () => {
    const analysis = await createAnalysis("TRUCKLOAD");
    await selectOrThrow(analysis.id, "REDUCE_DEADHEAD");

    const result = await updateAnalysisDetails({
      analysisId: analysis.id,
      db,
      input: {
        companyName: "Same Type Saved",
        businessType: "TRUCKLOAD",
        preparedBy: "Tester Two",
        analysisDate: new Date("2026-07-10T00:00:00Z"),
      },
    });

    expect(result.ok).toBe(true);
    const updated = await db.analysis.findUniqueOrThrow({ where: { id: analysis.id } });
    expect(updated.businessType).toBe("TRUCKLOAD");
    expect(updated.companyName).toBe("Same Type Saved");
  });

  it("preserves business type, modules, inputs, and narratives when a business type change is rejected", async () => {
    const analysis = await createAnalysis("TRUCKLOAD");
    const selected = await selectOrThrow(analysis.id, "REDUCE_DEADHEAD");
    await saveOrThrow(selected.analysisModuleId, { current_deadhead_pct: 0.17, target_deadhead_pct: 0.16, monthly_miles: 2500000, variable_cost_per_mile: 0.45 });
    await saveCustomAnalysisNarrative({ analysisModuleId: selected.analysisModuleId, narrative: "Keep this customer narrative.", db });

    const result = await updateAnalysisDetails({
      analysisId: analysis.id,
      db,
      input: {
        companyName: "Should Not Save",
        businessType: "BROKERAGE",
        preparedBy: "Should Not Save",
        analysisDate: new Date("2026-07-10T00:00:00Z"),
      },
    });

    expect(result.ok).toBe(false);
    const preserved = await db.analysis.findUniqueOrThrow({ where: { id: analysis.id }, include: { modules: { include: { inputs: true } } } });
    expect(preserved.businessType).toBe("TRUCKLOAD");
    expect(preserved.companyName).toBe("TRUCKLOAD Customer");
    expect(preserved.modules).toHaveLength(1);
    expect(preserved.modules[0].moduleKey).toBe("REDUCE_DEADHEAD");
    expect(preserved.modules[0].customNarrative).toBe("Keep this customer narrative.");
    expect(preserved.modules[0].inputs.map((input) => input.inputKey).sort()).toEqual(["current_deadhead_pct", "monthly_miles", "target_deadhead_pct", "variable_cost_per_mile"]);
  });

  it("blocks calculateAnalysis when a persisted module is incompatible with the analysis business type", async () => {
    const analysis = await createAnalysis("TRUCKLOAD");
    await selectOrThrow(analysis.id, "REDUCE_DEADHEAD");
    await db.analysis.update({ where: { id: analysis.id }, data: { businessType: "BROKERAGE" } });

    const calculated = await calculateAnalysis({ analysisId: analysis.id, db });

    expect(calculated.ok).toBe(false);
    if (!calculated.ok) {
      expect(calculated.error.code).toBe("ANALYSIS_MODULE_INTEGRITY_ERROR");
      expect(calculated.error.message).toContain("REDUCE_DEADHEAD");
    }
  });

  it("does not become review-ready by silently skipping an invalid persisted module", async () => {
    const analysis = await createAnalysis("TRUCKLOAD");
    const selected = await selectOrThrow(analysis.id, "REDUCE_DEADHEAD");
    await saveOrThrow(selected.analysisModuleId, { current_deadhead_pct: 0.17, target_deadhead_pct: 0.16, monthly_miles: 2500000, variable_cost_per_mile: 0.45 });
    await db.analysisModule.update({ where: { id: selected.analysisModuleId }, data: { moduleKey: "NOT_IN_REGISTRY" } });

    const calculated = await calculateAnalysis({ analysisId: analysis.id, db });

    expect(calculated.ok).toBe(false);
    if (!calculated.ok) expect(calculated.error.code).toBe("ANALYSIS_MODULE_INTEGRITY_ERROR");
  });
});

describe("analysis aggregation", () => {
  it("aggregates recurring Brokerage modules by value type", async () => {
    const analysis = await createAnalysis("BROKERAGE");
    const broker = await selectOrThrow(analysis.id, "BROKER_PRODUCTIVITY");
    const margin = await selectOrThrow(analysis.id, "PROFIT_MARGIN_INCREASE");
    const nonOps = await selectOrThrow(analysis.id, "NON_OPS_PRODUCTIVITY");
    await saveOrThrow(broker.analysisModuleId, { current_loads_per_broker_day: 2, target_loads_per_broker_day: 3, broker_count: 5, working_days_month: 21, average_margin_per_load: 50 });
    await saveOrThrow(margin.analysisModuleId, { monthly_gross_revenue: 500000, current_margin_pct: 0.12, target_margin_pct: 0.13 });
    await saveOrThrow(nonOps.analysisModuleId, { redundant_hours_month: 42, hourly_labor_rate: 50 });
    const calculated = await calculateAnalysis({ analysisId: analysis.id, db });
    expect(calculated.ok && calculated.value.summary.monthlyRecurringValueTotal).toBeCloseTo(12350);
    expect(calculated.ok && calculated.value.summary.annualRecurringValueTotal).toBeCloseTo(148200);
    expect(calculated.ok && calculated.value.summary.totalIdentifiedAnnualEconomicOpportunity).toBeCloseTo(148200);
    if (calculated.ok) {
      const revenue = calculated.value.summary.valueTypeBreakdown.find((item) => item.valueType === "REVENUE_MARGIN_OPPORTUNITY");
      const capacity = calculated.value.summary.valueTypeBreakdown.find((item) => item.valueType === "CAPACITY_VALUE");
      expect(revenue?.monthlyRecurringValue).toBeCloseTo(10250);
      expect(revenue?.annualRecurringValue).toBeCloseTo(123000);
      expect(capacity?.monthlyRecurringValue).toBeCloseTo(2100);
      expect(capacity?.annualRecurringValue).toBeCloseTo(25200);
    }
  });

  it("keeps annual-only and informational capital values separate", async () => {
    const turnoverAnalysis = await createAnalysis("TRUCKLOAD");
    const turnover = await selectOrThrow(turnoverAnalysis.id, "DRIVER_TURNOVER");
    await saveOrThrow(turnover.analysisModuleId, { current_annual_turnover_pct: 0.4, target_annual_turnover_pct: 0.35, driver_count: 170, recruiting_cost_per_driver: 3000 });
    let calculated = await calculateAnalysis({ analysisId: turnoverAnalysis.id, db });
    expect(calculated.ok && calculated.value.summary.monthlyRecurringValueTotal).toBe(0);
    expect(calculated.ok && calculated.value.summary.annualOnlyValueTotal).toBeCloseTo(25500);

    const trailerAnalysis = await createAnalysis("TRUCKLOAD");
    const trailer = await selectOrThrow(trailerAnalysis.id, "TRAILER_ASSET_UTILIZATION");
    await saveOrThrow(trailer.analysisModuleId, { trailer_count: 400, tractor_count: 155, average_trailer_value: 57500, ratio_improvement_pct: 0.02 });
    calculated = await calculateAnalysis({ analysisId: trailerAnalysis.id, db });
    expect(calculated.ok && calculated.value.summary.monthlyRecurringValueTotal).toBeCloseTo(6133.333333);
    expect(calculated.ok && calculated.value.summary.annualRecurringValueTotal).toBeCloseTo(73600);
    expect(calculated.ok && calculated.value.summary.informationalCapitalValueTotal).toBeCloseTo(460000);
    expect(calculated.ok && calculated.value.summary.totalIdentifiedAnnualEconomicOpportunity).toBeCloseTo(73600);
  });

  it("excludes incomplete modules and derives readiness", async () => {
    const analysis = await createAnalysis("TRUCKLOAD");
    const complete = await selectOrThrow(analysis.id, "REDUCE_DEADHEAD");
    await selectOrThrow(analysis.id, "DRIVER_TURNOVER");
    await saveOrThrow(complete.analysisModuleId, { current_deadhead_pct: 0.17, target_deadhead_pct: 0.16, monthly_miles: 2500000, variable_cost_per_mile: 0.45 });
    const calculated = await calculateAnalysis({ analysisId: analysis.id, db });
    expect(calculated.ok && calculated.value.summary.completeModuleCount).toBe(1);
    expect(calculated.ok && calculated.value.summary.incompleteModuleCount).toBe(1);
    expect(calculated.ok && calculated.value.summary.monthlyRecurringValueTotal).toBeCloseTo(11250);
    expect(calculated.ok && calculated.value.workflowReadiness.canReview).toBe(false);
    expect(calculated.ok && calculated.value.workflowReadiness.canGeneratePresentation).toBe(false);
  });

  it("reuses overlap notices", async () => {
    const operationsAnalysis = await createAnalysis("TRUCKLOAD");
    await selectOrThrow(operationsAnalysis.id, "OPERATIONS_EFFICIENCY");
    await selectOrThrow(operationsAnalysis.id, "RECURRING_ORDER_AUTOMATION");
    let calculated = await calculateAnalysis({ analysisId: operationsAnalysis.id, db });
    expect(calculated.ok && calculated.value.overlapNotices.some((notice) => notice.key === "OPERATIONS_REDUNDANT_LABOR" && notice.type === "REVIEW")).toBe(true);

    const rfpAnalysis = await createAnalysis("BROKERAGE");
    await selectOrThrow(rfpAnalysis.id, "RFP_PROCESS_EFFICIENCY");
    await selectOrThrow(rfpAnalysis.id, "RFP_GROWTH_OPPORTUNITY");
    calculated = await calculateAnalysis({ analysisId: rfpAnalysis.id, db });
    expect(calculated.ok && calculated.value.overlapNotices.some((notice) => notice.key === "RFP_VALUE" && notice.type === "INFORMATION")).toBe(true);
  });

  it("orders calculated modules by category then selected display order", async () => {
    const analysis = await createAnalysis("TRUCKLOAD");
    await selectOrThrow(analysis.id, "NON_OPS_PRODUCTIVITY");
    await selectOrThrow(analysis.id, "REDUCE_DEADHEAD");
    await selectOrThrow(analysis.id, "RECURRING_ORDER_AUTOMATION");
    const calculated = await calculateAnalysis({ analysisId: analysis.id, db });
    expect(calculated.ok && calculated.value.calculatedModules.map((calculatedModule) => calculatedModule.moduleKey)).toEqual(["RECURRING_ORDER_AUTOMATION", "REDUCE_DEADHEAD", "NON_OPS_PRODUCTIVITY"]);
  });

  it("calculates from the eagerly loaded modules without refetching each module", async () => {
    const analysis = await createAnalysis("TRUCKLOAD");
    await selectOrThrow(analysis.id, "REDUCE_DEADHEAD");
    await selectOrThrow(analysis.id, "DRIVER_TURNOVER");
    const findUnique = vi.spyOn(db.analysisModule, "findUnique");
    try {
      const calculated = await calculateAnalysis({ analysisId: analysis.id, db });
      expect(calculated.ok && calculated.value.summary.moduleCount).toBe(2);
      expect(findUnique).not.toHaveBeenCalled();
    } finally {
      findUnique.mockRestore();
    }
  });
});

describe("P1-7 review workflow domain", () => {
  it("matches West Side brokerage aggregate regression", async () => {
    const analysis = await db.analysis.create({ data: { companyName: "West Side Transport", businessType: "BROKERAGE", preparedBy: "Tester", analysisDate: new Date("2026-07-08T00:00:00Z") } });
    const broker = await selectOrThrow(analysis.id, "BROKER_PRODUCTIVITY");
    const backOffice = await selectOrThrow(analysis.id, "STREAMLINE_BACK_OFFICE");
    const nonOps = await selectOrThrow(analysis.id, "NON_OPS_PRODUCTIVITY");
    const margin = await selectOrThrow(analysis.id, "PROFIT_MARGIN_INCREASE");
    await saveOrThrow(broker.analysisModuleId, { current_loads_per_broker_day: 0, target_loads_per_broker_day: 3.5, broker_count: 5, working_days_month: 20, average_margin_per_load: 75 });
    await saveOrThrow(backOffice.analysisModuleId, { non_ops_staff_count: 5, hourly_labor_rate: 14, working_days_month: 21, redundant_activity_pct: 0.5 });
    await saveOrThrow(nonOps.analysisModuleId, { redundant_hours_month: 73.5, hourly_labor_rate: 20 });
    await saveOrThrow(margin.analysisModuleId, { monthly_gross_revenue: 833333, current_margin_pct: 0.12, target_margin_pct: 0.13 });
    const calculated = await calculateAnalysis({ analysisId: analysis.id, db });
    expect(calculated.ok).toBe(true);
    if (!calculated.ok) return;
    expect(calculated.value.summary.monthlyRecurringValueTotal).toBeCloseTo(41933.33, 1);
    expect(calculated.value.summary.annualRecurringValueTotal).toBeCloseTo(503199.96, 1);
  });
});

describe("P1-7 narrative persistence and reordering", () => {
  it("saves custom narrative, resets defaults, detects fingerprint changes, and reorders within category", async () => {
    const analysis = await db.analysis.create({ data: { companyName: "West Side Transport", businessType: "BROKERAGE", preparedBy: "Tester", analysisDate: new Date("2026-07-08T00:00:00Z") } });
    const broker = await selectOrThrow(analysis.id, "BROKER_PRODUCTIVITY");
    const ltl = await selectOrThrow(analysis.id, "BROKERAGE_LTL");
    await saveOrThrow(broker.analysisModuleId, { current_loads_per_broker_day: 0, target_loads_per_broker_day: 3.5, broker_count: 5, working_days_month: 20, average_margin_per_load: 75 });
    await saveOrThrow(ltl.analysisModuleId, { current_manual_hours_month: 100, hours_saved_month: 20, hourly_labor_rate: 30 });
    const custom = await saveCustomAnalysisNarrative({ analysisModuleId: broker.analysisModuleId, narrative: "Custom West Side story.", db });
    expect(custom.ok && custom.value.narrativeMode).toBe("CUSTOM");
    expect(custom.ok && custom.value.customNarrativeSourceFingerprint).toBeTruthy();
    const before = await calculateAnalysis({ analysisId: analysis.id, db });
    expect(before.ok && before.value.calculatedModules.map((m) => m.moduleKey).slice(0, 2)).toEqual(["BROKER_PRODUCTIVITY", "BROKERAGE_LTL"]);
    expect((await moveAnalysisModule({ analysisModuleId: broker.analysisModuleId, direction: "DOWN", db })).ok).toBe(true);
    const after = await calculateAnalysis({ analysisId: analysis.id, db });
    expect(after.ok && after.value.calculatedModules.map((m) => m.moduleKey).slice(0, 2)).toEqual(["BROKERAGE_LTL", "BROKER_PRODUCTIVITY"]);
    expect((await moveAnalysisModule({ analysisModuleId: broker.analysisModuleId, direction: "DOWN", db })).ok).toBe(true);
    await saveOrThrow(broker.analysisModuleId, { target_loads_per_broker_day: 4 });
    const changed = await calculateAnalysis({ analysisId: analysis.id, db });
    expect(changed.ok).toBe(true);
    if (!changed.ok || !custom.ok) return;
    const currentBroker = changed.value.calculatedModules.find((m) => m.analysisModuleId === broker.analysisModuleId)!;
    const { createNarrativeSourceFingerprint } = await import("@/lib/narratives/fingerprint");
    expect(createNarrativeSourceFingerprint({ module: currentBroker, businessType: "BROKERAGE" })).not.toBe(custom.value.customNarrativeSourceFingerprint);
    const reset = await resetAnalysisNarrativeToTemplate({ analysisModuleId: broker.analysisModuleId, db });
    expect(reset.ok && reset.value.narrativeMode).toBe("TEMPLATE");
    expect(reset.ok && reset.value.customNarrative).toBeNull();
    expect(reset.ok && reset.value.customNarrativeSourceFingerprint).toBeNull();
  });

  it("rejects blank custom narratives and treats default-equivalent saves as template", async () => {
    const analysis = await createAnalysis("BROKERAGE");
    const broker = await selectOrThrow(analysis.id, "BROKER_PRODUCTIVITY");
    await saveOrThrow(broker.analysisModuleId, { current_loads_per_broker_day: 0, target_loads_per_broker_day: 3.5, broker_count: 5, working_days_month: 20, average_margin_per_load: 75 });
    expect((await saveCustomAnalysisNarrative({ analysisModuleId: broker.analysisModuleId, narrative: "   ", db })).ok).toBe(false);
    const calculated = await calculateAnalysis({ analysisId: analysis.id, db });
    expect(calculated.ok).toBe(true);
    if (!calculated.ok) return;
    const { renderCalculatedModuleNarrative } = await import("@/lib/narratives");
    const rendered = renderCalculatedModuleNarrative({ analysis: calculated.value.analysis, calculatedModule: calculated.value.calculatedModules[0] });
    expect(rendered.ok).toBe(true);
    if (!rendered.ok) return;
    const saved = await saveCustomAnalysisNarrative({ analysisModuleId: broker.analysisModuleId, narrative: `  ${rendered.value.customerAnalysis}\r\n`, db });
    expect(saved.ok && saved.value.narrativeMode).toBe("TEMPLATE");
    expect(saved.ok && saved.value.customNarrative).toBeNull();
  });
});


describe("P1-Audit-3 overlap governance", () => {
  it("does not block informational notices but blocks unresolved REVIEW notices", async () => {
    const brokerage = await createAnalysis("BROKERAGE");
    const rfpProcess = await selectOrThrow(brokerage.id, "RFP_PROCESS_EFFICIENCY");
    const rfpGrowth = await selectOrThrow(brokerage.id, "RFP_GROWTH_OPPORTUNITY");
    await saveOrThrow(rfpProcess.analysisModuleId, { current_minutes_per_rfp: 90, target_minutes_per_rfp: 60, rfps_per_month: 20, hourly_labor_rate: 40 });
    await saveOrThrow(rfpGrowth.analysisModuleId, { additional_loads_week: 5, average_margin_per_load: 150 });
    const info = await calculateAnalysis({ analysisId: brokerage.id, db });
    expect(info.ok && info.value.overlapNotices[0].type).toBe("INFORMATION");
    expect(info.ok && info.value.workflowReadiness.canGeneratePresentation).toBe(true);

    const truckload = await createAnalysis("TRUCKLOAD");
    const deadhead = await selectOrThrow(truckload.id, "REDUCE_DEADHEAD");
    const outOfRoute = await selectOrThrow(truckload.id, "REDUCE_OUT_OF_ROUTE");
    await saveOrThrow(deadhead.analysisModuleId, { current_deadhead_pct: 0.17, target_deadhead_pct: 0.16, monthly_miles: 2500000, variable_cost_per_mile: 0.45 });
    await saveOrThrow(outOfRoute.analysisModuleId, { current_oor_pct: 0.08, target_oor_pct: 0.07, tractor_count: 100, miles_per_tractor_month: 10000, average_mpg: 6.5, fuel_cost_per_gallon: 4 });
    const review = await calculateAnalysis({ analysisId: truckload.id, db });
    expect(review.ok && review.value.overlapReviewStates[0].blocksPresentation).toBe(true);
    expect(review.ok && review.value.workflowReadiness.canReview).toBe(true);
    expect(review.ok && review.value.workflowReadiness.canGeneratePresentation).toBe(false);
  });

  it("accepts valid dispositions, blocks NEEDS_REVISION, and invalidates stale fingerprints", async () => {
    const analysis = await createAnalysis("TRUCKLOAD");
    const deadhead = await selectOrThrow(analysis.id, "REDUCE_DEADHEAD");
    const outOfRoute = await selectOrThrow(analysis.id, "REDUCE_OUT_OF_ROUTE");
    await saveOrThrow(deadhead.analysisModuleId, { current_deadhead_pct: 0.17, target_deadhead_pct: 0.16, monthly_miles: 2500000, variable_cost_per_mile: 0.45 });
    await saveOrThrow(outOfRoute.analysisModuleId, { current_oor_pct: 0.08, target_oor_pct: 0.07, tractor_count: 100, miles_per_tractor_month: 10000, average_mpg: 6.5, fuel_cost_per_gallon: 4 });
    expect((await saveOverlapDisposition({ analysisId: analysis.id, overlapGroupKey: "ASSET_PRODUCTIVITY", disposition: "NEEDS_REVISION", db })).ok).toBe(true);
    let calculated = await calculateAnalysis({ analysisId: analysis.id, db });
    expect(calculated.ok && calculated.value.workflowReadiness.canGeneratePresentation).toBe(false);
    expect((await saveOverlapDisposition({ analysisId: analysis.id, overlapGroupKey: "ASSET_PRODUCTIVITY", disposition: "VALUES_ADJUSTED_TO_REMOVE_OVERLAP", db })).ok).toBe(true);
    calculated = await calculateAnalysis({ analysisId: analysis.id, db });
    expect(calculated.ok && calculated.value.workflowReadiness.canGeneratePresentation).toBe(true);
    await saveOrThrow(deadhead.analysisModuleId, { target_deadhead_pct: 0.155 });
    calculated = await calculateAnalysis({ analysisId: analysis.id, db });
    expect(calculated.ok && calculated.value.overlapReviewStates[0].status).toBe("STALE");
    expect(calculated.ok && calculated.value.workflowReadiness.canGeneratePresentation).toBe(false);
  });
});
