"use client";

import { useActionState } from "react";
import type { BusinessType } from "@/lib/modules";
import { updateAnalysisDetailsAction, type UpdateAnalysisDetailsState } from "../company-actions";

type Props = { analysis: { id: string; companyName: string; customerContact: string | null; businessType: BusinessType; preparedBy: string; analysisDate: Date } };

function dateValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function EditAnalysisDetailsForm({ analysis }: Props) {
  const [state, action, pending] = useActionState<UpdateAnalysisDetailsState, FormData>(updateAnalysisDetailsAction.bind(null, analysis.id), {});
  return <form action={action} className="mt-8 grid gap-5"><label className="grid gap-2 font-semibold text-[#0b1d33]">Company Name<input name="companyName" defaultValue={analysis.companyName} className="rounded-lg border border-[#d7c9ae] px-3 py-2" /></label>{state.errors?.companyName && <p className="text-sm text-red-700">{state.errors.companyName}</p>}<label className="grid gap-2 font-semibold text-[#0b1d33]">Customer Contact<input name="customerContact" defaultValue={analysis.customerContact ?? ""} className="rounded-lg border border-[#d7c9ae] px-3 py-2" /></label><label className="grid gap-2 font-semibold text-[#0b1d33]">Business Type<select name="businessType" defaultValue={analysis.businessType} className="rounded-lg border border-[#d7c9ae] px-3 py-2"><option value="TRUCKLOAD">Truckload</option><option value="BROKERAGE">Brokerage</option></select></label>{state.errors?.businessType && <p className="text-sm text-red-700">{state.errors.businessType}</p>}<label className="grid gap-2 font-semibold text-[#0b1d33]">Prepared By<input name="preparedBy" defaultValue={analysis.preparedBy} className="rounded-lg border border-[#d7c9ae] px-3 py-2" /></label>{state.errors?.preparedBy && <p className="text-sm text-red-700">{state.errors.preparedBy}</p>}<label className="grid gap-2 font-semibold text-[#0b1d33]">Analysis Date<input type="date" name="analysisDate" defaultValue={dateValue(analysis.analysisDate)} className="rounded-lg border border-[#d7c9ae] px-3 py-2" /></label>{state.errors?.analysisDate && <p className="text-sm text-red-700">{state.errors.analysisDate}</p>}{state.message && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{state.message}</p>}<button disabled={pending} className="w-fit rounded-lg bg-[#d89b2b] px-5 py-3 font-bold text-[#0b1d33] disabled:opacity-50">Save Company Details</button></form>;
}
