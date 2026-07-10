import { redirect } from "next/navigation";
import { createAndGeneratePresentationPptx } from "@/lib/presentation/generation";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const result = await createAndGeneratePresentationPptx({ analysisId: id });
  if (!result.ok) redirect(`/analyses/${id}/presentation?error=${encodeURIComponent(result.error.message)}`);
  redirect(`/presentation-generations/${result.value.generation.id}/download`);
}
