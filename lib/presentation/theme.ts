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
  assets: { themeImagePath: null as string | null, logoPath: null as string | null, coverLogoPath: null as string | null },
} as const;
export type PresentationTheme = typeof presentationTheme;
