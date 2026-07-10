import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { APPROVED_COVER_LOGO_PATH, APPROVED_THEME_IMAGE_PATH, PRESENTATION_ASSET_DIR, presentationTheme, presentationLayout, resolvePresentationAssetPath, validatePresentationTextLength, getGeneratedPresentationPath, sanitizePresentationFileSegment } from "@/lib/presentation";
import { createPresentation } from "@/lib/presentation/pptx/create-presentation";
import { addAssumptionGrid } from "@/lib/presentation/pptx/components";
import { buildCategoryOverviewSlide, buildDualModuleSlide, buildExecutiveSummarySlide } from "@/lib/presentation/slides";

const testExecutiveModel = {
  companyName: "Test Carrier",
  slideNumber: 2,
  annualOpportunity: { value: "$10,000", label: "Annual Opportunity" },
  cards: [
    { title: "Broker Productivity", value: "$1", label: "Estimated Opportunity" },
    { title: "Back Office", value: "$2", label: "Estimated Opportunity" },
    { title: "Non-Ops", value: "$3", label: "Estimated Opportunity" },
    { title: "Margin", value: "$4", label: "Estimated Opportunity" },
  ],
};

const testDualModel = {
  companyName: "Test Carrier",
  slideNumber: 4,
  categoryLabel: "Managing the Back Office",
  title: "Back Office Capacity Opportunities",
  modules: [
    { title: "Back Office", primaryMetric: "$5,880", label: "Estimated Labor-Capacity Value", howMcLeodHelps: "McLeod workflow automation reduces duplicate entry.", customerImpact: "The analysis identifies $5,880 in monthly labor-capacity value.", analysisText: "Workflow automation can recover capacity." },
    { title: "Non-Ops Productivity", primaryMetric: "$1,470", label: "Estimated Labor-Capacity Value", howMcLeodHelps: "McLeod gives teams cleaner transaction visibility.", customerImpact: "Reducing redundant administrative work frees capacity.", analysisText: "Reducing redundant administrative work frees capacity." },
  ],
};

let approvedThemeImageBackup: Buffer | null = null;
let approvedCoverLogoBackup: Buffer | null = null;

function writeTemporaryGoldenAssets() {
  mkdirSync(PRESENTATION_ASSET_DIR, { recursive: true });
  try {
    approvedThemeImageBackup = readFileSync(APPROVED_THEME_IMAGE_PATH);
  } catch {
    approvedThemeImageBackup = null;
  }
  try {
    approvedCoverLogoBackup = readFileSync(APPROVED_COVER_LOGO_PATH);
  } catch {
    approvedCoverLogoBackup = null;
  }

  const onePixelWebpBase64 = "UklGRhoAAABXRUJQVlA4ICgAAAAwAQCdASoBAAEALwA=";
  const onePixelPngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  writeFileSync(APPROVED_THEME_IMAGE_PATH, Buffer.from(onePixelWebpBase64, "base64"));
  writeFileSync(APPROVED_COVER_LOGO_PATH, Buffer.from(onePixelPngBase64, "base64"));
}

function removeTemporaryGoldenAssets() {
  if (approvedThemeImageBackup) writeFileSync(APPROVED_THEME_IMAGE_PATH, approvedThemeImageBackup);
  else rmSync(APPROVED_THEME_IMAGE_PATH, { force: true });

  if (approvedCoverLogoBackup) writeFileSync(APPROVED_COVER_LOGO_PATH, approvedCoverLogoBackup);
  else rmSync(APPROVED_COVER_LOGO_PATH, { force: true });

  approvedThemeImageBackup = null;
  approvedCoverLogoBackup = null;
}

describe("presentation design system", () => {
  it("uses canonical valid theme colors and 16:9 dimensions", () => {
    for (const color of Object.values(presentationTheme.colors)) expect(color).toMatch(/^[0-9A-F]{6}$/);
    expect(presentationLayout.slide.width / presentationLayout.slide.height).toBeCloseTo(16 / 9, 2);
    expect(presentationTheme.typography.minBodyFontSize).toBeGreaterThanOrEqual(14);
    expect(presentationTheme.typography.minDisclaimerFontSize).toBeGreaterThanOrEqual(8);
    expect(presentationTheme.typography.slideTitleFontSize).toBeGreaterThanOrEqual(24);
    expect(presentationTheme.typography.coverTitleFontSize).toBeGreaterThanOrEqual(38);
  });

  it("centralizes approved presentation asset paths inside the project", () => {
    expect(PRESENTATION_ASSET_DIR).toBe("public/presentation-assets");
    expect(presentationTheme.assets.themeImagePath).toBe(APPROVED_THEME_IMAGE_PATH);
    expect(presentationTheme.assets.coverLogoPath).toBe(APPROVED_COVER_LOGO_PATH);
    expect(presentationTheme.assets.logoPath).toBeNull();
    for (const assetPath of [presentationTheme.assets.themeImagePath, presentationTheme.assets.coverLogoPath]) {
      const resolved = resolvePresentationAssetPath(assetPath);
      expect(resolved).toContain(process.cwd());
      expect(resolved).toContain(assetPath);
    }
    expect(() => resolvePresentationAssetPath("../outside.png")).toThrow(/escaped the project root/);
  });

  it("fails the golden fixture clearly when an approved asset is missing", () => {
    removeTemporaryGoldenAssets();
    expect(() => execFileSync("npm", ["run", "presentation:golden"], { stdio: "pipe" })).toThrow(/Golden presentation asset missing: public\/presentation-assets\/highway-sunrise\.webp/);
  });

  it("validates length and template cardinality limits", () => {
    expect(validatePresentationTextLength({ text: "x".repeat(900), kind: "singleModuleAnalysis" })).toHaveLength(0);
    expect(validatePresentationTextLength({ text: "x".repeat(1_000), kind: "singleModuleAnalysis" })).toHaveLength(1);
    const pptx = createPresentation();
    expect(() => buildExecutiveSummarySlide(pptx, { ...testExecutiveModel, cards: [...testExecutiveModel.cards, testExecutiveModel.cards[0]] })).toThrow(/at most four/);
    expect(() => buildDualModuleSlide(pptx, { ...testDualModel, modules: [testDualModel.modules[0], testDualModel.modules[1]] })).not.toThrow();
    expect(() => buildCategoryOverviewSlide(pptx, { companyName: "A", categoryName: "C", slideNumber: 1, categoryOpportunity: { value: "$1", label: "Value" }, cards: [...testExecutiveModel.cards, testExecutiveModel.cards[0]] })).toThrow(/at most four/);
    const slide = pptx.addSlide();
    expect(() => addAssumptionGrid(slide, { x: 0, y: 0, w: 5, items: [{ label: "1", value: "1" }, { label: "2", value: "2" }, { label: "3", value: "3" }, { label: "4", value: "4" }, { label: "5", value: "5" }] })).toThrow(/at most four/);
  });
  it("uses clearer module narrative headings and supports configurable cover logos", () => {
    const templates = readFileSync("lib/presentation/slides/templates.ts", "utf8");
    expect(templates).toContain("How McLeod Helps");
    expect(templates).toContain("Customer Impact");
    expect(templates).not.toContain('heading: "Analysis"');
    expect(templates).toContain("coverLogoPath");
    expect(testDualModel.modules[0].howMcLeodHelps).toContain("McLeod");
    expect(testDualModel.modules[0].customerImpact).toContain("$5,880");
  });
  it("keeps generated paths safe", () => {
    expect(sanitizePresentationFileSegment("West Side Transport")).toBe("west-side-transport");
    expect(sanitizePresentationFileSegment("A, B & C!!")).toBe("a-b-c");
    expect(sanitizePresentationFileSegment("many   spaces")).toBe("many-spaces");
    expect(getGeneratedPresentationPath({ companyName: "../../customer", generationId: "../id" })).toMatch(/generated-presentations\/customer-business-impact-id\.pptx$/);
  });
  it("keeps production presentation code free of sample-only hard-coding and data access", () => {
    const files = ["lib/presentation/snapshot.ts", "lib/presentation/pptx/components.ts", "lib/presentation/slides/templates.ts"];
    const production = files.map((f) => readFileSync(f, "utf8")).join("\n");
    expect(production).not.toMatch(/West Side Transport|\$503,196|\$503,200/);
    expect(readFileSync("lib/presentation/slides/templates.ts", "utf8")).not.toMatch(/prisma|calculateAnalysis|calculateValueModule/);
  });
  it("generates a valid golden pptx package", async () => {
    writeTemporaryGoldenAssets();
    try {
      execFileSync("npm", ["run", "presentation:golden"], { stdio: "pipe" });
    } finally {
      removeTemporaryGoldenAssets();
    }
    const path = "test-results/presentation-golden.pptx";
    expect(statSync(path).size).toBeGreaterThan(10_000);
    const zip = await JSZip.loadAsync(readFileSync(path));
    expect(zip.file("ppt/slides/slide6.xml")).not.toBeNull();
    expect(Object.keys(zip.files).filter((name) => name.startsWith("ppt/media/")).length).toBeGreaterThanOrEqual(2);
    const slideText = await zip.file("ppt/slides/slide2.xml")?.async("text");
    expect(slideText).toContain("West Side Transport");
    expect(slideText).toContain("$503,200");
  });
});
