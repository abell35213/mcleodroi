"use client";

import { useMemo, useState } from "react";
import type { CalculatedAnalysisModule } from "@/lib/analyses/types";
import { formatBenchmarkRange, resolveDisplayValue, toDisplayInputValue, validateDisplayInput } from "@/lib/analyses/ui";
import { getValueModule } from "@/lib/modules";
import type { InputBenchmark, ValueModuleInputDefinition } from "@/lib/modules";

const PERCENT_SLIDER_MAX = 100;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function finiteDisplayValue(value: string | undefined): string {
  return value ?? "";
}

function normalizedPercentValue(value: string | undefined): number {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? clamp(parsedValue, 0, PERCENT_SLIDER_MAX) : 0;
}

function initialValues(module: CalculatedAnalysisModule): Record<string, string> {
  const definition = getValueModule(module.moduleKey);
  const persisted = new Map(module.inputs.map((input) => [input.inputKey, input.numericValue]));
  const values: Record<string, string> = {};
  for (const input of definition.inputDefinitions) {
    const resolved = resolveDisplayValue(input, persisted.get(input.key));
    values[input.key] = resolved.value === undefined ? "" : String(resolved.value);
  }
  return values;
}

/** Accessible info tooltip surfacing the full benchmark citation on hover/focus. */
function BenchmarkTooltip({ id, input, benchmark }: { id: string; input: ValueModuleInputDefinition; benchmark: InputBenchmark }) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-describedby={id}
        aria-label={`Benchmark source for ${input.label}`}
        className="flex h-5 w-5 items-center justify-center rounded-full border border-[#28614a] text-[0.7rem] font-bold text-[#28614a] hover:bg-[#28614a] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#d89b2b]"
      >
        i
      </button>
      <span
        id={id}
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 w-64 -translate-x-1/2 rounded-lg border border-[#e8dcc6] bg-[#0b1d33] px-3 py-2 text-xs font-normal leading-5 text-[#fffaf0] opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        <span className="block font-semibold text-[#d89b2b]">Planning reference: {formatBenchmarkRange(input, benchmark)}</span>
        {benchmark.source.citation}
      </span>
    </span>
  );
}

/** Shaded benchmark band positioned under a percentage slider (display units). */
function BenchmarkBand({ input, benchmark }: { input: ValueModuleInputDefinition; benchmark: InputBenchmark }) {
  const min = Math.max(0, Math.min(PERCENT_SLIDER_MAX, toDisplayInputValue(input, benchmark.typicalMin)));
  const max = Math.max(0, Math.min(PERCENT_SLIDER_MAX, toDisplayInputValue(input, benchmark.typicalMax)));
  const left = (min / PERCENT_SLIDER_MAX) * 100;
  const width = Math.max(0, ((max - min) / PERCENT_SLIDER_MAX) * 100);
  return (
    <div className="relative mt-1 h-1.5 w-full rounded-full bg-[#efe6d3]" aria-hidden="true">
      <div className="absolute h-full rounded-full bg-[#cfe2d5]" style={{ left: `${left}%`, width: `${width}%` }} />
    </div>
  );
}

export function AssessmentForm({ module, action }: { module: CalculatedAnalysisModule; action: (formData: FormData) => Promise<void> }) {
  const definition = getValueModule(module.moduleKey);
  const inputs = useMemo(() => [...definition.inputDefinitions].sort((a, b) => a.displayOrder - b.displayOrder), [definition]);
  const persisted = useMemo(() => new Map(module.inputs.map((input) => [input.inputKey, input.numericValue])), [module.inputs]);
  const [values, setValues] = useState<Record<string, string>>(() => initialValues(module));

  const validations = useMemo(
    () => Object.fromEntries(inputs.map((input) => [input.key, validateDisplayInput(input, finiteDisplayValue(values[input.key]))])),
    [inputs, values],
  );
  const hasClientErrors = inputs.some((input) => validations[input.key]?.state === "error");

  function setValue(key: string, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        {inputs.map((input) => {
          const resolved = resolveDisplayValue(input, persisted.get(input.key));
          const validation = validations[input.key];
          const serverIssue = module.validationIssues.find((candidate) => candidate.field === input.key);
          const errorMessage = validation.state === "error" ? validation.message : serverIssue?.message;
          const showError = Boolean(errorMessage);
          const showValid = validation.state === "valid" && !serverIssue;
          const borderClass = showError ? "border-red-500" : showValid ? "border-[#28614a]" : "border-[#d7c9ae]";
          const helpId = `${input.key}-help`;
          const benchmarkId = input.benchmark ? `${input.key}-benchmark` : "";
          const errorId = showError ? `${input.key}-error` : "";
          const describedBy = [helpId, benchmarkId, errorId].filter(Boolean).join(" ");
          const isSlider = input.type === "PERCENTAGE";
          return (
            <div key={input.key} className="grid gap-2 text-sm font-semibold text-[#0b1d33]">
              <div className="flex items-center gap-2">
                <label htmlFor={input.key}>{input.label}</label>
                {input.benchmark && <BenchmarkTooltip id={`${input.key}-tip`} input={input} benchmark={input.benchmark} />}
                {showValid && <span aria-hidden="true" className="text-[#28614a]">✓</span>}
                {showError && <span aria-hidden="true" className="text-red-600">!</span>}
              </div>

              {isSlider ? (
                <div className="grid gap-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={PERCENT_SLIDER_MAX}
                      step={0.1}
                      value={normalizedPercentValue(values[input.key])}
                      onChange={(event) => setValue(input.key, event.target.value)}
                      aria-label={`${input.label} slider`}
                      className="h-2 flex-1 cursor-pointer accent-[#d89b2b]"
                    />
                    <div className={`flex w-24 items-center rounded-lg border bg-white ${borderClass} focus-within:ring-2 focus-within:ring-[#d89b2b]`}>
                      <input
                        id={input.key}
                        name={input.key}
                        type="text"
                        inputMode="decimal"
                        value={finiteDisplayValue(values[input.key])}
                        onChange={(event) => setValue(input.key, event.target.value)}
                        aria-describedby={describedBy}
                        aria-invalid={showError}
                        className="w-full min-w-0 rounded-lg px-2 py-2 text-right outline-none"
                      />
                      <span className="px-2 text-[#627085]">%</span>
                    </div>
                  </div>
                  {input.benchmark && <BenchmarkBand input={input} benchmark={input.benchmark} />}
                </div>
              ) : (
                <div className={`flex rounded-lg border bg-white ${borderClass} focus-within:ring-2 focus-within:ring-[#d89b2b]`}>
                  {input.type === "CURRENCY" && <span className="px-3 py-2 text-[#627085]">$</span>}
                  <input
                    id={input.key}
                    name={input.key}
                    type="text"
                    inputMode={input.type === "INTEGER" ? "numeric" : "decimal"}
                    value={finiteDisplayValue(values[input.key])}
                    onChange={(event) => setValue(input.key, event.target.value)}
                    aria-describedby={describedBy}
                    aria-invalid={showError}
                    className="min-w-0 flex-1 rounded-lg px-3 py-2 outline-none"
                  />
                </div>
              )}

              <span id={helpId} className="text-xs font-normal leading-5 text-[#627085]">
                {input.helpText}
                {resolved.isDefault ? " Methodology default." : ""}
              </span>
              {input.benchmark && (
                <span id={benchmarkId} className="text-xs font-normal leading-5 text-[#28614a]">
                  Planning reference: {formatBenchmarkRange(input, input.benchmark)} · Source: {input.benchmark.source.label}
                </span>
              )}
              {showError && (
                <span id={errorId} role="alert" className="text-sm font-normal text-red-700">
                  {errorMessage}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {hasClientErrors && (
        <p role="alert" className="text-sm font-semibold text-red-700">
          Resolve the highlighted fields before saving.
        </p>
      )}
      <button
        type="submit"
        disabled={hasClientErrors}
        className="rounded-lg bg-[#d89b2b] px-5 py-3 font-semibold text-[#0b1d33] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Save &amp; Calculate
      </button>
    </form>
  );
}
