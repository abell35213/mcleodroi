import type { OverlapNotice } from "@/lib/modules";
import { getValueModule } from "@/lib/modules";

/**
 * Explicit overlap clarity panel for Review.
 *
 * Methodology decision (default): overlap notices are **warn-only**. Overlapping
 * modules are surfaced so the seller can reconcile shared assumptions, but the
 * engine never automatically discounts double-counted value. This preserves the
 * existing calculation behavior; switching to automatic discounting would be a
 * deliberate methodology change.
 */
export function OverlapNotices({ notices }: { notices: readonly OverlapNotice[] }) {
  const reviewNotices = notices.filter((notice) => notice.type === "REVIEW");
  const infoNotices = notices.filter((notice) => notice.type === "INFORMATION");

  return (
    <section className="rounded-3xl border border-[#e8dcc6] bg-[#fffaf0] p-8">
      <h2 className="text-2xl font-bold text-[#0b1d33]">Assumption Overlap Review</h2>
      {notices.length === 0 ? (
        <p className="mt-3 text-[#627085]">No potential value overlaps identified.</p>
      ) : (
        <>
          <p className="mt-2 text-sm text-[#627085]">
            Overlaps are flagged for your review only — values are not automatically discounted.
            Confirm that shared assumptions are not counted more than once.
          </p>
          {reviewNotices.length > 0 ? (
            <div className="mt-5 space-y-3">
              {reviewNotices.map((notice) => (
                <OverlapCard key={notice.key} notice={notice} tone="warning" />
              ))}
            </div>
          ) : null}
          {infoNotices.length > 0 ? (
            <div className="mt-5 space-y-3">
              {infoNotices.map((notice) => (
                <OverlapCard key={notice.key} notice={notice} tone="info" />
              ))}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

function OverlapCard({
  notice,
  tone,
}: {
  notice: OverlapNotice;
  tone: "warning" | "info";
}) {
  const isWarning = tone === "warning";
  const containerClass = isWarning
    ? "rounded-2xl border border-[#d89b2b] bg-[#fff6df] p-4"
    : "rounded-2xl border border-[#c7d4cb] bg-[#f2f7f3] p-4";
  const badgeClass = isWarning
    ? "bg-[#d89b2b] text-[#0b1d33]"
    : "bg-[#28614a] text-[#fffaf0]";
  const label = isWarning ? "Review Overlap" : "Informational";
  const moduleNames = notice.selectedModuleKeys.map((moduleKey) => getValueModule(moduleKey).name);

  return (
    <div className={containerClass}>
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${badgeClass}`}
        >
          {label}
        </span>
        <p className="text-sm font-bold text-[#0b1d33]">{moduleNames.join(" + ")}</p>
      </div>
      <p className="mt-2 text-[#35465c]">{notice.message}</p>
    </div>
  );
}
