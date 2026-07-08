#!/usr/bin/env node
import { rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const databaseUrl = process.env.DATABASE_URL ?? "file:./e2e.db";

if (databaseUrl !== "file:./e2e.db") {
  console.error(`Refusing to reset non-E2E database URL: ${databaseUrl}`);
  process.exit(1);
}

rmSync(resolve(projectRoot, "prisma/e2e.db"), { force: true });
rmSync(resolve(projectRoot, "prisma/e2e.db-journal"), { force: true });

const generate = spawnSync("npx", ["--no-install", "prisma", "generate"], {
  cwd: projectRoot,
  env: { ...process.env, DATABASE_URL: databaseUrl },
  stdio: "inherit",
  shell: process.platform === "win32",
});
if (generate.error) throw generate.error;
if (generate.status !== 0) process.exit(generate.status ?? 1);

const result = spawnSync("npx", ["--no-install", "prisma", "migrate", "deploy"], {
  cwd: projectRoot,
  env: { ...process.env, DATABASE_URL: databaseUrl },
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
