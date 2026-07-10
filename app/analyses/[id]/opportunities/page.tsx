export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { WorkflowProgress } from "@/components/analysis/workflow-progress";
import { OpportunityCard } from "@/components/opportunity/opportunity-card";
import { calculateAnalysis } from "@/lib/analyses/service";
import { getCategoriesForBusinessType, getModulesForCategory } from "@/lib/modules";
import { continueToAssessmentAction, toggleModuleAction } from "./actions";

export default async function OpportunitiesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const calculated = await calculateAnalysis({ analysisId: id });
  if (!calculated.ok) notFound();

  const businessType = calculated.value.analysis.businessType;
  const selectedByKey = new Map(calculated.value.calculatedModules.map((module) => [module.moduleKey, module.analysisModuleId]));
  const selectedCount = selectedByKey.size;
  return <main className="min-h-screen bg-[#f8f1e4] px-8 py-10"><div className="mx-auto max-w-6xl space-y-8"><WorkflowProgress activeStage="opportunities" analysisId={id} hasSelectedModules={calculated.value.workflowReadiness.hasSelectedModules} canReview={calculated.value.workflowReadiness.canReview} canGeneratePresentation={calculated.value.workflowReadiness.canGeneratePresentation} /><section className="rounded-3xl border border-[#e8dcc6] bg-[#fffaf0] p-10 shadow-sm"><h1 className="text-3xl font-bold text-[#0b1d33]">What opportunities were identified?</h1><p className="mt-3 text-lg text-[#627085]">Select the areas that best reflect your discovery conversations with the customer.</p><div className="mt-8 space-y-8">{getCategoriesForBusinessType(businessType).map((category) => <section key={category.key}><h2 className="text-sm font-bold uppercase tracking-[0.18em] text-[#16385f]">{category.name}</h2><div className="mt-4 grid gap-4 md:grid-cols-2">{getModulesForCategory(category.key).filter((module) => module.businessTypes.includes(businessType)).map((module) => <OpportunityCard key={module.key} module={module} selected={selectedByKey.has(module.key)} action={toggleModuleAction.bind(null, id, module.key, selectedByKey.get(module.key))} />)}</div></section>)}</div>{calculated.value.overlapNotices.length > 0 && <div className="mt-8 space-y-3">{calculated.value.overlapNotices.map((notice) => <div key={notice.key} className={`rounded-2xl border p-4 ${notice.type === "REVIEW" ? "border-[#d89b2b] bg-[#fff6df]" : "border-[#9bb3c8] bg-[#eef6fb]"}`}><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0b1d33]">{notice.type}</p><h3 className="mt-1 font-semibold text-[#0b1d33]">{notice.key.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}</h3><p className="mt-2 text-sm leading-6 text-[#35465c]">{notice.message}</p></div>)}</div>}<div className="mt-8 flex items-center justify-between"><p className="font-semibold text-[#0b1d33]">{selectedCount} {selectedCount === 1 ? "Opportunity" : "Opportunities"} Selected</p><form action={continueToAssessmentAction.bind(null, id)}><button disabled={selectedCount === 0} className="rounded-lg bg-[#d89b2b] px-5 py-3 font-semibold text-[#0b1d33] disabled:opacity-50">Continue to Assessment</button></form></div></section></div></main>;
}
