import { cn } from "@/lib/utils";
import { workflowStages, type WorkflowStage } from "./workflow-stages";

export function WorkflowProgress({ activeStage }: { activeStage: WorkflowStage }) {
  return (
    <nav aria-label="Analysis workflow" className="rounded-2xl border border-[#e8dcc6] bg-[#fffaf0] p-4">
      <ol className="grid grid-cols-5 gap-3">
        {workflowStages.map((stage) => {
          const isActive = stage.id === activeStage;
          return (
            <li
              key={stage.id}
              aria-current={isActive ? "step" : undefined}
              className={cn(
                "rounded-xl px-4 py-3 text-center text-sm font-semibold text-[#627085]",
                isActive && "bg-[#0b1d33] text-[#fffaf0] shadow-sm",
              )}
            >
              {stage.label}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
