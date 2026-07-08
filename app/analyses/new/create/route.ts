import { redirect } from "next/navigation";
import { createAnalysis } from "@/lib/analyses/service";
import { createAnalysisSchema } from "@/lib/validation/analysis";

export async function POST(request: Request) {
  const formData = await request.formData();
  const parsed = createAnalysisSchema.safeParse({
    companyName: formData.get("companyName"),
    customerContact: formData.get("customerContact") || undefined,
    businessType: formData.get("businessType"),
    preparedBy: formData.get("preparedBy"),
    analysisDate: formData.get("analysisDate"),
  });
  if (!parsed.success) redirect("/analyses/new");
  const result = await createAnalysis({ input: parsed.data });
  if (!result.ok) redirect("/analyses/new");
  redirect(`/analyses/${result.value.id}/opportunities`);
}
