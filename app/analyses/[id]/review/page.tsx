export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { WorkflowProgress } from "@/components/analysis/workflow-progress";
import { calculateAnalysis } from "@/lib/analyses/service";

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const calculated = await calculateAnalysis({ analysisId: id });
  if (!calculated.ok) notFound();
  if (!calculated.value.workflowReadiness.canReview) {
    const firstIncomplete = calculated.value.calculatedModules.find((module) => module.status !== "COMPLETE");
    redirect(firstIncomplete ? `/analyses/${id}/assessment?module=${firstIncomplete.moduleKey}` : `/analyses/${id}/opportunities`);
  }
  return <main className="min-h-screen bg-[#f8f1e4] px-8 py-10"><div className="mx-auto max-w-5xl space-y-8"><WorkflowProgress activeStage="review" /><section className="rounded-3xl border border-[#e8dcc6] bg-[#fffaf0] p-10 shadow-sm"><h1 className="text-3xl font-bold text-[#0b1d33]">Review Value Story</h1><p className="mt-3 text-lg text-[#627085]">All selected opportunities are complete.</p></section></div></main>;
}
