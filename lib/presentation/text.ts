export type PresentationTextKind = "singleModuleAnalysis" | "dualModuleAnalysis" | "disclaimer" | "callout";
const limits: Record<PresentationTextKind, number> = { singleModuleAnalysis: 760, dualModuleAnalysis: 260, disclaimer: 240, callout: 120 };
export type PresentationTextIssue = { kind: PresentationTextKind; length: number; limit: number; message: string };
export function validatePresentationTextLength(args: { text: string; kind: PresentationTextKind }): PresentationTextIssue[] {
  const limit = limits[args.kind];
  return args.text.length > limit ? [{ kind: args.kind, length: args.text.length, limit, message: `${args.kind} text exceeds ${limit} characters.` }] : [];
}
