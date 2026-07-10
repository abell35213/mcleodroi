import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const generation = await prisma.presentationGeneration.findUnique({ where: { id } });
  if (!generation || generation.status !== "COMPLETE" || !generation.filePath) notFound();
  try {
    const data = await readFile(generation.filePath);
    return new Response(data, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation", "Content-Disposition": `attachment; filename="${basename(generation.filePath)}"` } });
  } catch {
    notFound();
  }
}
