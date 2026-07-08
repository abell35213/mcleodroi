import pptxgen from "pptxgenjs";
import { presentationTheme } from "@/lib/presentation/theme";
export function createPresentation(args: { title?: string; subject?: string; company?: string } = {}) {
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "McLeod Software";
  pptx.company = args.company ?? "McLeod Software";
  pptx.subject = args.subject ?? "Confidential Business Impact Analysis";
  pptx.title = args.title ?? "Business Impact Analysis";
  pptx.theme = { headFontFace: presentationTheme.typography.headingFont, bodyFontFace: presentationTheme.typography.bodyFont };
  return pptx;
}
