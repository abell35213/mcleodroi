import { statSync } from "node:fs";
import path from "node:path";

export const PRESENTATION_ASSET_DIR = "public/presentation-assets";
export const APPROVED_THEME_IMAGE_PATH = `${PRESENTATION_ASSET_DIR}/highway-sunrise.webp`;
export const APPROVED_COVER_LOGO_PATH = `${PRESENTATION_ASSET_DIR}/mcleod-logo.png`;

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
    midnight: "0B1D33",
    navy: "12314F",
    sunriseGold: "D89B2B",
    warmCanvas: "F8F1E4",
    charcoal: "243142",
    mutedBlue: "54708F",
    forest: "3F5E4A",
    white: "FFFFFF",
    softBorder: "E8DCC6",
    mutedText: "627085",
  },
  typography: {
    headingFont: "Aptos Display",
    bodyFont: "Aptos",
    metricFont: "Arial",
    minBodyFontSize: 14,
    minDisclaimerFontSize: 8,
    slideTitleFontSize: 24,
    coverTitleFontSize: 38,
  },
  assets: {
    themeImagePath: APPROVED_THEME_IMAGE_PATH,
    logoPath: null as string | null,
    coverLogoPath: APPROVED_COVER_LOGO_PATH,
  },
} as const;
export type PresentationTheme = typeof presentationTheme;
