import { WorkflowProgress } from "@/components/analysis/workflow-progress";
import { CreateAnalysisForm } from "./form";

export default function NewAnalysisPage() {
  return <main className="min-h-screen bg-[#f8f1e4] px-8 py-10"><div className="mx-auto max-w-5xl space-y-8"><WorkflowProgress activeStage="company" /><section className="rounded-3xl border border-[#e8dcc6] bg-[#fffaf0] p-10 shadow-sm"><h1 className="text-3xl font-bold text-[#0b1d33]">Create Business Impact Analysis</h1><CreateAnalysisForm /></section></div></main>;
}
