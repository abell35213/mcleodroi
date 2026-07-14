"use client";

import { useActionState } from "react";
import type { CalculatedCustomOpportunity } from "@/lib/analyses/types";
import type { ValueModuleCategoryDefinition } from "@/lib/modules/types";
import { removeCustomOpportunityAction, saveCustomOpportunityAction, type CustomOpportunityActionState } from "./actions";

const initialState: CustomOpportunityActionState = { status: "IDLE" };

function value(state: CustomOpportunityActionState, field: keyof NonNullable<CustomOpportunityActionState["submittedValues"]>, fallback: string) {
  return String(state.submittedValues?.[field] ?? fallback ?? "");
}

export function CustomOpportunityForm({ analysisId, custom, categories, valueTypes }: { analysisId: string; custom: CalculatedCustomOpportunity; categories: ValueModuleCategoryDefinition[]; valueTypes: readonly string[] }) {
  const [state, formAction, pending] = useActionState(saveCustomOpportunityAction.bind(null, analysisId, custom.id), initialState);
  const rationaleError = state.fieldErrors?.calculationRationale?.[0];
  const assumptions = Array.from({ length: 8 }, (_, index) => state.submittedValues?.assumptions?.[index] ?? custom.assumptions[index] ?? { label: "", displayValue: "", unit: "", sourceNote: "" });
  return <form action={formAction} className="mt-8 space-y-5" noValidate>
    {state.status === "ERROR" && <div id="custom-opportunity-error-summary" role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-900">{state.message}</div>}
    <div className="grid gap-4 md:grid-cols-2">
      <label className="block text-sm font-semibold">Opportunity title<input name="title" defaultValue={value(state, "title", custom.title.startsWith("Untitled") ? "" : custom.title)} aria-invalid={!!state.fieldErrors?.title} className="mt-1 w-full rounded-lg border p-3" /></label>
      <label className="block text-sm font-semibold">Short presentation title<input name="shortTitle" defaultValue={value(state, "shortTitle", custom.shortTitle ?? "")} className="mt-1 w-full rounded-lg border p-3" /></label>
      <label className="block text-sm font-semibold">Category<select name="categoryKey" defaultValue={value(state, "categoryKey", custom.categoryKey)} aria-invalid={!!state.fieldErrors?.categoryKey} className="mt-1 w-full rounded-lg border p-3">{categories.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}</select></label>
      <label className="block text-sm font-semibold">Value classification<select name="valueClassification" defaultValue={value(state, "valueClassification", custom.valueClassification)} aria-invalid={!!state.fieldErrors?.valueClassification} className="mt-1 w-full rounded-lg border p-3">{valueTypes.map((v) => <option key={v} value={v}>{v.replaceAll("_", " ")}</option>)}</select></label>
      <label className="block text-sm font-semibold">Value frequency<select name="valueFrequency" defaultValue={value(state, "valueFrequency", custom.valueFrequency)} aria-invalid={!!state.fieldErrors?.valueFrequency} className="mt-1 w-full rounded-lg border p-3"><option value="MONTHLY_RECURRING">MONTHLY_RECURRING</option><option value="ANNUAL_ONLY">ANNUAL_ONLY</option><option value="INFORMATIONAL_CAPITAL">INFORMATIONAL_CAPITAL</option></select></label>
      <label className="block text-sm font-semibold">Financial value<input name="enteredValue" defaultValue={value(state, "enteredValue", String(custom.enteredValue || ""))} aria-invalid={!!state.fieldErrors?.enteredValue} className="mt-1 w-full rounded-lg border p-3" /></label>
    </div>
    <section><h2 className="font-bold">Assumptions</h2>{assumptions.map((a, index) => <div key={index} className="mt-2 grid gap-2 md:grid-cols-4"><input name={`assumptionLabel${index}`} defaultValue={a.label} placeholder="Assumption" className="rounded-lg border p-2" /><input name={`assumptionValue${index}`} defaultValue={a.displayValue} placeholder="Value" className="rounded-lg border p-2" /><input name={`assumptionUnit${index}`} defaultValue={a.unit ?? ""} placeholder="Unit" className="rounded-lg border p-2" /><input name={`assumptionSource${index}`} defaultValue={a.sourceNote ?? ""} placeholder="Source/note" className="rounded-lg border p-2" /></div>)}</section>
    <label className="block text-sm font-semibold">Calculation rationale<textarea id="calculationRationale" name="calculationRationale" defaultValue={value(state, "calculationRationale", custom.calculationRationale.startsWith("Draft") ? "" : custom.calculationRationale)} rows={4} aria-invalid={!!rationaleError} aria-describedby={rationaleError ? "calculationRationale-error" : "calculationRationale-help"} className="mt-1 w-full rounded-lg border p-3" />{rationaleError ? <span id="calculationRationale-error" className="mt-1 block text-sm font-semibold text-red-700">{rationaleError}</span> : <span id="calculationRationale-help" className="text-xs text-[#627085]">Explain how the entered financial value was derived from the assumptions above.</span>}</label>
    <div className="grid gap-4 md:grid-cols-2"><label className="block text-sm font-semibold">How McLeod Helps<textarea name="howMcLeodHelps" defaultValue={value(state, "howMcLeodHelps", custom.howMcLeodHelps ?? "")} rows={4} className="mt-1 w-full rounded-lg border p-3" /></label><label className="block text-sm font-semibold">Customer Analysis / Business Impact<textarea name="customerBusinessImpact" defaultValue={value(state, "customerBusinessImpact", custom.customerBusinessImpact ?? "")} rows={4} className="mt-1 w-full rounded-lg border p-3" /></label></div>
    <input type="hidden" name="presentationCallout" value={value(state, "presentationCallout", custom.presentationCallout ?? "")} /><input type="hidden" name="methodologyNote" value={value(state, "methodologyNote", custom.methodologyNote ?? "")} /><input type="hidden" name="sourceNote" value={value(state, "sourceNote", custom.sourceNote ?? "")} />
    <p className="rounded-2xl bg-white/70 p-4 text-sm text-[#627085]">Narrative text is optional and may be added before or after presentation generation. Narrative status: {custom.narrativeStatus}</p>
    <div className="flex justify-between border-t pt-6"><button formAction={removeCustomOpportunityAction.bind(null, analysisId, custom.id)} className="text-sm font-semibold underline">Remove Custom Opportunity</button><button disabled={pending} className="rounded-lg bg-[#d89b2b] px-5 py-3 font-semibold text-[#0b1d33]">Save Custom Opportunity</button></div>
  </form>;
}
