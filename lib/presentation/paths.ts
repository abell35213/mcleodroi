import path from "node:path";
export const GENERATED_PRESENTATIONS_DIR = "generated-presentations";
export function sanitizePresentationFileSegment(value: string): string {
  const sanitized = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").replace(/-{2,}/g, "-");
  return sanitized || "customer";
}
export function getGeneratedPresentationPath(args: { companyName: string; generationId: string; baseDir?: string }): string {
  const base = path.resolve(args.baseDir ?? GENERATED_PRESENTATIONS_DIR);
  const file = `${sanitizePresentationFileSegment(args.companyName)}-business-impact-${sanitizePresentationFileSegment(args.generationId)}.pptx`;
  const resolved = path.resolve(base, file);
  if (!resolved.startsWith(base + path.sep)) throw new Error("Generated presentation path escaped the configured directory.");
  return resolved;
}
