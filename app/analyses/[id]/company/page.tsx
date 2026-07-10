export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { WorkflowProgress } from "@/components/analysis/workflow-progress";
import { calculateAnalysis } from "@/lib/analyses/service";
import { prisma } from "@/lib/db";
import { EditAnalysisDetailsForm } from "./form";

export default async function CompanyDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const calculated = await calculateAnalysis({ analysisId: id });
  if (!calculated.ok) notFound();
  const analysis = await prisma.analysis.findUnique({ where: { id } });
  if (!analysis) notFound();
  return <main className="min-h-screen bg-[#f8f1e4] px-8 py-10"><div className="mx-auto max-w-5xl space-y-8"><WorkflowProgress activeStage="company" analysisId={id} canReview={calculated.value.workflowReadiness.canReview} canGeneratePresentation={calculated.value.workflowReadiness.canGeneratePresentation} /><section className="rounded-3xl border border-[#e8dcc6] bg-[#fffaf0] p-10 shadow-sm"><h1 className="text-3xl font-bold text-[#0b1d33]">Company Details</h1><p className="mt-3 text-lg text-[#627085]">Update analysis details without changing selected opportunities, calculations, narratives, snapshots, or persistence methodology.</p><EditAnalysisDetailsForm analysis={{ id, companyName: analysis.companyName, customerContact: analysis.customerContact, businessType: analysis.businessType, preparedBy: analysis.preparedBy, analysisDate: analysis.analysisDate }} /></section></div></main>;
}
