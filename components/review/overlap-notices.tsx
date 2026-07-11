import type { OverlapReviewState } from "@/lib/analyses/overlap-dispositions";
import { getValueModule } from "@/lib/modules";

const dispositionCopy = {
  ASSUMPTIONS_MUTUALLY_EXCLUSIVE: "The assumptions represent distinct economic effects.",
  VALUES_ADJUSTED_TO_REMOVE_OVERLAP: "The module inputs were adjusted so the same value is not counted twice.",
  NEEDS_REVISION: "The analysis requires further revision before presentation generation.",
} as const;

export function OverlapNotices({ states, saveAction }: { states: readonly OverlapReviewState[]; saveAction: (formData: FormData) => void }) {
  const reviewStates = states.filter((state) => state.notice.type === "REVIEW");
  const infoStates = states.filter((state) => state.notice.type === "INFORMATION");
  return (
    <section className="rounded-3xl border border-[#e8dcc6] bg-[#fffaf0] p-8">
      <h2 className="text-2xl font-bold text-[#0b1d33]">Potential Overlap Review</h2>
      <p className="mt-2 text-sm text-[#627085]">Review these related opportunities to ensure the same operational or labor benefit is not counted more than once. Values are not automatically discounted; overlap acknowledgment does not authorize double counting.</p>
      {states.length === 0 ? <p className="mt-3 text-[#627085]">No potential value overlaps identified.</p> : null}
      <div className="mt-5 space-y-4">
        {reviewStates.map((state) => <ReviewCard key={state.notice.key} state={state} saveAction={saveAction} />)}
        {infoStates.map((state) => <InfoCard key={state.notice.key} state={state} />)}
      </div>
    </section>
  );
}

function statusText(status: OverlapReviewState["status"]): string {
  if (status === "REVIEWED") return "Reviewed";
  if (status === "STALE") return "Review Required Again";
  if (status === "NEEDS_REVISION") return "Needs Revision";
  if (status === "INVALID_EXCLUSION") return "Review Required Again";
  return "Not Reviewed";
}

function modules(state: OverlapReviewState): string {
  return state.notice.selectedModuleKeys.map((moduleKey) => getValueModule(moduleKey).name).join(" + ");
}

function ReviewCard({ state, saveAction }: { state: OverlapReviewState; saveAction: (formData: FormData) => void }) {
  return <div className="rounded-2xl border border-[#d89b2b] bg-[#fff6df] p-5">
    <div className="flex flex-wrap items-center gap-3"><span className="rounded-full bg-[#d89b2b] px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[#0b1d33]">Review Overlap</span><p className="font-bold text-[#0b1d33]">{state.notice.key.replaceAll("_", " ")}</p><span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#35465c]">{statusText(state.status)}</span></div>
    <p className="mt-2 text-sm font-semibold text-[#0b1d33]">Modules: {modules(state)}</p><p className="mt-2 text-[#35465c]">{state.notice.message}</p>
    <form action={saveAction} className="mt-4 grid gap-3"><input type="hidden" name="overlapGroupKey" value={state.notice.key} />
      {Object.entries(dispositionCopy).map(([value, label]) => <label key={value} className="flex gap-2 text-sm text-[#35465c]"><input required type="radio" name="disposition" value={value} defaultChecked={state.disposition?.disposition === value} /><span>{label}</span></label>)}
      <p className="text-xs text-[#627085]">Exclude from totals is intentionally not selectable in this release; remove a related module if values should be excluded from customer-facing totals.</p>
      <textarea name="acknowledgmentText" defaultValue={state.disposition?.acknowledgmentText ?? ""} placeholder="Optional seller note" className="min-h-20 rounded-lg border border-[#e8dcc6] bg-white p-3 text-sm text-[#0b1d33]" />
      <button className="w-fit rounded-lg bg-[#0b1d33] px-4 py-2 text-sm font-bold text-[#fffaf0]" type="submit">Save overlap review</button>
    </form>
  </div>;
}

function InfoCard({ state }: { state: OverlapReviewState }) {
  return <div className="rounded-2xl border border-[#c7d4cb] bg-[#f2f7f3] p-5"><span className="rounded-full bg-[#28614a] px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[#fffaf0]">Informational</span><p className="mt-2 text-sm font-semibold text-[#0b1d33]">Modules: {modules(state)}</p><p className="mt-2 text-[#35465c]">{state.notice.message}</p></div>;
}
