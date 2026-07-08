#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureLocalEnv } from "./db-env.mjs";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "..");

function runCommand(command, args) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    env: process.env,
    shell: process.platform === "win32",
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status}`);
  }
}

try {
  const envResult = ensureLocalEnv(projectRoot);
  console.log(envResult.message);

  runCommand("prisma", ["generate"]);
  runCommand("prisma", ["migrate", "deploy"]);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`db:setup failed: ${message}`);
  process.exit(1);
}
