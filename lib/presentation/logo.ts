import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

/** Git-ignored directory holding seller-uploaded customer logos. */
export const CUSTOMER_LOGOS_DIR = "customer-logos";

/** Allowed logo extensions mapped to their image MIME type. */
export const CUSTOMER_LOGO_MIME_BY_EXTENSION: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

/** Maximum accepted upload size (2 MB) to keep snapshots and exports lean. */
export const CUSTOMER_LOGO_MAX_BYTES = 2 * 1024 * 1024;

function sanitizeSegment(value: string): string {
  const sanitized = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").replace(/-{2,}/g, "-");
  return sanitized || "logo";
}

/**
 * Resolve the absolute, path-traversal-safe location for an analysis logo file.
 * Mirrors {@link file:lib/presentation/paths.ts} so uploads cannot escape the
 * configured directory.
 */
export function getCustomerLogoPath(args: { analysisId: string; extension: string; baseDir?: string }): string {
  const base = path.resolve(args.baseDir ?? CUSTOMER_LOGOS_DIR);
  const ext = args.extension.startsWith(".") ? args.extension.toLowerCase() : `.${args.extension.toLowerCase()}`;
  if (!(ext in CUSTOMER_LOGO_MIME_BY_EXTENSION)) throw new Error(`Unsupported logo extension: ${ext}`);
  const file = `${sanitizeSegment(args.analysisId)}${ext}`;
  const resolved = path.resolve(base, file);
  if (!resolved.startsWith(base + path.sep)) throw new Error("Customer logo path escaped the configured directory.");
  return resolved;
}

/** Resolve a stored logo path (relative filename or absolute) to an absolute path within the logos dir. */
export function resolveStoredCustomerLogoPath(storedPath: string, baseDir?: string): string {
  const base = path.resolve(baseDir ?? CUSTOMER_LOGOS_DIR);
  const resolved = path.isAbsolute(storedPath) ? path.resolve(storedPath) : path.resolve(base, path.basename(storedPath));
  if (!resolved.startsWith(base + path.sep)) throw new Error("Customer logo path escaped the configured directory.");
  return resolved;
}

/**
 * Read a stored customer logo and return a self-contained base64 data URI, or
 * `null` when the file is missing/unreadable. Used to embed the logo directly
 * in the immutable snapshot so PDF/HTML exports stay offline and byte-stable.
 */
export function readCustomerLogoDataUri(storedPath: string | null | undefined, baseDir?: string): string | null {
  if (!storedPath) return null;
  try {
    const resolved = resolveStoredCustomerLogoPath(storedPath, baseDir);
    if (!existsSync(resolved)) return null;
    const ext = path.extname(resolved).toLowerCase();
    const mime = CUSTOMER_LOGO_MIME_BY_EXTENSION[ext];
    if (!mime) return null;
    const bytes = readFileSync(resolved);
    return `data:${mime};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

export type SaveCustomerLogoResult = { ok: true; storedPath: string } | { ok: false; code: string; message: string };

/**
 * Validate and persist an uploaded logo for an analysis to the git-ignored logos
 * directory, returning the basename to store on the analysis. Rejects unsupported
 * extensions, empty files, and files above {@link CUSTOMER_LOGO_MAX_BYTES}.
 */
export function saveCustomerLogoFile(args: { analysisId: string; originalName: string; bytes: Uint8Array; baseDir?: string }): SaveCustomerLogoResult {
  const ext = path.extname(args.originalName).toLowerCase();
  if (!(ext in CUSTOMER_LOGO_MIME_BY_EXTENSION)) {
    return { ok: false, code: "UNSUPPORTED_LOGO_TYPE", message: "Logo must be a PNG, JPG, WEBP, GIF, or SVG image." };
  }
  if (args.bytes.byteLength === 0) return { ok: false, code: "EMPTY_LOGO", message: "The uploaded logo file was empty." };
  if (args.bytes.byteLength > CUSTOMER_LOGO_MAX_BYTES) {
    return { ok: false, code: "LOGO_TOO_LARGE", message: "Logo must be 2 MB or smaller." };
  }
  const resolved = getCustomerLogoPath({ analysisId: args.analysisId, extension: ext, baseDir: args.baseDir });
  mkdirSync(path.dirname(resolved), { recursive: true });
  // Remove any previously stored logo with a different extension for this analysis.
  for (const candidateExt of Object.keys(CUSTOMER_LOGO_MIME_BY_EXTENSION)) {
    if (candidateExt === ext) continue;
    const prior = getCustomerLogoPath({ analysisId: args.analysisId, extension: candidateExt, baseDir: args.baseDir });
    if (existsSync(prior)) rmSync(prior, { force: true });
  }
  writeFileSync(resolved, args.bytes);
  return { ok: true, storedPath: path.basename(resolved) };
}

/** Delete any stored logo files for an analysis. Safe to call when none exist. */
export function deleteCustomerLogoFiles(analysisId: string, baseDir?: string): void {
  for (const ext of Object.keys(CUSTOMER_LOGO_MIME_BY_EXTENSION)) {
    const candidate = getCustomerLogoPath({ analysisId, extension: ext, baseDir });
    if (existsSync(candidate)) rmSync(candidate, { force: true });
  }
}
