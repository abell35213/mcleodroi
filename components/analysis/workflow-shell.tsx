import type { ReactNode } from "react";
import { WorkflowProgress } from "./workflow-progress";
import type { WorkflowStage } from "./workflow-stages";

export function WorkflowShell({ activeStage, title, description }: { activeStage: WorkflowStage; title: string; description: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f8f1e4] px-8 py-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <WorkflowProgress activeStage={activeStage} />
        <section className="rounded-3xl border border-[#e8dcc6] bg-[#fffaf0] p-10 shadow-sm">
          <h1 className="text-3xl font-bold text-[#0b1d33]">{title}</h1>
          <p className="mt-3 text-lg text-[#627085]">{description}</p>
        </section>
      </div>
    </main>
  );
}
