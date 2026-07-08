export const dynamic = "force-dynamic";

import Link from "next/link";
import { ButtonLink } from "@/components/ui/button-link";
import { prisma } from "@/lib/db";
import { calculateAnalysis } from "@/lib/analyses/service";
import { getPreferredResumeRoute } from "@/lib/analyses/ui";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default async function HomePage() {
  const analyses = await prisma.analysis.findMany({ orderBy: { updatedAt: "desc" } });
  const rows = await Promise.all(analyses.map(async (analysis) => {
    const calculated = await calculateAnalysis({ analysisId: analysis.id });
    return { analysis, calculated: calculated.ok ? calculated.value : null };
  }));
  return <main className="min-h-screen bg-[#f8f1e4] px-8 py-10"><section className="mx-auto max-w-6xl rounded-3xl border border-[#e8dcc6] bg-[#fffaf0] p-10 shadow-sm"><div className="flex items-start justify-between gap-8"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#d89b2b]">McLeod ROI Builder</p><h1 className="mt-4 text-4xl font-bold tracking-tight text-[#0b1d33]">Business Impact Analyses</h1><p className="mt-3 max-w-2xl text-lg text-[#627085]">Build and present a customer-specific financial value story.</p></div><ButtonLink href="/analyses/new">+ New Analysis</ButtonLink></div>{rows.length === 0 ? <div className="mt-12 rounded-2xl border border-dashed border-[#d7c9ae] bg-white/55 p-12 text-center"><h2 className="text-xl font-semibold text-[#16385f]">No analyses yet.</h2><p className="mx-auto mt-3 max-w-xl text-[#627085]">Create your first business impact analysis to begin identifying customer value opportunities.</p></div> : <div className="mt-10 overflow-hidden rounded-2xl border border-[#e8dcc6]"><table className="w-full bg-white/70 text-left text-sm"><thead className="bg-[#0b1d33] text-[#fffaf0]"><tr><th className="p-4">Company</th><th>Business Type</th><th>Identified Opportunity</th><th>Status</th><th>Updated</th></tr></thead><tbody>{rows.map(({analysis, calculated}) => { const total = calculated?.summary.totalIdentifiedAnnualEconomicOpportunity ?? 0; const href = calculated ? getPreferredResumeRoute(analysis.id, calculated) : `/analyses/${analysis.id}/opportunities`; return <tr key={analysis.id} className="border-t border-[#e8dcc6]"><td className="p-4 font-semibold text-[#0b1d33]"><Link className="underline-offset-4 hover:underline" href={href}>{analysis.companyName}</Link></td><td>{analysis.businessType}</td><td>{total > 0 ? `${money.format(total)}/year` : "—"}</td><td>{analysis.status}</td><td>{analysis.updatedAt.toLocaleDateString()}</td></tr>; })}</tbody></table></div>}</section></main>;
}
