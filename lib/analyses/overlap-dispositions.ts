import { createHash } from "node:crypto";
import type { OverlapDisposition as PrismaOverlapDisposition } from "@prisma/client";
import { stableSerialize } from "@/lib/narratives/fingerprint";
import { CUSTOM_OPPORTUNITY_OVERLAP_GROUP_KEY } from "@/lib/custom-opportunities";
import { getValueModule, overlapGroups, type OverlapGroupKey, type OverlapNotice, type ValueModuleKey } from "@/lib/modules";
import type { CalculatedAnalysisModule } from "./types";

export const OVERLAP_REGISTRY_VERSION = "1.0.0";

export const completedOverlapDispositions = [
  "ASSUMPTIONS_MUTUALLY_EXCLUSIVE",
  "VALUES_ADJUSTED_TO_REMOVE_OVERLAP",
] as const satisfies readonly PrismaOverlapDisposition[];

export type CompletedOverlapDisposition = (typeof completedOverlapDispositions)[number];

export type OverlapDispositionRecord = {
  readonly id: string;
  readonly analysisId: string;
  readonly overlapGroupKey: OverlapGroupKey | typeof CUSTOM_OPPORTUNITY_OVERLAP_GROUP_KEY;
  readonly disposition: PrismaOverlapDisposition;
  readonly acknowledgmentText: string | null;
  readonly sourceFingerprint: string;
  readonly excludedModuleKeys: readonly ValueModuleKey[];
  readonly reviewedAt: Date;
};

export type OverlapReviewState = {
  readonly notice: OverlapNotice;
  readonly sourceFingerprint: string;
  readonly disposition: OverlapDispositionRecord | null;
  readonly status: "NOT_REVIEWED" | "REVIEWED" | "STALE" | "NEEDS_REVISION" | "INVALID_EXCLUSION";
  readonly blocksPresentation: boolean;
};

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function financialOutputs(module: CalculatedAnalysisModule): Record<string, number | null> {
  const outputs = module.calculationOutcome?.success ? module.calculationOutcome.result.financialOutputs : {};
  return {
    monthlyRecurringValue: outputs.monthlyRecurringValue ?? null,
    annualRecurringValue: outputs.annualRecurringValue ?? null,
    annualOnlyValue: outputs.annualOnlyValue ?? null,
    informationalCapitalValue: outputs.informationalCapitalValue ?? null,
  };
}

export function createOverlapSourceFingerprint(args: {
  readonly notice: OverlapNotice;
  readonly modules: readonly CalculatedAnalysisModule[];
}): string {
  const moduleByKey = new Map(args.modules.map((module) => [module.moduleKey, module]));
  const source = {
    overlapRegistryVersion: OVERLAP_REGISTRY_VERSION,
    overlapGroupKey: args.notice.key,
    registryModules: overlapGroups.find((group) => group.key === args.notice.key)?.modules ?? [],
    selectedModules: args.notice.selectedModuleKeys.map((moduleKey) => {
      const calculatedModule = moduleByKey.get(moduleKey);
      const definition = getValueModule(moduleKey);
      return {
        moduleKey,
        analysisModuleId: calculatedModule?.analysisModuleId ?? null,
        displayOrder: calculatedModule?.displayOrder ?? definition.displayOrder,
        inputs: calculatedModule?.reconstructedInputs ?? {},
        financialOutputs: calculatedModule ? financialOutputs(calculatedModule) : {},
      };
    }),
  };
  return sha256(stableSerialize(source));
}

function parseModuleKeys(json: string | null): ValueModuleKey[] {
  if (!json) return [];
  try {
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((value) => {
      if (typeof value !== "string") return [];
      try {
        getValueModule(value as ValueModuleKey);
        return [value as ValueModuleKey];
      } catch {
        return [];
      }
    });
  } catch {
    return [];
  }
}

export function toOverlapDispositionRecord(row: {
  id: string; analysisId: string; overlapGroupKey: string; disposition: PrismaOverlapDisposition; acknowledgmentText: string | null; sourceFingerprint: string; excludedModuleKeysJson: string | null; reviewedAt: Date;
}): OverlapDispositionRecord | null {
  if (row.overlapGroupKey !== CUSTOM_OPPORTUNITY_OVERLAP_GROUP_KEY && !overlapGroups.some((group) => group.key === row.overlapGroupKey)) return null;
  return { ...row, overlapGroupKey: row.overlapGroupKey as OverlapGroupKey | typeof CUSTOM_OPPORTUNITY_OVERLAP_GROUP_KEY, excludedModuleKeys: parseModuleKeys(row.excludedModuleKeysJson) };
}

export function buildOverlapReviewStates(args: {
  readonly notices: readonly OverlapNotice[];
  readonly modules: readonly CalculatedAnalysisModule[];
  readonly dispositions: readonly OverlapDispositionRecord[];
  readonly customSourceFingerprint?: string;
}): OverlapReviewState[] {
  const dispositionByGroup = new Map(args.dispositions.map((disposition) => [disposition.overlapGroupKey, disposition]));
  return args.notices.map((notice) => {
    const sourceFingerprint = (notice.key as string) === CUSTOM_OPPORTUNITY_OVERLAP_GROUP_KEY ? sha256(`${CUSTOM_OPPORTUNITY_OVERLAP_GROUP_KEY}:${args.customSourceFingerprint ?? ""}`) : createOverlapSourceFingerprint({ notice, modules: args.modules });
    const disposition = dispositionByGroup.get(notice.key) ?? null;
    if (notice.type === "INFORMATION") return { notice, sourceFingerprint, disposition, status: "REVIEWED", blocksPresentation: false };
    if (!disposition) return { notice, sourceFingerprint, disposition, status: "NOT_REVIEWED", blocksPresentation: true };
    if (disposition.sourceFingerprint !== sourceFingerprint) return { notice, sourceFingerprint, disposition, status: "STALE", blocksPresentation: true };
    if (disposition.disposition === "NEEDS_REVISION") return { notice, sourceFingerprint, disposition, status: "NEEDS_REVISION", blocksPresentation: true };
    if (disposition.disposition === "EXCLUDE_FROM_TOTALS") return { notice, sourceFingerprint, disposition, status: "INVALID_EXCLUSION", blocksPresentation: true };
    return { notice, sourceFingerprint, disposition, status: "REVIEWED", blocksPresentation: false };
  });
}
