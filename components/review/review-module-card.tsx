"use client";

import { useState } from "react";

type Props = {
  analysisModuleId: string;
  moduleName: string;
  valueTypeLabel: string;
  financialLabel: string;
  financialValue: string;
  financialCadence: string;
  assumptionItems: readonly { label: string; value: string }[];
  narrative: string;
  narrativeMode: "TEMPLATE" | "CUSTOM";
  stale: boolean;
  needsProductReview: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  saveAction: (formData: FormData) => void;
  resetAction: () => void;
  moveUpAction: () => void;
  moveDownAction: () => void;
};

export function ReviewModuleCard(props: Props) {
  const [editing, setEditing] = useState(false);
  return <article className="rounded-3xl border border-[#e8dcc6] bg-[#fffaf0] p-7 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#28614a]">{props.valueTypeLabel}</p>
        <h3 className="mt-2 text-2xl font-bold text-[#0b1d33]">{props.moduleName}</h3>
      </div>
      <div className="flex flex-wrap gap-2 text-xs font-bold uppercase tracking-[0.12em]">
        {props.needsProductReview && <span className="rounded-full bg-[#fff6df] px-3 py-1 text-[#0b1d33]">Narrative Needs Product Review</span>}
        {props.stale ? <span className="rounded-full border border-[#d89b2b] bg-[#fff6df] px-3 py-1 text-[#0b1d33]">Custom Narrative May Need Review</span> : <span className="rounded-full bg-white px-3 py-1 text-[#28614a]">{props.narrativeMode === "CUSTOM" ? "Custom Narrative" : "Template Narrative"}</span>}
      </div>
    </div>
    {props.stale && <p className="mt-3 rounded-2xl border border-[#d89b2b] bg-[#fff6df] p-3 text-sm text-[#35465c]">Calculation inputs or the default narrative source have changed since this customer analysis was edited.</p>}
    <div className="mt-6 grid gap-6 md:grid-cols-[240px_1fr]">
      <div className="rounded-2xl bg-[#0b1d33] p-5 text-[#fffaf0]"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#d89b2b]">{props.financialLabel}</p><p className="mt-2 text-3xl font-bold">{props.financialValue} <span className="text-sm">{props.financialCadence}</span></p></div>
      <div><h4 className="font-bold text-[#0b1d33]">Assumption Path</h4><dl className="mt-3 grid gap-3 sm:grid-cols-2">{props.assumptionItems.map(item => <div key={item.label}><dt className="text-sm text-[#627085]">{item.label}</dt><dd className="font-semibold text-[#0b1d33]">{item.value}</dd></div>)}</dl></div>
    </div>
    <section className="mt-6 border-t border-[#e8dcc6] pt-5"><h4 className="text-lg font-bold text-[#0b1d33]">Customer Analysis</h4>{editing ? <form action={(fd) => { props.saveAction(fd); setEditing(false); }} className="mt-3 space-y-3"><label className="sr-only" htmlFor={`narrative-${props.analysisModuleId}`}>Customer analysis for {props.moduleName}</label><textarea id={`narrative-${props.analysisModuleId}`} name="narrative" defaultValue={props.narrative} rows={7} className="w-full rounded-2xl border border-[#d7c9ae] bg-white p-4 text-[#0b1d33] focus:outline-none focus:ring-4 focus:ring-[#d89b2b]/30" /><div className="flex gap-3"><button className="rounded-lg bg-[#d89b2b] px-4 py-2 font-semibold text-[#0b1d33]">Save Analysis</button><button type="button" onClick={() => setEditing(false)} className="rounded-lg border border-[#d7c9ae] px-4 py-2 font-semibold text-[#0b1d33]">Cancel</button></div></form> : <><p className="mt-3 whitespace-pre-wrap leading-7 text-[#35465c]">{props.narrative}</p><div className="mt-4 flex flex-wrap gap-3"><button onClick={() => setEditing(true)} className="rounded-lg border border-[#d89b2b] px-4 py-2 font-semibold text-[#0b1d33]">Edit Analysis</button>{props.narrativeMode === "CUSTOM" && <button onClick={props.resetAction} className="rounded-lg border border-[#d7c9ae] px-4 py-2 font-semibold text-[#0b1d33]">Reset to Updated Default</button>}</div></>}</section>
    <div className="mt-5 flex gap-3 border-t border-[#e8dcc6] pt-4"><button disabled={!props.canMoveUp} onClick={props.moveUpAction} aria-label={`Move ${props.moduleName} up`} className="rounded-lg border border-[#d7c9ae] px-3 py-2 disabled:opacity-40">Move Up</button><button disabled={!props.canMoveDown} onClick={props.moveDownAction} aria-label={`Move ${props.moduleName} down`} className="rounded-lg border border-[#d7c9ae] px-3 py-2 disabled:opacity-40">Move Down</button></div>
  </article>;
}