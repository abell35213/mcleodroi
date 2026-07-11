import { statSync } from "node:fs";
import path from "node:path";

export const PRESENTATION_ASSET_DIR = "public/presentation-assets";
export const APPROVED_THEME_IMAGE_PATH = `${PRESENTATION_ASSET_DIR}/themepages.png`;
export const APPROVED_TITLE_SLIDE_IMAGE_PATH = `${PRESENTATION_ASSET_DIR}/McLeodTitlePage.png`;
export const APPROVED_POWERPOINT_TEMPLATE_PATH = `${PRESENTATION_ASSET_DIR}/PPTTheme.potx`;
export const PROPRIETARY_FOOTER_TEXT = "©2026 McLeod Software® | Proprietary & Confidential";

export function resolvePresentationAssetPath(assetPath: string): string {
  const projectRoot = process.cwd();
  const resolved = path.resolve(projectRoot, assetPath);
  if (!resolved.startsWith(projectRoot + path.sep)) throw new Error(`Presentation asset path escaped the project root: ${assetPath}`);
  return resolved;
}

export function requireGoldenPresentationAsset(assetPath: string): string {
  const resolved = resolvePresentationAssetPath(assetPath);
  let stat;
  try {
    stat = statSync(resolved);
  } catch {
    throw new Error(`Golden presentation asset missing: ${assetPath}`);
  }
  if (!stat.isFile()) throw new Error(`Golden presentation asset is not a file: ${assetPath}`);
  return resolved;
}

export const presentationTheme = {
  colors: {
    midnight: "0E2841",
    navy: "101820",
    templateBlue: "007EAE",
    sunriseGold: "FED041",
    mcleodGold: "FC9527",
    warmCanvas: "FFFFFF",
    charcoal: "243142",
    mutedBlue: "4E5F73",
    forest: "3F5E4A",
    white: "FFFFFF",
    softBorder: "D8DDE3",
    mutedText: "627085",
  },
  typography: {
    headingFont: "Calibri",
    bodyFont: "Calibri",
    metricFont: "Arial",
    minBodyFontSize: 14,
    minDisclaimerFontSize: 8,
    slideTitleFontSize: 27,
    coverTitleFontSize: 38,
  },
  assets: {
    themeImagePath: APPROVED_THEME_IMAGE_PATH,
    logoPath: null as string | null,
    titleSlideImagePath: APPROVED_TITLE_SLIDE_IMAGE_PATH,
    powerpointTemplatePath: APPROVED_POWERPOINT_TEMPLATE_PATH,
  },
} as const;
export type PresentationTheme = typeof presentationTheme;
