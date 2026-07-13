import { CAPACITY_VALUE_PRESENTATION_DISCLAIMER } from "@/lib/narratives/registry";
import { getValueModule } from "@/lib/modules";
import type { ValueModuleInputDefinition, ValueType } from "@/lib/modules";
import { buildAssumptionsAppendix } from "@/lib/analyses/assumptions";
import { formatPresentationCount, formatPresentationCurrency, formatPresentationHours, formatPresentationPercentage } from "@/lib/presentation/format";
import { APPROVED_POWERPOINT_TEMPLATE_PATH, APPROVED_THEME_IMAGE_PATH, APPROVED_TITLE_SLIDE_IMAGE_PATH, requireGoldenPresentationAsset } from "@/lib/presentation/theme";
import { validatePresentationTextLength } from "@/lib/presentation/text";
import type { AssumptionItemModel, AssumptionsAppendixSlideModel, CategoryOverviewSlideModel, CoverSlideModel, DualModuleSlideModel, ExecutiveSummarySlideModel, InvestmentReturnSlideModel, MetricModel, OpportunitySummarySlideModel, PresentationSnapshot, PresentationSnapshotCategory, PresentationSnapshotModule, SingleModuleSlideModel, ValueCardModel } from "@/lib/presentation/types";

export type CoverSlidePlan = { kind: "cover"; model: CoverSlideModel };
export type ExecutiveSummarySlidePlan = { kind: "executiveSummary"; model: ExecutiveSummarySlideModel };
export type SingleModuleSlidePlan = { kind: "singleModule"; model: SingleModuleSlideModel };
export type DualModuleSlidePlan = { kind: "dualModule"; model: DualModuleSlideModel };
export type CategoryOverviewSlidePlan = { kind: "categoryOverview"; model: CategoryOverviewSlideModel };
export type OpportunitySummarySlidePlan = { kind: "opportunitySummary"; model: OpportunitySummarySlideModel };
export type InvestmentReturnSlidePlan = { kind: "investmentReturn"; model: InvestmentReturnSlideModel };
export type AssumptionsAppendixSlidePlan = { kind: "assumptionsAppendix"; model: AssumptionsAppendixSlideModel };
export type PresentationSlidePlan = CoverSlidePlan | ExecutiveSummarySlidePlan | SingleModuleSlidePlan | DualModuleSlidePlan | CategoryOverviewSlidePlan | OpportunitySummarySlidePlan | InvestmentReturnSlidePlan | AssumptionsAppendixSlidePlan;

const valueTypeLabels: Record<ValueType, string> = {
  REVENUE_MARGIN_OPPORTUNITY: "Revenue / Margin Opportunity",
  COST_REDUCTION: "Cost Reduction",
  CAPACITY_VALUE: "Capacity Value",
  NET_CAPACITY_VALUE: "Net Capacity Value",
  COST_AVOIDANCE: "Cost Avoidance",
  CAPITAL_AVOIDANCE: "Capital Avoidance",
};
function num(v: unknown): number { return typeof v === "number" && Number.isFinite(v) ? v : 0; }
function annualOpportunity(m: PresentationSnapshotModule): number { return num(m.financialOutputs.annualRecurringValue) + num(m.financialOutputs.annualOnlyValue); }
function monthlyValue(m: PresentationSnapshotModule): number { return num(m.financialOutputs.monthlyRecurringValue); }
function capitalValue(m: PresentationSnapshotModule): number { return num(m.financialOutputs.informationalCapitalValue); }
function formatDate(value: string): string { return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(value)); }

function metricForModule(m: PresentationSnapshotModule): MetricModel & { variant?: "standard" | "annual" | "capital" } {
  if (m.valueType === "CAPITAL_AVOIDANCE") return { value: formatPresentationCurrency(capitalValue(m)), label: "Avoided Capital Investment", supportingText: monthlyValue(m) ? `${formatPresentationCurrency(monthlyValue(m))} monthly economic equivalent` : undefined, variant: "capital" };
  if (m.valueType === "NET_CAPACITY_VALUE") return { value: formatPresentationCurrency(monthlyValue(m) || annualOpportunity(m)), period: monthlyValue(m) ? "/ MONTH" : "/ YEAR", label: annualOpportunity(m) < 0 || monthlyValue(m) < 0 ? "Net Economic Impact" : "Net Capacity Value" };
  if (monthlyValue(m)) return { value: formatPresentationCurrency(monthlyValue(m)), period: "/ MONTH", label: valueTypeLabels[m.valueType] };
  return { value: formatPresentationCurrency(annualOpportunity(m)), period: "/ YEAR", label: valueTypeLabels[m.valueType], variant: "annual" };
}
function financialValueForCard(m: PresentationSnapshotModule): number { return annualOpportunity(m) || monthlyValue(m) || capitalValue(m); }
function valueCardFromModule(m: PresentationSnapshotModule): ValueCardModel { const metric = metricForModule(m); return { title: m.moduleName, value: metric.value, period: metric.period, label: metric.label, supportingMetric: m.presentationCallout || undefined, valueType: m.valueType }; }

function formatInputValue(input: ValueModuleInputDefinition, raw: number): string {
  if (input.type === "CURRENCY") return formatPresentationCurrency(raw);
  if (input.type === "PERCENTAGE") return formatPresentationPercentage(raw);
  if (input.unit.includes("HOURS")) return formatPresentationHours(raw);
  return formatPresentationCount(raw);
}
function assumptionItems(m: PresentationSnapshotModule): AssumptionItemModel[] {
  const definition = getValueModule(m.moduleKey);
  return definition.inputDefinitions.slice(0, 4).flatMap((input) => typeof m.inputs[input.key] === "number" ? [{ label: input.label, value: formatInputValue(input, m.inputs[input.key] as number) }] : []);
}

function singleModuleModel(snapshot: PresentationSnapshot, m: PresentationSnapshotModule, slideNumber: number): SingleModuleSlideModel {
  const capital = m.valueType === "CAPITAL_AVOIDANCE" && monthlyValue(m) ? `Monthly economic equivalent: ${formatPresentationCurrency(monthlyValue(m))}.` : undefined;
  return { companyName: snapshot.analysis.companyName, categoryLabel: m.categoryName, moduleTitle: m.moduleName, analysisText: m.effectiveCustomerAnalysis, valueNarrative: m.valueNarrative, effectiveCustomerAnalysis: m.effectiveCustomerAnalysis, presentationCallout: m.presentationCallout, heroMetric: metricForModule(m), assumptions: assumptionItems(m), disclaimer: m.presentationDisclaimer || undefined, informationalCapitalCallout: capital, slideNumber };
}
export function canUseDualModuleSlide(a: PresentationSnapshotModule, b: PresentationSnapshotModule): boolean {
  return a.categoryKey === b.categoryKey && validatePresentationTextLength({ text: a.effectiveCustomerAnalysis, kind: "dualModuleAnalysis" }).length === 0 && validatePresentationTextLength({ text: b.effectiveCustomerAnalysis, kind: "dualModuleAnalysis" }).length === 0 && validatePresentationTextLength({ text: a.valueNarrative, kind: "dualModuleAnalysis" }).length === 0 && validatePresentationTextLength({ text: b.valueNarrative, kind: "dualModuleAnalysis" }).length === 0 && a.valueType !== "CAPITAL_AVOIDANCE" && b.valueType !== "CAPITAL_AVOIDANCE";
}
function categoryOverview(snapshot: PresentationSnapshot, c: PresentationSnapshotCategory, slideNumber: number): CategoryOverviewSlideModel {
  const total = c.modules.reduce((sum, m) => sum + annualOpportunity(m), 0);
  const cards = [...c.modules].filter((m) => financialValueForCard(m) !== 0).sort((a, b) => Math.abs(financialValueForCard(b)) - Math.abs(financialValueForCard(a))).slice(0, 4).map(valueCardFromModule);
  return { companyName: snapshot.analysis.companyName, categoryName: c.name, categoryOpportunity: { value: formatPresentationCurrency(total), label: "Annual Identified Opportunity" }, cards, slideNumber };
}
function executive(snapshot: PresentationSnapshot, slideNumber: number): ExecutiveSummarySlideModel {
  const modules = snapshot.categories.flatMap((category) => category.modules);
  const moduleNames = modules.map((m) => m.moduleName);
  const categoryNames = [...new Set(snapshot.categories.filter((category) => category.modules.length > 0).map((category) => category.name))];
  const productName = snapshot.analysis.productContext === "POWERBROKER" ? "PowerBroker" : "LoadMaster";
  const businessTypeLabel = snapshot.analysis.businessType === "BROKERAGE" ? "freight brokerage" : "truckload carrier";
  const selectedList = moduleNames.slice(0, 5).join(", ");
  requireGoldenPresentationAsset(APPROVED_POWERPOINT_TEMPLATE_PATH);
  requireGoldenPresentationAsset(APPROVED_THEME_IMAGE_PATH);
  return {
    companyName: snapshot.analysis.companyName,
    businessTypeLabel,
    productName,
    categoryNames,
    moduleNames,
    discussionSummary: `${snapshot.analysis.companyName} is a ${businessTypeLabel} business evaluating robust technology to support scalable growth, improve operational performance, recover capacity, and strengthen financial outcomes.`,
    alignmentSummary: `During discovery and solution alignment, the analysis focused on ${selectedList}${moduleNames.length > 5 ? ", and related opportunities" : ""}. McLeod has aligned its fully integrated ${productName} platform${snapshot.analysis.productContext === "POWERBROKER" ? " with DocumentPower capabilities" : ""} to address these current pain points and system requirements.`,
    keyAreasLeadIn: `McLeod’s fully integrated ${productName}${snapshot.analysis.productContext === "POWERBROKER" ? " & DocumentPower" : ""} platform addresses your key areas of need by:`,
    needThemes: categoryNames.slice(0, 3).map((name) => {
      const categoryModules = snapshot.categories.find((category) => category.name === name)?.modules ?? [];
      return {
        heading: name,
        bullets: categoryModules.slice(0, 2).map((m) => `${m.moduleName}: ${m.opportunityHeadline}`),
      };
    }),
    slideNumber,
    annualOpportunity: { value: formatPresentationCurrency(snapshot.summary.totalIdentifiedAnnualEconomicOpportunity), label: "Annual Identified Economic Opportunity" },
    monthlyOpportunity: snapshot.summary.monthlyRecurringValueTotal ? { value: formatPresentationCurrency(snapshot.summary.monthlyRecurringValueTotal), label: "Monthly Recurring Economic Opportunity" } : undefined,
  };
}
const SUMMARY_CARDS_PER_SLIDE = 4;
function opportunity(snapshot: PresentationSnapshot, slideNumber: number, modules: PresentationSnapshotModule[], showTotals: boolean, continued: boolean): OpportunitySummarySlideModel {
  const hasCapacity = snapshot.categories.some((c) => c.modules.some((m) => m.valueType === "CAPACITY_VALUE" || m.valueType === "NET_CAPACITY_VALUE"));
  return {
    companyName: snapshot.analysis.companyName,
    title: continued ? "The Identified Opportunities — Continued" : "The Identified Opportunities",
    classifications: modules.map(valueCardFromModule),
    monthlyOpportunity: snapshot.summary.monthlyRecurringValueTotal ? { value: formatPresentationCurrency(snapshot.summary.monthlyRecurringValueTotal), label: "Monthly Recurring Economic Opportunity" } : undefined,
    annualOpportunity: { value: formatPresentationCurrency(snapshot.summary.totalIdentifiedAnnualEconomicOpportunity), label: "Annual Identified Economic Opportunity" },
    informationalCapital: snapshot.summary.informationalCapitalValueTotal ? { value: formatPresentationCurrency(snapshot.summary.informationalCapitalValueTotal), label: "Informational Capital Avoidance" } : undefined,
    disclaimer: hasCapacity ? CAPACITY_VALUE_PRESENTATION_DISCLAIMER : "Values shown are directional business-impact estimates based on reviewed analysis inputs.",
    slideNumber,
    showTotals,
  };
}

function safePct(value: number | null): string { return value === null || !Number.isFinite(value) ? "Not applicable" : formatPresentationPercentage(value); }
function safeCurrency(value: number | null): string { return value === null || !Number.isFinite(value) ? "Not applicable" : formatPresentationCurrency(value); }
function paybackWording(paybackMonths: number | null, horizonYears: number, investment: number): string {
  if (paybackMonths !== null) return `${formatPresentationCount(paybackMonths)} months`;
  if (investment <= 0) return "payback is not applicable under the current investment assumptions";
  return "the configured analysis horizon is not expected to reach full payback";
}
function paybackDisplay(paybackMonths: number | null, horizonYears: number, investment: number): string {
  if (paybackMonths !== null) return `${formatPresentationCount(paybackMonths)} Months`;
  if (investment <= 0) return "Not applicable";
  return `Not achieved within ${horizonYears} years`;
}
function investmentReturn(snapshot: PresentationSnapshot, slideNumber: number): InvestmentReturnSlideModel | null {
  const roi = snapshot.roi;
  if (!roi) return null;
  const wording = paybackWording(roi.paybackMonths, roi.horizonYears, roi.investment);
  return {
    companyName: snapshot.analysis.companyName,
    explanationText: `By investing in McLeod Software, ${snapshot.analysis.companyName} can begin capturing the operational and financial opportunities identified in this analysis. Based on the configured investment and adoption assumptions, the investment is estimated to achieve payback within ${wording}, after which the cumulative economic benefit continues to grow throughout the analysis period.`,
    initialInvestment: formatPresentationCurrency(roi.investment),
    annualRecurringInvestment: formatPresentationCurrency(roi.annualRecurringCost),
    firstYearROI: safePct(roi.firstYearRoiPct),
    horizonYears: roi.horizonYears,
    horizonROI: safePct(roi.horizonRoiPct),
    paybackMonths: roi.paybackMonths,
    paybackDisplay: paybackDisplay(roi.paybackMonths, roi.horizonYears, roi.investment),
    netPresentValue: safeCurrency(roi.npv),
    internalRateOfReturn: roi.irr === null || !Number.isFinite(roi.irr) ? "Unable to calculate" : formatPresentationPercentage(roi.irr),
    adoptionSchedule: roi.adoptionSchedulePct.map((pct, index) => ({ year: index + 1, display: formatPresentationPercentage(pct) })),
    cumulativeCashFlowPoints: roi.cumulativeCashFlowPoints ?? [],
    methodologyNote: "Return estimates reflect the configured investment, recurring costs, and annual benefit-realization schedule. Payback assumes benefit realization is distributed evenly within each year. Results are planning estimates and are not audited financial projections.",
    slideNumber,
  };
}

function assumptionsAppendixModel(snapshot: PresentationSnapshot, slideNumber: number): AssumptionsAppendixSlideModel | null {
  const orderedModules = [...snapshot.categories]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .flatMap((category) => [...category.modules].sort((a, b) => a.displayOrder - b.displayOrder))
    .map((m) => ({ moduleKey: m.moduleKey, moduleName: m.moduleName, categoryName: m.categoryName, inputs: m.inputs }));
  const appendix = buildAssumptionsAppendix(orderedModules);
  if (appendix.modules.length === 0) return null;
  return {
    companyName: snapshot.analysis.companyName,
    modules: appendix.modules.map((m) => ({ moduleName: m.moduleName, categoryName: m.categoryName, rows: m.rows.map((r) => ({ label: r.label, enteredValue: r.enteredValue, typicalRange: r.typicalRange, sourceLabel: r.sourceLabel })) })),
    sources: appendix.sources.map((s) => ({ label: s.label, citation: s.citation })),
    slideNumber,
  };
}

export function composePresentationSlidePlan(snapshot: PresentationSnapshot): PresentationSlidePlan[] {
  let slide = 1;
  const plans: PresentationSlidePlan[] = [{ kind: "cover", model: { companyName: snapshot.analysis.companyName, analysisDate: formatDate(snapshot.analysis.analysisDate), preparedBy: snapshot.analysis.preparedBy, titleSlideImagePath: requireGoldenPresentationAsset(APPROVED_TITLE_SLIDE_IMAGE_PATH), slideNumber: slide++ } }];
  plans.push({ kind: "executiveSummary", model: executive(snapshot, slide++) });
  for (const category of [...snapshot.categories].sort((a,b) => a.displayOrder - b.displayOrder)) {
    const modules = [...category.modules].sort((a,b) => a.displayOrder - b.displayOrder);
    if (modules.length === 0) continue;
    if (modules.length >= 3) plans.push({ kind: "categoryOverview", model: categoryOverview(snapshot, { ...category, modules }, slide++) });
    for (const selectedModule of modules) {
      plans.push({ kind: "singleModule", model: singleModuleModel(snapshot, selectedModule, slide++) });
    }
  }
  const orderedModules = [...snapshot.categories]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .flatMap((category) => [...category.modules].sort((a, b) => a.displayOrder - b.displayOrder));
  for (let i = 0; i < orderedModules.length; i += SUMMARY_CARDS_PER_SLIDE) {
    const pageModules = orderedModules.slice(i, i + SUMMARY_CARDS_PER_SLIDE);
    const isFinalSummaryPage = i + SUMMARY_CARDS_PER_SLIDE >= orderedModules.length;
    plans.push({ kind: "opportunitySummary", model: opportunity(snapshot, slide++, pageModules, isFinalSummaryPage, i > 0) });
  }
  const returnSlide = investmentReturn(snapshot, slide);
  if (returnSlide) { plans.push({ kind: "investmentReturn", model: returnSlide }); slide++; }
  const appendix = assumptionsAppendixModel(snapshot, slide);
  if (appendix) { plans.push({ kind: "assumptionsAppendix", model: appendix }); slide++; }
  return plans;
}
