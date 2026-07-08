import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { ensureLocalEnv } from "../../scripts/db-env.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const tempDirs = [];

function createTempProject() {
  const dir = mkdtempSync(join(tmpdir(), "mcleodroi-db-bootstrap-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    rmSync(dir, { force: true, recursive: true });
  }
});

describe("ensureLocalEnv", () => {
  it("creates .env from .env.example when .env is missing", () => {
    const projectRoot = createTempProject();
    writeFileSync(join(projectRoot, ".env.example"), 'DATABASE_URL="file:./dev.db"\n');

    const result = ensureLocalEnv(projectRoot);

    expect(result).toEqual({ created: true, message: "Created .env from .env.example" });
    expect(readFileSync(join(projectRoot, ".env"), "utf8")).toBe('DATABASE_URL="file:./dev.db"\n');
  });

  it("does not overwrite an existing .env", () => {
    const projectRoot = createTempProject();
    writeFileSync(join(projectRoot, ".env.example"), 'DATABASE_URL="file:./dev.db"\n');
    writeFileSync(join(projectRoot, ".env"), 'DATABASE_URL="file:./custom.db"\n');

    const result = ensureLocalEnv(projectRoot);

    expect(result).toEqual({ created: false, message: ".env already exists; leaving it unchanged" });
    expect(readFileSync(join(projectRoot, ".env"), "utf8")).toBe('DATABASE_URL="file:./custom.db"\n');
  });

  it("fails clearly when .env and .env.example are missing", () => {
    const projectRoot = createTempProject();

    expect(() => ensureLocalEnv(projectRoot)).toThrow(
      "Missing .env and .env.example; cannot create local DATABASE_URL configuration.",
    );
  });
});


describe("local Node configuration", () => {
  it("pins nvm to Node 20", () => {
    expect(readFileSync(join(repoRoot, ".nvmrc"), "utf8").trim()).toBe("20");
  });

  it("limits package engines to Node 20", () => {
    const packageJson = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));

    expect(packageJson.engines.node).toBe(">=20 <21");
  });
});
