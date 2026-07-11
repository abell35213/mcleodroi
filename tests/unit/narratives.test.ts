import { describe, expect, it } from "vitest";
import { calculateValueModule } from "@/lib/calculations";
import type { CalculationOutcome, CalculationResult, ModuleInputMap } from "@/lib/calculations";
import type { CalculatedAnalysis, CalculatedAnalysisModule } from "@/lib/analyses/types";
import { getAllValueModules, getValueModule, type BusinessType, type ValueModuleKey } from "@/lib/modules";
import { availableModuleBusinessTypePairs, getNarrativeVariant, narrativeVariants, renderAnalysisNarratives, renderCalculatedModuleNarrative, resolveEffectiveNarrative } from "@/lib/narratives";

function moduleFor<K extends ValueModuleKey>(moduleKey: K, inputs: ModuleInputMap[K], status: CalculatedAnalysisModule["status"] = "COMPLETE", outcome?: CalculationOutcome<CalculationResult>): CalculatedAnalysisModule {
  const calculationOutcome = outcome ?? calculateValueModule(moduleKey, inputs);
  return { analysisModuleId: `${moduleKey}-id`, analysisId: "analysis-id", moduleKey, status, displayOrder: 100, narrativeMode: "TEMPLATE", customNarrative: null, customNarrativeSourceFingerprint: null, inputs: Object.entries(inputs).map(([inputKey, numericValue]) => ({ inputKey, numericValue })), reconstructedInputs: inputs, missingRequiredInputKeys: [], calculationOutcome, validationIssues: calculationOutcome.success ? [] : calculationOutcome.issues, category: "TL_BACK_OFFICE", valueType: getValueModule(moduleKey).valueType };
}

function render<K extends ValueModuleKey>(businessType: BusinessType, moduleKey: K, inputs: ModuleInputMap[K]) {
  const result = renderCalculatedModuleNarrative({ analysis: { id: "analysis-id", companyName: "West Side Transport", businessType, status: "DRAFT" }, calculatedModule: moduleFor(moduleKey, inputs) });
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.message);
  return result.value.customerAnalysis;
}

describe("narrative registry integrity", () => {
  it("has exactly one narrative for every available module/business type pair and no duplicates", () => {
    const keys = narrativeVariants.map((variant) => `${variant.moduleKey}:${variant.productContext}`);
    expect(new Set(keys).size).toBe(keys.length);
    for (const pair of availableModuleBusinessTypePairs()) {
      const result = getNarrativeVariant(pair.moduleKey, pair.businessType);
      expect(result.ok, `${pair.moduleKey}/${pair.businessType}`).toBe(true);
    }
  });

  it("aligns product context, status, and non-empty customer-facing fields", () => {
    for (const variant of narrativeVariants) {
      const definition = getValueModule(variant.moduleKey);
      expect(definition.productContexts).toContain(variant.productContext);
      expect(variant.status).toBe(definition.narrativeStatus);
      expect(variant.opportunityHeadline).toBeTruthy();
      expect(variant.valueNarrative).toBeTruthy();
      expect(variant.fullDisclaimer).toBeTruthy();
      expect(variant.presentationDisclaimer).toBeTruthy();
    }
    expect(getValueModule("BROKERAGE_LTL").narrativeStatus).toBe("NEEDS_PRODUCT_REVIEW");
    expect(getValueModule("SHORT_HAUL_EFFICIENCY").narrativeStatus).toBe("NEEDS_PRODUCT_REVIEW");
    expect(getNarrativeVariant("BROKERAGE_LTL", "BROKERAGE")).toMatchObject({ ok: true, value: { status: "NEEDS_PRODUCT_REVIEW" } });
    expect(getNarrativeVariant("SHORT_HAUL_EFFICIENCY", "TRUCKLOAD")).toMatchObject({ ok: true, value: { status: "NEEDS_PRODUCT_REVIEW" } });
  });


  it("surfaces product-review modules in review readiness status counts", () => {
    const calculatedModules = [
      moduleFor("BROKERAGE_LTL", { current_manual_hours_month: 100, hours_saved_month: 40, hourly_labor_rate: 30 }),
      moduleFor("SHORT_HAUL_EFFICIENCY", { tickets_per_week: 525, current_minutes_per_ticket: 5, target_minutes_per_ticket: 2, hourly_labor_rate: 30, transaction_cost_per_ticket: 0.25 }),
    ];

    const needsReviewCount = calculatedModules.filter((module) => getValueModule(module.moduleKey).narrativeStatus === "NEEDS_PRODUCT_REVIEW").length;

    expect(needsReviewCount).toBe(2);
  });

  it("rejects unavailable business type variants", () => {
    expect(getNarrativeVariant("BROKER_PRODUCTIVITY", "TRUCKLOAD").ok).toBe(false);
    expect(getNarrativeVariant("REDUCE_DEADHEAD", "BROKERAGE").ok).toBe(false);
  });

  it("renders complete modules but rejects in-progress and failed outcomes", () => {
    const inputs = { current_deadhead_pct: 0.17, target_deadhead_pct: 0.16, monthly_miles: 2500000, variable_cost_per_mile: 0.45 };
    expect(renderCalculatedModuleNarrative({ analysis: { id: "a", companyName: "A", businessType: "TRUCKLOAD", status: "DRAFT" }, calculatedModule: moduleFor("REDUCE_DEADHEAD", inputs) }).ok).toBe(true);
    expect(renderCalculatedModuleNarrative({ analysis: { id: "a", companyName: "A", businessType: "TRUCKLOAD", status: "DRAFT" }, calculatedModule: moduleFor("REDUCE_DEADHEAD", inputs, "IN_PROGRESS") }).ok).toBe(false);
    const failed = calculateValueModule("REDUCE_DEADHEAD", { ...inputs, target_deadhead_pct: 0.2 });
    expect(renderCalculatedModuleNarrative({ analysis: { id: "a", companyName: "A", businessType: "TRUCKLOAD", status: "DRAFT" }, calculatedModule: moduleFor("REDUCE_DEADHEAD", inputs, "COMPLETE", failed) }).ok).toBe(false);
  });

  it("preserves full analysis order and requires review readiness", () => {
    const calculatedModules = [moduleFor("REDUCE_DEADHEAD", { current_deadhead_pct: 0.17, target_deadhead_pct: 0.16, monthly_miles: 2500000, variable_cost_per_mile: 0.45 }), moduleFor("PROFIT_MARGIN_INCREASE", { monthly_gross_revenue: 500000, current_margin_pct: 0.12, target_margin_pct: 0.13 })];
    const analysis: CalculatedAnalysis = { analysis: { id: "a", companyName: "A", businessType: "TRUCKLOAD", status: "DRAFT" }, calculatedModules, overlapNotices: [], overlapReviewStates: [], summary: { monthlyRecurringValueTotal: 0, annualRecurringValueTotal: 0, annualOnlyValueTotal: 0, totalIdentifiedAnnualEconomicOpportunity: 0, informationalCapitalValueTotal: 0, valueTypeBreakdown: [], informationalCapitalValues: [], moduleCount: 2, completeModuleCount: 2, incompleteModuleCount: 0 }, workflowReadiness: { hasSelectedModules: true, allSelectedModulesComplete: true, canReview: true, canGeneratePresentation: true }, investment: { investmentOneTimeCost: null, investmentAnnualRecurringCost: null, investmentChangeManagementCost: null, roiHorizonYears: null, roiDiscountRatePct: null, adoptionSchedulePct: null }, roi: null };
    const rendered = renderAnalysisNarratives(analysis);
    expect(rendered.ok).toBe(true);
    if (rendered.ok) expect(rendered.value.map((n) => n.moduleKey)).toEqual(["REDUCE_DEADHEAD", "PROFIT_MARGIN_INCREASE"]);
    expect(renderAnalysisNarratives({ ...analysis, workflowReadiness: { ...analysis.workflowReadiness, canReview: false } }).ok).toBe(false);
  });

  it("proves shared variants differ where required", () => {
    expect(getNarrativeVariant("PROFIT_MARGIN_INCREASE", "TRUCKLOAD")).toMatchObject({ ok: true, value: { opportunityHeadline: "Strengthen Margin through Better Operating and Pricing Decisions" } });
    expect(getNarrativeVariant("PROFIT_MARGIN_INCREASE", "BROKERAGE")).toMatchObject({ ok: true, value: { opportunityHeadline: "Improve Pricing Visibility and Retain More Gross Margin" } });
    const lm = getNarrativeVariant("RECURRING_ORDER_AUTOMATION", "TRUCKLOAD");
    const pb = getNarrativeVariant("RECURRING_ORDER_AUTOMATION", "BROKERAGE");
    expect(lm.ok && String(lm.value.valueNarrative)).toMatch(/schedul/i);
    expect(pb.ok && String(pb.value.valueNarrative)).not.toMatch(/schedul/i);
  });

  it("covers the P1-2 canonical 21 modules", () => {
    expect(getAllValueModules()).toHaveLength(21);
    expect(narrativeVariants).toHaveLength(31);
  });
});

describe("narrative customer analysis regressions", () => {
  it("renders broker productivity business facts", () => {
    const analysis = render("BROKERAGE", "BROKER_PRODUCTIVITY", { current_loads_per_broker_day: 2, target_loads_per_broker_day: 3, broker_count: 5, working_days_month: 21, average_margin_per_load: 50 });
    for (const expected of ["West Side Transport", "2", "3", "5 brokers", "105", "$50", "$5,250"]) expect(analysis).toContain(expected);
  });

  it("renders deadhead business facts", () => {
    const analysis = render("TRUCKLOAD", "REDUCE_DEADHEAD", { current_deadhead_pct: 0.17, target_deadhead_pct: 0.16, monthly_miles: 2500000, variable_cost_per_mile: 0.45 });
    for (const expected of ["17%", "16%", "2,500,000", "25,000", "$0.45", "$11,250"]) expect(analysis).toContain(expected);
  });

  it("renders trailer business facts", () => {
    const analysis = render("TRUCKLOAD", "TRAILER_ASSET_UTILIZATION", { trailer_count: 400, tractor_count: 155, average_trailer_value: 57500, ratio_improvement_pct: 0.02, asset_life_months: 60, residual_value_pct: 0.2 });
    for (const expected of ["400", "155", "2%", "$57,500", "$460,000", "60", "20%", "$6,133"]) expect(analysis).toContain(expected);
  });

  it("renders driver turnover business facts", () => {
    const analysis = render("TRUCKLOAD", "DRIVER_TURNOVER", { current_annual_turnover_pct: 0.4, target_annual_turnover_pct: 0.35, driver_count: 170, recruiting_cost_per_driver: 3000 });
    for (const expected of ["40%", "35%", "170", "8.5", "$3,000", "$25,500", "$2,125"]) expect(analysis).toContain(expected);
  });

  it("renders short haul business facts", () => {
    const analysis = render("TRUCKLOAD", "SHORT_HAUL_EFFICIENCY", { tickets_per_week: 525, current_minutes_per_ticket: 5, target_minutes_per_ticket: 2, hourly_labor_rate: 30, transaction_cost_per_ticket: 0.25 });
    for (const expected of ["525", "5", "2", "113.7 hours", "$30", "$3,410", "$568", "$2,842"]) expect(analysis).toContain(expected);
  });

  it("renders margin improvement as retained margin, not revenue growth", () => {
    const analysis = render("TRUCKLOAD", "PROFIT_MARGIN_INCREASE", { monthly_gross_revenue: 500000, current_margin_pct: 0.12, target_margin_pct: 0.13 });
    for (const expected of ["12%", "13%", "1 percentage-point improvement", "$500,000", "$5,000"]) expect(analysis).toContain(expected);
    expect(analysis).not.toMatch(/revenue growth|revenue gain/i);
  });
});

describe("custom narrative resolution", () => {
  const renderedDefaultNarrative = { moduleKey: "REDUCE_DEADHEAD" as const, productContext: "LOADMASTER" as const, status: "DRAFT_APPROVED" as const, opportunityHeadline: "h", valueNarrative: "v", customerAnalysis: "template", fullDisclaimer: "f", presentationDisclaimer: "p", presentationCallout: "c" };
  it("returns template default for TEMPLATE mode", () => {
    expect(resolveEffectiveNarrative({ renderedDefaultNarrative, narrativeMode: "TEMPLATE", customNarrative: null })).toEqual({ ok: true, value: "template" });
  });
  it("requires non-empty custom narrative for CUSTOM mode", () => {
    expect(resolveEffectiveNarrative({ renderedDefaultNarrative, narrativeMode: "CUSTOM", customNarrative: " custom " })).toEqual({ ok: true, value: "custom" });
    expect(resolveEffectiveNarrative({ renderedDefaultNarrative, narrativeMode: "CUSTOM", customNarrative: " " }).ok).toBe(false);
  });
});

describe("P1-7 narrative fingerprint helpers", () => {
  it("normalizes outer whitespace and line endings only", async () => {
    const { normalizeNarrativeForComparison } = await import("@/lib/narratives/fingerprint");
    expect(normalizeNarrativeForComparison("  A\r\n\r\nB  ")).toBe("A\n\nB");
  });

  it("includes narrative registry version in fingerprint source", async () => {
    const { createNarrativeSourceFingerprint } = await import("@/lib/narratives/fingerprint");
    const calculatedModule = moduleFor("BROKER_PRODUCTIVITY", { current_loads_per_broker_day: 0, target_loads_per_broker_day: 3.5, broker_count: 5, working_days_month: 20, average_margin_per_load: 75 });
    expect(createNarrativeSourceFingerprint({ module: calculatedModule, businessType: "BROKERAGE", narrativeRegistryVersion: "1.0.0" })).not.toBe(createNarrativeSourceFingerprint({ module: calculatedModule, businessType: "BROKERAGE", narrativeRegistryVersion: "1.0.1" }));
  });
});
