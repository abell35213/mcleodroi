import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { WorkflowProgress } from "@/components/analysis/workflow-progress";
import { calculateAnalysis } from "@/lib/analyses/service";

type PageProps = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> };

export default async function PresentationPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { error } = await searchParams;
  const calculated = await calculateAnalysis({ analysisId: id });
  if (!calculated.ok) notFound();
  if (!calculated.value.workflowReadiness.canReview) {
    const incomplete = calculated.value.calculatedModules.find((module) => module.status !== "COMPLETE");
    redirect(`/analyses/${id}/assessment${incomplete ? `?module=${incomplete.moduleKey}` : ""}`);
  }
  if (!calculated.value.workflowReadiness.canGeneratePresentation) redirect(`/analyses/${id}/review`);
  return <main className="min-h-screen bg-[#f8f1e4] px-8 py-10"><div className="mx-auto max-w-5xl space-y-8"><WorkflowProgress activeStage="presentation" analysisId={id} canReview={calculated.value.workflowReadiness.canReview} canGeneratePresentation={calculated.value.workflowReadiness.canGeneratePresentation} /><section className="rounded-3xl border border-[#e8dcc6] bg-[#fffaf0] p-10 shadow-sm"><h1 className="text-4xl font-bold text-[#0b1d33]">Generate Presentation</h1><p className="mt-3 text-lg text-[#627085]">Your reviewed value story is ready to be converted into an editable McLeod-branded PowerPoint presentation.</p><form action={`/analyses/${id}/presentation/generate`} method="post"><button className="mt-8 rounded-lg bg-[#d89b2b] px-5 py-3 font-bold text-[#0b1d33] shadow-sm hover:bg-[#c98c21]" type="submit">Generate PowerPoint</button></form>{error ? <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}<p className="mt-3 text-sm text-[#627085]">Generation uses the immutable reviewed snapshot and downloads an editable .pptx file.</p><Link className="mt-6 inline-block text-sm font-semibold text-[#0b1d33] underline" href={`/analyses/${id}/review`}>Return to Review</Link></section></div></main>;
}
