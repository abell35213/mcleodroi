import { describe, expect, it } from "vitest";
import {
  buildCategoryBreakdown,
  buildCumulativeBenefitSeries,
  buildValueTypeBreakdown,
  buildValueWaterfall,
} from "@/lib/analyses/charts";
import type { CalculatedAnalysis, CalculatedAnalysisModule } from "@/lib/analyses/types";
import type { RoiMetrics } from "@/lib/calculations";

type ModuleSpec = {
  id: string;
  moduleKey: CalculatedAnalysisModule["moduleKey"];
  category: CalculatedAnalysisModule["category"];
  valueType: CalculatedAnalysisModule["valueType"];
  displayOrder: number;
  annualRecurringValue?: number;
  annualOnlyValue?: number;
  complete?: boolean;
};

function makeModule(spec: ModuleSpec): CalculatedAnalysisModule {
  const complete = spec.complete ?? true;
  return {
    analysisModuleId: spec.id,
    analysisId: "analysis-1",
    moduleKey: spec.moduleKey,
    status: complete ? "COMPLETE" : "IN_PROGRESS",
    displayOrder: spec.displayOrder,
    narrativeMode: "TEMPLATE",
    customNarrative: null,
    customNarrativeSourceFingerprint: null,
    inputs: [],
    reconstructedInputs: {},
    missingRequiredInputKeys: [],
    calculationOutcome: complete
      ? {
          success: true,
          result: {
            financialOutputs: {
              annualRecurringValue: spec.annualRecurringValue ?? 0,
              annualOnlyValue: spec.annualOnlyValue ?? 0,
            },
            derivedMetrics: {},
          },
        }
      : null,
    validationIssues: [],
    category: spec.category,
    valueType: spec.valueType,
  } as CalculatedAnalysisModule;
}

function makeAnalysis(
  modules: CalculatedAnalysisModule[],
  options: { roi?: RoiMetrics | null } = {},
): CalculatedAnalysis {
  const valueTypes = new Map<string, { annual: number; only: number }>();
  for (const moduleState of modules) {
    if (moduleState.status !== "COMPLETE" || !moduleState.calculationOutcome?.success) continue;
    const outputs = moduleState.calculationOutcome.result.financialOutputs;
    const current = valueTypes.get(moduleState.valueType) ?? { annual: 0, only: 0 };
    valueTypes.set(moduleState.valueType, {
      annual: current.annual + (outputs.annualRecurringValue ?? 0),
      only: current.only + (outputs.annualOnlyValue ?? 0),
    });
  }
  const valueTypeBreakdown = [...valueTypes.entries()].map(([valueType, totals]) => ({
    valueType: valueType as CalculatedAnalysisModule["valueType"],
    monthlyRecurringValue: 0,
    annualRecurringValue: totals.annual,
    annualOnlyValue: totals.only,
    annualEconomicOpportunity: totals.annual + totals.only,
  }));
  const total = valueTypeBreakdown.reduce((sum, entry) => sum + entry.annualEconomicOpportunity, 0);

  return {
    analysis: { id: "analysis-1", companyName: "Acme", businessType: "BROKERAGE", status: "DRAFT" },
    calculatedModules: modules,
    overlapNotices: [],
    summary: {
      monthlyRecurringValueTotal: 0,
      annualRecurringValueTotal: 0,
      annualOnlyValueTotal: 0,
      totalIdentifiedAnnualEconomicOpportunity: total,
      informationalCapitalValueTotal: 0,
      valueTypeBreakdown,
      informationalCapitalValues: [],
      moduleCount: modules.length,
      completeModuleCount: modules.length,
      incompleteModuleCount: 0,
    },
    workflowReadiness: {
      hasSelectedModules: true,
      allSelectedModulesComplete: true,
      canReview: true,
      canGeneratePresentation: true,
    },
    investment: {
      investmentOneTimeCost: null,
      investmentAnnualRecurringCost: null,
      investmentChangeManagementCost: null,
      roiHorizonYears: null,
      roiDiscountRatePct: null,
      adoptionSchedulePct: null,
    },
    roi: options.roi ?? null,
  };
}

const sampleModules = [
  makeModule({
    id: "m1",
    moduleKey: "BROKER_PRODUCTIVITY",
    category: "BR_CARRIER_BASE",
    valueType: "REVENUE_MARGIN_OPPORTUNITY",
    displayOrder: 2,
    annualRecurringValue: 120000,
  }),
  makeModule({
    id: "m2",
    moduleKey: "PROFIT_MARGIN_INCREASE",
    category: "BR_SHIPPER_SALES",
    valueType: "REVENUE_MARGIN_OPPORTUNITY",
    displayOrder: 1,
    annualRecurringValue: 80000,
  }),
  makeModule({
    id: "m3",
    moduleKey: "REDUCE_BILLING_LABOR",
    category: "BR_BACK_OFFICE",
    valueType: "CAPACITY_VALUE",
    displayOrder: 3,
    annualOnlyValue: 40000,
  }),
];

describe("buildValueWaterfall", () => {
  it("stacks contributing modules in display order and totals them", () => {
    const waterfall = buildValueWaterfall(makeAnalysis(sampleModules));
    expect(waterfall.steps.map((step) => step.analysisModuleId)).toEqual(["m2", "m1", "m3"]);
    expect(waterfall.steps.map((step) => step.value)).toEqual([80000, 120000, 40000]);
    expect(waterfall.steps.map((step) => step.start)).toEqual([0, 80000, 200000]);
    expect(waterfall.steps.map((step) => step.end)).toEqual([80000, 200000, 240000]);
    expect(waterfall.total).toBe(240000);
  });

  it("omits modules with no annual economic opportunity", () => {
    const withZero = [
      ...sampleModules,
      makeModule({
        id: "m4",
        moduleKey: "REDUCE_DEADHEAD",
        category: "TL_TRUCKING_OPERATIONS",
        valueType: "COST_REDUCTION",
        displayOrder: 4,
        annualRecurringValue: 0,
      }),
      makeModule({
        id: "m5",
        moduleKey: "REDUCE_OUT_OF_ROUTE",
        category: "TL_TRUCKING_OPERATIONS",
        valueType: "COST_REDUCTION",
        displayOrder: 5,
        annualRecurringValue: 50000,
        complete: false,
      }),
    ];
    const waterfall = buildValueWaterfall(makeAnalysis(withZero));
    expect(waterfall.steps.map((step) => step.analysisModuleId)).toEqual(["m2", "m1", "m3"]);
  });
});

describe("buildValueTypeBreakdown", () => {
  it("aggregates by value type with shares summing to one", () => {
    const breakdown = buildValueTypeBreakdown(makeAnalysis(sampleModules));
    expect(breakdown.total).toBe(240000);
    const revenue = breakdown.segments.find((segment) => segment.key === "REVENUE_MARGIN_OPPORTUNITY");
    const capacity = breakdown.segments.find((segment) => segment.key === "CAPACITY_VALUE");
    expect(revenue?.value).toBe(200000);
    expect(capacity?.value).toBe(40000);
    const shareSum = breakdown.segments.reduce((sum, segment) => sum + segment.share, 0);
    expect(shareSum).toBeCloseTo(1, 10);
  });
});

describe("buildCategoryBreakdown", () => {
  it("aggregates by category in display order", () => {
    const breakdown = buildCategoryBreakdown(makeAnalysis(sampleModules));
    expect(breakdown.segments.map((segment) => segment.key)).toEqual([
      "BR_SHIPPER_SALES",
      "BR_CARRIER_BASE",
      "BR_BACK_OFFICE",
    ]);
    expect(breakdown.segments.map((segment) => segment.value)).toEqual([80000, 120000, 40000]);
  });
});

describe("buildCumulativeBenefitSeries", () => {
  it("returns null when ROI is absent", () => {
    expect(buildCumulativeBenefitSeries(makeAnalysis(sampleModules))).toBeNull();
  });

  it("maps ROI curve into cash-flow points and payback in years", () => {
    const roi = {
      annualValue: 240000,
      investment: 300000,
      annualRecurringCost: 0,
      horizonYears: 3,
      discountRatePct: 0,
      adoptionSchedulePct: [1, 1, 1],
      netAnnualValue: 240000,
      netMonthlyValue: 20000,
      paybackMonths: 15,
      firstYearRoiPct: -0.2,
      horizonRoiPct: 1.4,
      npv: 420000,
      irr: 0.5,
      cumulativeBenefitCurve: [
        {
          year: 1,
          adoptionPct: 1,
          grossBenefit: 240000,
          netBenefit: 240000,
          cumulativeNetBenefit: 240000,
          cumulativeNetCashFlow: -60000,
          discountedNetBenefit: 240000,
          cumulativeNpv: -60000,
        },
        {
          year: 2,
          adoptionPct: 1,
          grossBenefit: 240000,
          netBenefit: 240000,
          cumulativeNetBenefit: 480000,
          cumulativeNetCashFlow: 180000,
          discountedNetBenefit: 240000,
          cumulativeNpv: 180000,
        },
        {
          year: 3,
          adoptionPct: 1,
          grossBenefit: 240000,
          netBenefit: 240000,
          cumulativeNetBenefit: 720000,
          cumulativeNetCashFlow: 420000,
          discountedNetBenefit: 240000,
          cumulativeNpv: 420000,
        },
      ],
    } satisfies RoiMetrics;
    const series = buildCumulativeBenefitSeries(makeAnalysis(sampleModules, { roi }));
    expect(series).not.toBeNull();
    expect(series?.investment).toBe(300000);
    expect(series?.paybackYears).toBeCloseTo(1.25, 10);
    expect(series?.points.map((point) => point.cumulativeNetCashFlow)).toEqual([
      -60000, 180000, 420000,
    ]);
    expect(series?.maxMagnitude).toBe(420000);
  });

  it("reports null payback when the investment never recoups", () => {
    const roi = {
      annualValue: 0,
      investment: 100000,
      annualRecurringCost: 0,
      horizonYears: 1,
      discountRatePct: 0,
      adoptionSchedulePct: [1],
      netAnnualValue: 0,
      netMonthlyValue: 0,
      paybackMonths: null,
      firstYearRoiPct: -1,
      horizonRoiPct: -1,
      npv: -100000,
      irr: null,
      cumulativeBenefitCurve: [
        {
          year: 1,
          adoptionPct: 1,
          grossBenefit: 0,
          netBenefit: 0,
          cumulativeNetBenefit: 0,
          cumulativeNetCashFlow: -100000,
          discountedNetBenefit: 0,
          cumulativeNpv: -100000,
        },
      ],
    } satisfies RoiMetrics;
    const series = buildCumulativeBenefitSeries(makeAnalysis(sampleModules, { roi }));
    expect(series?.paybackYears).toBeNull();
  });
});
