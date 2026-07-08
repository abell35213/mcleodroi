import { createHash } from "node:crypto";
import type { CalculatedAnalysisModule } from "@/lib/analyses/types";
import type { BusinessType } from "@/lib/modules";

export const NARRATIVE_REGISTRY_VERSION = "1.0.0";

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, stable(v)]),
    );
  }
  return value;
}

export function stableSerialize(value: unknown): string {
  return JSON.stringify(stable(value));
}

export function createNarrativeSourceFingerprint(args: {
  module: CalculatedAnalysisModule;
  businessType: BusinessType;
  narrativeRegistryVersion?: string;
}): string {
  const {
    module,
    businessType,
    narrativeRegistryVersion = NARRATIVE_REGISTRY_VERSION,
  } = args;
  const result = module.calculationOutcome?.success
    ? module.calculationOutcome.result
    : null;
  const source = {
    narrativeRegistryVersion,
    moduleKey: module.moduleKey,
    businessType,
    reconstructedInputs: module.reconstructedInputs,
    financialOutputs: result?.financialOutputs ?? null,
    derivedMetrics: result?.derivedMetrics ?? null,
  };
  return createHash("sha256").update(stableSerialize(source)).digest("hex");
}

export function normalizeNarrativeForComparison(narrative: string): string {
  return narrative.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
}
