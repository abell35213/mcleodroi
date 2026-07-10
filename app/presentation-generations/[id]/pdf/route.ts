import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { renderPresentationPdf } from "@/lib/presentation/export/pdf";
import { sanitizePresentationFileSegment } from "@/lib/presentation/paths";
import { parsePresentationSnapshot } from "@/lib/presentation/snapshot";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const generation = await prisma.presentationGeneration.findUnique({ where: { id } });
  if (!generation) notFound();
  try {
    const snapshot = parsePresentationSnapshot(generation.snapshotJson);
    const pdf = await renderPresentationPdf(snapshot);
    const fileName = `${sanitizePresentationFileSegment(snapshot.analysis.companyName)}-business-impact-${sanitizePresentationFileSegment(generation.id)}.pdf`;
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch {
    notFound();
  }
}
