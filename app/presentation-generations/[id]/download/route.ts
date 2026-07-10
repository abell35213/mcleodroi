import { readFile } from "node:fs/promises";
import { basename, resolve, sep } from "node:path";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { GENERATED_PRESENTATIONS_DIR } from "@/lib/presentation/paths";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const generation = await prisma.presentationGeneration.findUnique({ where: { id } });
  const baseDir = resolve(GENERATED_PRESENTATIONS_DIR) + sep;
  if (!generation || generation.status !== "COMPLETE" || !generation.filePath || !generation.filePath.startsWith(baseDir) || !generation.filePath.endsWith(".pptx")) notFound();
  try {
    const data = await readFile(generation.filePath);
    return new Response(data, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation", "Content-Disposition": `attachment; filename=\"${basename(generation.filePath)}\"` } });
  } catch {
    notFound();
  }
}
