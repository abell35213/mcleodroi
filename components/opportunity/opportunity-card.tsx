import type { ValueModuleDefinition } from "@/lib/modules";

export function OpportunityCard({ module, selected, action }: { module: ValueModuleDefinition; selected: boolean; action: () => Promise<void> }) {
  return <form action={action}><button className={`w-full rounded-2xl border p-5 text-left transition focus:outline-none focus:ring-2 focus:ring-[#d89b2b] ${selected ? "border-[#d89b2b] bg-[#fff6df]" : "border-[#e8dcc6] bg-white/70 hover:border-[#9bb3c8]"}`} aria-pressed={selected}><div className="flex items-start justify-between gap-4"><div><h3 className="font-semibold text-[#0b1d33]">{module.name}</h3><p className="mt-2 text-sm leading-6 text-[#627085]">{module.description}</p><p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#28614a]">{module.valueType.replaceAll("_", " ").toLowerCase()}</p></div><span className="rounded-full border border-[#d89b2b] px-2 py-1 text-sm text-[#0b1d33]">{selected ? "✓ Selected" : "Select"}</span></div></button></form>;
}
