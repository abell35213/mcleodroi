"use client";

const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000)
  .toISOString()
  .slice(0, 10);

export function CreateAnalysisForm() {
  return <form action="/analyses/new/create" method="post" className="mt-8 grid gap-6 rounded-2xl border border-[#e8dcc6] bg-white/60 p-6">
    <label className="grid gap-2 text-sm font-semibold text-[#0b1d33]">Company Name<input name="companyName" className="rounded-lg border border-[#d7c9ae] px-3 py-2" required /></label>
    <label className="grid gap-2 text-sm font-semibold text-[#0b1d33]">Business Type<select name="businessType" className="rounded-lg border border-[#d7c9ae] px-3 py-2" required><option value="">Select...</option><option value="TRUCKLOAD">Truckload</option><option value="BROKERAGE">Brokerage</option></select></label>
    <label className="grid gap-2 text-sm font-semibold text-[#0b1d33]">Customer Contact Name<input name="customerContact" className="rounded-lg border border-[#d7c9ae] px-3 py-2" /></label>
    <label className="grid gap-2 text-sm font-semibold text-[#0b1d33]">Prepared By<input name="preparedBy" className="rounded-lg border border-[#d7c9ae] px-3 py-2" required /></label>
    <label className="grid gap-2 text-sm font-semibold text-[#0b1d33]">Analysis Date<input name="analysisDate" type="date" defaultValue={today} className="rounded-lg border border-[#d7c9ae] px-3 py-2" required /></label>
    <button className="rounded-lg bg-[#d89b2b] px-5 py-3 font-semibold text-[#0b1d33]">Create Analysis</button>
  </form>;
}
