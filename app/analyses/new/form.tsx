"use client";

import { useActionState } from "react";
import { createAnalysisAction, type CreateAnalysisFormState } from "./actions";

const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);

export function CreateAnalysisForm() {
  const [state, action, pending] = useActionState<CreateAnalysisFormState, FormData>(createAnalysisAction, {});
  const err = (key: string) => state.errors?.[key] ? <p className="mt-1 text-sm text-red-700">{state.errors[key]}</p> : null;
  return <form action={action} className="mt-8 grid gap-6 rounded-2xl border border-[#e8dcc6] bg-white/60 p-6">
    {state.message && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.message}</p>}
    <label className="grid gap-2 text-sm font-semibold text-[#0b1d33]">Company Name<input name="companyName" className="rounded-lg border border-[#d7c9ae] px-3 py-2" required />{err("companyName")}</label>
    <label className="grid gap-2 text-sm font-semibold text-[#0b1d33]">Business Type<select name="businessType" className="rounded-lg border border-[#d7c9ae] px-3 py-2" required><option value="">Select...</option><option value="TRUCKLOAD">Truckload</option><option value="BROKERAGE">Brokerage</option></select>{err("businessType")}</label>
    <label className="grid gap-2 text-sm font-semibold text-[#0b1d33]">Customer Contact Name<input name="customerContact" className="rounded-lg border border-[#d7c9ae] px-3 py-2" /></label>
    <label className="grid gap-2 text-sm font-semibold text-[#0b1d33]">Prepared By<input name="preparedBy" className="rounded-lg border border-[#d7c9ae] px-3 py-2" required />{err("preparedBy")}</label>
    <label className="grid gap-2 text-sm font-semibold text-[#0b1d33]">Analysis Date<input name="analysisDate" type="date" defaultValue={today} className="rounded-lg border border-[#d7c9ae] px-3 py-2" required />{err("analysisDate")}</label>
    <button disabled={pending} className="rounded-lg bg-[#d89b2b] px-5 py-3 font-semibold text-[#0b1d33] disabled:opacity-60">Create Analysis</button>
  </form>;
}
