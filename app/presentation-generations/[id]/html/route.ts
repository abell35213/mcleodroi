import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { renderPresentationHtml } from "@/lib/presentation/export/html";
import { sanitizePresentationFileSegment } from "@/lib/presentation/paths";
import { parsePresentationSnapshot } from "@/lib/presentation/snapshot";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const generation = await prisma.presentationGeneration.findUnique({ where: { id } });
  if (!generation) notFound();
  try {
    const snapshot = parsePresentationSnapshot(generation.snapshotJson);
    const html = renderPresentationHtml(snapshot);
    const fileName = `${sanitizePresentationFileSegment(snapshot.analysis.companyName)}-business-impact-${sanitizePresentationFileSegment(generation.id)}.html`;
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch {
    notFound();
  }
}
