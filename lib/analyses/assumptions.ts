import { formatBenchmarkRange, formatInputDisplayValue } from "@/lib/analyses/ui";
import { getValueModule } from "@/lib/modules";
import type { BenchmarkSource, ValueModuleKey } from "@/lib/modules";

/** A single benchmarked assumption row: the entered value alongside its sourced typical range. */
export type AssumptionAppendixRow = {
  readonly inputKey: string;
  readonly label: string;
  readonly enteredValue: string;
  readonly typicalRange: string;
  readonly sourceLabel: string;
};

export type AssumptionAppendixModule = {
  readonly moduleKey: ValueModuleKey;
  readonly moduleName: string;
  readonly categoryName: string;
  readonly rows: readonly AssumptionAppendixRow[];
};

export type AssumptionsAppendix = {
  readonly modules: readonly AssumptionAppendixModule[];
  readonly sources: readonly BenchmarkSource[];
};

export type AssumptionsAppendixSource = {
  readonly moduleKey: ValueModuleKey;
  readonly moduleName: string;
  readonly categoryName: string;
  readonly inputs: Readonly<Record<string, unknown>>;
};

function numericValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/**
 * Builds the assumptions & sources appendix from selected modules. Only inputs that
 * carry a benchmark are included, so modules with no benchmarked inputs are omitted
 * and the appendix is empty when no benchmark data is present anywhere.
 */
export function buildAssumptionsAppendix(modules: readonly AssumptionsAppendixSource[]): AssumptionsAppendix {
  const appendixModules: AssumptionAppendixModule[] = [];
  const sourcesByLabel = new Map<string, BenchmarkSource>();
  for (const selected of modules) {
    const definition = getValueModule(selected.moduleKey);
    const rows: AssumptionAppendixRow[] = [];
    for (const input of [...definition.inputDefinitions].sort((a, b) => a.displayOrder - b.displayOrder)) {
      if (!input.benchmark) continue;
      const entered = numericValue(selected.inputs[input.key]);
      rows.push({
        inputKey: input.key,
        label: input.label,
        enteredValue: entered === undefined ? "—" : formatInputDisplayValue(input, entered),
        typicalRange: formatBenchmarkRange(input, input.benchmark),
        sourceLabel: input.benchmark.source.label,
      });
      if (!sourcesByLabel.has(input.benchmark.source.label)) sourcesByLabel.set(input.benchmark.source.label, input.benchmark.source);
    }
    if (rows.length > 0) appendixModules.push({ moduleKey: selected.moduleKey, moduleName: definition.name, categoryName: selected.categoryName, rows });
  }
  return { modules: appendixModules, sources: [...sourcesByLabel.values()] };
}
