import { CAPACITY_VALUE_PRESENTATION_DISCLAIMER } from "@/lib/narratives/registry";
import { getValueModule } from "@/lib/modules";
import type { ValueModuleInputDefinition, ValueType } from "@/lib/modules";
import { formatPresentationCount, formatPresentationCurrency, formatPresentationHours, formatPresentationPercentage } from "@/lib/presentation/format";
import { APPROVED_COVER_LOGO_PATH, APPROVED_POWERPOINT_TEMPLATE_PATH, APPROVED_TITLE_SLIDE_IMAGE_PATH, requireGoldenPresentationAsset } from "@/lib/presentation/theme";
import { validatePresentationTextLength } from "@/lib/presentation/text";
import type { AssumptionItemModel, CategoryOverviewSlideModel, CoverSlideModel, DualModuleItemModel, DualModuleSlideModel, ExecutiveSummarySlideModel, MetricModel, OpportunitySummarySlideModel, PresentationSnapshot, PresentationSnapshotCategory, PresentationSnapshotModule, SingleModuleSlideModel, ValueCardModel } from "@/lib/presentation/types";

export type CoverSlidePlan = { kind: "cover"; model: CoverSlideModel };
export type ExecutiveSummarySlidePlan = { kind: "executiveSummary"; model: ExecutiveSummarySlideModel };
export type SingleModuleSlidePlan = { kind: "singleModule"; model: SingleModuleSlideModel };
export type DualModuleSlidePlan = { kind: "dualModule"; model: DualModuleSlideModel };
export type CategoryOverviewSlidePlan = { kind: "categoryOverview"; model: CategoryOverviewSlideModel };
export type OpportunitySummarySlidePlan = { kind: "opportunitySummary"; model: OpportunitySummarySlideModel };
export type PresentationSlidePlan = CoverSlidePlan | ExecutiveSummarySlidePlan | SingleModuleSlidePlan | DualModuleSlidePlan | CategoryOverviewSlidePlan | OpportunitySummarySlidePlan;

const valueTypeLabels: Record<ValueType, string> = {
  REVENUE_MARGIN_OPPORTUNITY: "Revenue / Margin Opportunity",
  COST_REDUCTION: "Cost Reduction",
  CAPACITY_VALUE: "Capacity Value",
  NET_CAPACITY_VALUE: "Net Capacity Value",
  COST_AVOIDANCE: "Cost Avoidance",
  CAPITAL_AVOIDANCE: "Capital Avoidance",
};
const valueTypeOrder: ValueType[] = ["REVENUE_MARGIN_OPPORTUNITY", "COST_REDUCTION", "CAPACITY_VALUE", "COST_AVOIDANCE", "NET_CAPACITY_VALUE", "CAPITAL_AVOIDANCE"];

function num(v: unknown): number { return typeof v === "number" && Number.isFinite(v) ? v : 0; }
function annualOpportunity(m: PresentationSnapshotModule): number { return num(m.financialOutputs.annualRecurringValue) + num(m.financialOutputs.annualOnlyValue); }
function monthlyValue(m: PresentationSnapshotModule): number { return num(m.financialOutputs.monthlyRecurringValue); }
function capitalValue(m: PresentationSnapshotModule): number { return num(m.financialOutputs.informationalCapitalValue); }
function formatDate(value: string): string { return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(value)); }

function metricForModule(m: PresentationSnapshotModule): MetricModel & { variant?: "standard" | "annual" | "capital" } {
  if (m.valueType === "CAPITAL_AVOIDANCE") return { value: formatPresentationCurrency(capitalValue(m)), label: "Avoided Capital Investment", supportingText: monthlyValue(m) ? `${formatPresentationCurrency(monthlyValue(m))} monthly economic equivalent` : undefined, variant: "capital" };
  if (m.valueType === "NET_CAPACITY_VALUE") return { value: formatPresentationCurrency(monthlyValue(m) || annualOpportunity(m)), period: monthlyValue(m) ? "/ MONTH" : "/ YEAR", label: "Net Capacity Value" };
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
function dualItem(m: PresentationSnapshotModule): DualModuleItemModel { const metric = metricForModule(m); return { title: m.moduleName, primaryMetric: metric.value, period: metric.period, label: metric.label, supportingMetric: m.presentationCallout || undefined, analysisText: m.effectiveCustomerAnalysis, howMcLeodHelps: m.valueNarrative, customerImpact: m.effectiveCustomerAnalysis }; }
export function canUseDualModuleSlide(a: PresentationSnapshotModule, b: PresentationSnapshotModule): boolean {
  return a.categoryKey === b.categoryKey && validatePresentationTextLength({ text: a.effectiveCustomerAnalysis, kind: "dualModuleAnalysis" }).length === 0 && validatePresentationTextLength({ text: b.effectiveCustomerAnalysis, kind: "dualModuleAnalysis" }).length === 0 && validatePresentationTextLength({ text: a.valueNarrative, kind: "dualModuleAnalysis" }).length === 0 && validatePresentationTextLength({ text: b.valueNarrative, kind: "dualModuleAnalysis" }).length === 0 && a.valueType !== "CAPITAL_AVOIDANCE" && b.valueType !== "CAPITAL_AVOIDANCE";
}
function categoryOverview(snapshot: PresentationSnapshot, c: PresentationSnapshotCategory, slideNumber: number): CategoryOverviewSlideModel {
  const total = c.modules.reduce((sum, m) => sum + annualOpportunity(m), 0);
  const cards = c.modules.filter((m) => financialValueForCard(m) > 0).slice(0, 4).map(valueCardFromModule);
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
function opportunity(snapshot: PresentationSnapshot, slideNumber: number): OpportunitySummarySlideModel {
  const classifications = valueTypeOrder.flatMap((vt) => { const b = snapshot.summary.valueTypeBreakdown.find((x) => x.valueType === vt); return b && b.annualEconomicOpportunity > 0 ? [{ title: valueTypeLabels[vt].toUpperCase(), value: formatPresentationCurrency(b.annualEconomicOpportunity), label: "Annual Identified Opportunity", valueType: vt }] : []; });
  const hasCapacity = snapshot.categories.some((c) => c.modules.some((m) => m.valueType === "CAPACITY_VALUE" || m.valueType === "NET_CAPACITY_VALUE"));
  return { companyName: snapshot.analysis.companyName, classifications, monthlyOpportunity: snapshot.summary.monthlyRecurringValueTotal ? { value: formatPresentationCurrency(snapshot.summary.monthlyRecurringValueTotal), label: "Monthly Recurring Economic Opportunity" } : undefined, annualOpportunity: { value: formatPresentationCurrency(snapshot.summary.totalIdentifiedAnnualEconomicOpportunity), label: "Annual Identified Economic Opportunity" }, informationalCapital: snapshot.summary.informationalCapitalValueTotal ? { value: formatPresentationCurrency(snapshot.summary.informationalCapitalValueTotal), label: "Informational Capital Avoidance" } : undefined, disclaimer: hasCapacity ? CAPACITY_VALUE_PRESENTATION_DISCLAIMER : "Values shown are directional business-impact estimates based on reviewed analysis inputs.", slideNumber };
}

export function composePresentationSlidePlan(snapshot: PresentationSnapshot): PresentationSlidePlan[] {
  let slide = 1;
  const plans: PresentationSlidePlan[] = [{ kind: "cover", model: { companyName: snapshot.analysis.companyName, analysisDate: formatDate(snapshot.analysis.analysisDate), preparedBy: snapshot.analysis.preparedBy, coverLogoPath: requireGoldenPresentationAsset(APPROVED_COVER_LOGO_PATH), titleSlideImagePath: requireGoldenPresentationAsset(APPROVED_TITLE_SLIDE_IMAGE_PATH), slideNumber: slide++ } }];
  plans.push({ kind: "executiveSummary", model: executive(snapshot, slide++) });
  for (const category of [...snapshot.categories].sort((a,b) => a.displayOrder - b.displayOrder)) {
    const modules = [...category.modules].sort((a,b) => a.displayOrder - b.displayOrder);
    if (modules.length === 0) continue;
    if (modules.length >= 3) plans.push({ kind: "categoryOverview", model: categoryOverview(snapshot, { ...category, modules }, slide++) });
    for (let i = 0; i < modules.length; i++) {
      const next = modules[i + 1];
      if (next && canUseDualModuleSlide(modules[i], next)) { plans.push({ kind: "dualModule", model: { companyName: snapshot.analysis.companyName, categoryLabel: category.name, title: `${category.name} Opportunities`, modules: [dualItem(modules[i]), dualItem(next)], slideNumber: slide++ } }); i++; }
      else plans.push({ kind: "singleModule", model: singleModuleModel(snapshot, modules[i], slide++) });
    }
  }
  plans.push({ kind: "opportunitySummary", model: opportunity(snapshot, slide++) });
  return plans;
}
