import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { deleteCustomerLogoFiles, getCustomerLogoPath, readCustomerLogoDataUri, saveCustomerLogoFile } from "@/lib/presentation/logo";

let baseDir: string;
const PNG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3, 4]);

beforeEach(() => {
  baseDir = mkdtempSync(join(tmpdir(), "mcleod-logo-"));
});
afterEach(() => {
  rmSync(baseDir, { recursive: true, force: true });
});

describe("customer logo storage", () => {
  it("saves a valid PNG and produces a self-contained data URI", () => {
    const saved = saveCustomerLogoFile({ analysisId: "abc123", originalName: "Acme Logo.PNG", bytes: PNG, baseDir });
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(saved.storedPath).toBe("abc123.png");
    const dataUri = readCustomerLogoDataUri(saved.storedPath, baseDir);
    expect(dataUri).toMatch(/^data:image\/png;base64,/);
  });

  it("rejects unsupported extensions", () => {
    const result = saveCustomerLogoFile({ analysisId: "a", originalName: "malware.exe", bytes: PNG, baseDir });
    expect(result.ok).toBe(false);
  });

  it("rejects empty and oversized files", () => {
    expect(saveCustomerLogoFile({ analysisId: "a", originalName: "x.png", bytes: new Uint8Array(0), baseDir }).ok).toBe(false);
    const huge = new Uint8Array(2 * 1024 * 1024 + 1);
    expect(saveCustomerLogoFile({ analysisId: "a", originalName: "x.png", bytes: huge, baseDir }).ok).toBe(false);
  });

  it("replaces a prior logo of a different extension", () => {
    saveCustomerLogoFile({ analysisId: "a", originalName: "x.png", bytes: PNG, baseDir });
    const jpg = saveCustomerLogoFile({ analysisId: "a", originalName: "x.jpg", bytes: PNG, baseDir });
    expect(jpg.ok).toBe(true);
    // The old .png must be gone so only one logo exists per analysis.
    expect(() => readFileSync(getCustomerLogoPath({ analysisId: "a", extension: ".png", baseDir }))).toThrow();
  });

  it("blocks path traversal in stored paths", () => {
    writeFileSync(join(baseDir, "safe.png"), PNG);
    // A traversal attempt collapses to the basename inside baseDir.
    expect(readCustomerLogoDataUri("../../etc/passwd", baseDir)).toBeNull();
    expect(readCustomerLogoDataUri("safe.png", baseDir)).toMatch(/^data:image\/png;base64,/);
  });

  it("returns null for missing logos and deletes files", () => {
    expect(readCustomerLogoDataUri(null, baseDir)).toBeNull();
    saveCustomerLogoFile({ analysisId: "a", originalName: "x.png", bytes: PNG, baseDir });
    deleteCustomerLogoFiles("a", baseDir);
    expect(readCustomerLogoDataUri("a.png", baseDir)).toBeNull();
  });
});
