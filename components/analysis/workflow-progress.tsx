import Link from "next/link";
import { cn } from "@/lib/utils";
import { workflowStages, type WorkflowStage } from "./workflow-stages";

type WorkflowProgressProps = {
  activeStage: WorkflowStage;
  analysisId?: string;
  canReview?: boolean;
  canGeneratePresentation?: boolean;
};

function hrefForStage(stage: WorkflowStage, analysisId?: string): string | null {
  if (stage === "company") return analysisId ? `/analyses/${analysisId}/company` : "/analyses/new";
  if (!analysisId) return null;
  if (stage === "opportunities") return `/analyses/${analysisId}/opportunities`;
  if (stage === "assessment") return `/analyses/${analysisId}/assessment`;
  if (stage === "review") return `/analyses/${analysisId}/review`;
  return `/analyses/${analysisId}/presentation`;
}

function isStageClickable(stage: WorkflowStage, props: WorkflowProgressProps): boolean {
  if (stage === props.activeStage) return false;
  if (stage === "company") return true;
  if (!props.analysisId) return false;
  if (stage === "opportunities") return true;
  if (stage === "assessment") return props.activeStage !== "company";
  if (stage === "review") return props.canReview === true;
  if (stage === "presentation") return props.canGeneratePresentation === true;
  return false;
}

export function WorkflowProgress(props: WorkflowProgressProps) {
  return (
    <nav aria-label="Analysis workflow" className="rounded-2xl border border-[#e8dcc6] bg-[#fffaf0] p-4">
      <ol className="grid grid-cols-5 gap-3">
        {workflowStages.map((stage) => {
          const isActive = stage.id === props.activeStage;
          const clickable = isStageClickable(stage.id, props);
          const className = cn(
            "block rounded-xl px-4 py-3 text-center text-sm font-semibold text-[#627085]",
            isActive && "bg-[#0b1d33] text-[#fffaf0] shadow-sm",
            clickable && "hover:bg-[#fff6df] hover:text-[#0b1d33]",
            !clickable && !isActive && "cursor-not-allowed opacity-60",
          );
          const content = clickable ? <Link className={className} href={hrefForStage(stage.id, props.analysisId)!}>{stage.label}</Link> : <span className={className} aria-disabled={!isActive}>{stage.label}</span>;
          return <li key={stage.id} aria-current={isActive ? "step" : undefined}>{content}</li>;
        })}
      </ol>
    </nav>
  );
}
