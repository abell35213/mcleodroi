import { existsSync, readFileSync } from "node:fs";
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
