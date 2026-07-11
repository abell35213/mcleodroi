import type { AssumptionsAppendix } from "@/lib/analyses/assumptions";

export function AssumptionsAppendix({ appendix }: { appendix: AssumptionsAppendix }) {
  if (appendix.modules.length === 0) return null;
  return <section className="rounded-3xl border border-[#e8dcc6] bg-[#fffaf0] p-8">
    <h2 className="text-2xl font-bold text-[#0b1d33]">Assumptions &amp; Sources</h2>
    <p className="mt-2 max-w-3xl text-[#627085]">Key entered assumptions shown against sourced industry-typical ranges to support buyer confidence.</p>
    <div className="mt-6 space-y-6">{appendix.modules.map((module) => <div key={module.moduleKey}>
      <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-[#28614a]">{module.categoryName}</h3>
      <p className="text-lg font-bold text-[#0b1d33]">{module.moduleName}</p>
      <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm text-[#35465c]"><thead><tr className="border-b border-[#e8dcc6] text-xs uppercase tracking-[0.1em] text-[#627085]"><th scope="col" className="py-2 pr-4 font-semibold">Assumption</th><th scope="col" className="py-2 pr-4 font-semibold">Entered</th><th scope="col" className="py-2 pr-4 font-semibold">Industry Typical</th><th scope="col" className="py-2 font-semibold">Source</th></tr></thead>
        <tbody>{module.rows.map((row) => <tr key={row.inputKey} className="border-b border-[#f0e7d5]"><td className="py-2 pr-4">{row.label}</td><td className="py-2 pr-4 font-semibold text-[#0b1d33]">{row.enteredValue}</td><td className="py-2 pr-4">{row.typicalRange}</td><td className="py-2">{row.sourceLabel}</td></tr>)}</tbody></table></div>
    </div>)}</div>
    <div className="mt-6 border-t border-[#e8dcc6] pt-4"><h3 className="text-xs font-bold uppercase tracking-[0.16em] text-[#627085]">Sources</h3><ul className="mt-2 space-y-1 text-xs text-[#627085]">{appendix.sources.map((source) => <li key={source.label}><span className="font-semibold text-[#35465c]">{source.label}:</span> {source.citation}</li>)}</ul></div>
  </section>;
}
