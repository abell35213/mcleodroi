import { copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export function ensureLocalEnv(projectRoot) {
  const envPath = join(projectRoot, ".env");
  const templatePath = join(projectRoot, ".env.example");

  if (existsSync(envPath)) {
    return { created: false, message: ".env already exists; leaving it unchanged" };
  }

  if (!existsSync(templatePath)) {
    throw new Error("Missing .env and .env.example; cannot create local DATABASE_URL configuration.");
  }

  copyFileSync(templatePath, envPath);
  return { created: true, message: "Created .env from .env.example" };
}
