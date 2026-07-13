import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { APPROVED_POWERPOINT_TEMPLATE_PATH, APPROVED_THEME_IMAGE_PATH, APPROVED_TITLE_SLIDE_IMAGE_PATH, PRESENTATION_ASSET_DIR, presentationTheme, presentationLayout, resolvePresentationAssetPath, validatePresentationTextLength, getGeneratedPresentationPath, sanitizePresentationFileSegment } from "@/lib/presentation";
import { createPresentation } from "@/lib/presentation/pptx/create-presentation";
import { addAssumptionGrid } from "@/lib/presentation/pptx/components";
import { buildCategoryOverviewSlide, buildCoverSlide, buildDualModuleSlide } from "@/lib/presentation/slides";


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


async function validatePptxPackage(buffer: Buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const names = Object.keys(zip.files);
  const fileNames = names.filter((name) => !zip.files[name].dir);
  expect(fileNames).toContain("[Content_Types].xml");
  expect(fileNames).toContain("_rels/.rels");
  expect(fileNames).toContain("ppt/presentation.xml");
  expect(fileNames).toContain("ppt/_rels/presentation.xml.rels");

  const parser = new DOMParser();
  const parseXml = async (name: string) => {
    const xml = await zip.file(name)?.async("text");
    expect(xml, `${name} should exist`).toBeTruthy();
    expect(xml).not.toMatch(/\b(?:NaN|Infinity|-Infinity)\b/);
    const doc = parser.parseFromString(xml ?? "", "application/xml");
    expect(doc.getElementsByTagName("parsererror").length, `${name} should be well formed`).toBe(0);
    return { xml: xml ?? "", doc };
  };

  for (const name of fileNames.filter((name) => name.endsWith(".xml") || name.endsWith(".rels"))) await parseXml(name);

  for (const relName of fileNames.filter((name) => name.endsWith(".rels"))) {
    const { doc } = await parseXml(relName);
    const ids = Array.from(doc.getElementsByTagName("Relationship")).map((rel) => rel.getAttribute("Id"));
    expect(new Set(ids).size, `${relName} relationship IDs should be unique`).toBe(ids.length);
    const baseDir = relName === "_rels/.rels" ? "" : path.posix.dirname(path.posix.dirname(relName));
    for (const rel of Array.from(doc.getElementsByTagName("Relationship"))) {
      if (rel.getAttribute("TargetMode") === "External") continue;
      const target = rel.getAttribute("Target");
      expect(target, `${relName} relationship target should be present`).toBeTruthy();
      const normalized = path.posix.normalize(path.posix.join(baseDir, target ?? ""));
      expect(fileNames, `${relName} target ${normalized} should exist`).toContain(normalized);
    }
  }

  for (const slideName of fileNames.filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))) {
    const { doc, xml } = await parseXml(slideName);
    const shapeIds = Array.from(doc.getElementsByTagName("p:cNvPr")).map((node) => node.getAttribute("id"));
    expect(new Set(shapeIds).size, `${slideName} shape IDs should be unique`).toBe(shapeIds.length);
    expect(xml).not.toContain("<c:title");
  }

  const charts = fileNames.filter((name) => /^ppt\/charts\/chart\d+\.xml$/.test(name));
  const embeddings = fileNames.filter((name) => name.startsWith("ppt/embeddings/"));
  expect(charts).toHaveLength(0);
  expect(embeddings).toHaveLength(0);
}

async function pptxMediaCount(pptx: ReturnType<typeof createPresentation>) {
  const buffer = await pptx.write({ outputType: "nodebuffer" }) as Buffer;
  const zip = await JSZip.loadAsync(buffer);
  return Object.keys(zip.files).filter((name) => name.startsWith("ppt/media/")).length;
}

function writeTemporaryGoldenAssets() {
  mkdirSync(PRESENTATION_ASSET_DIR, { recursive: true });
  try {
    approvedThemeImageBackup = readFileSync(APPROVED_THEME_IMAGE_PATH);
  } catch {
    approvedThemeImageBackup = null;
  }

  const onePixelPngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  writeFileSync(APPROVED_THEME_IMAGE_PATH, Buffer.from(onePixelPngBase64, "base64"));
}

function removeTemporaryGoldenAssets() {
  if (approvedThemeImageBackup) writeFileSync(APPROVED_THEME_IMAGE_PATH, approvedThemeImageBackup);
  else rmSync(APPROVED_THEME_IMAGE_PATH, { force: true });

  approvedThemeImageBackup = null;
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
    expect(presentationTheme.assets.titleSlideImagePath).toBe(APPROVED_TITLE_SLIDE_IMAGE_PATH);
    expect(presentationTheme.assets.powerpointTemplatePath).toBe(APPROVED_POWERPOINT_TEMPLATE_PATH);
    expect(presentationTheme.assets.logoPath).toBeNull();
    for (const assetPath of [presentationTheme.assets.themeImagePath, presentationTheme.assets.titleSlideImagePath, presentationTheme.assets.powerpointTemplatePath]) {
      const resolved = resolvePresentationAssetPath(assetPath);
      expect(resolved).toContain(process.cwd());
      expect(resolved).toContain(assetPath);
    }
    expect(() => resolvePresentationAssetPath("../outside.png")).toThrow(/escaped the project root/);
  });

it("fails the golden fixture clearly when an approved asset is missing", () => {
    let themeBackup: Buffer | null = null;
    try {
      themeBackup = readFileSync(APPROVED_THEME_IMAGE_PATH);
    } catch {
      themeBackup = null;
    }

    rmSync(APPROVED_THEME_IMAGE_PATH, { force: true });
    try {
      expect(() => execFileSync("npm", ["run", "presentation:golden"], { stdio: "pipe" })).toThrow(/Golden presentation asset missing: public\/presentation-assets\/themepages\.png/);
    } finally {
      if (themeBackup) writeFileSync(APPROVED_THEME_IMAGE_PATH, themeBackup);
      else rmSync(APPROVED_THEME_IMAGE_PATH, { force: true });
    }
  });


  it("has the approved title image and template assets available on disk", () => {
    expect(statSync(resolvePresentationAssetPath(APPROVED_TITLE_SLIDE_IMAGE_PATH)).isFile()).toBe(true);
    expect(statSync(resolvePresentationAssetPath(APPROVED_THEME_IMAGE_PATH)).isFile()).toBe(true);
    expect(statSync(resolvePresentationAssetPath(APPROVED_POWERPOINT_TEMPLATE_PATH)).isFile()).toBe(true);
  });

  it("validates length and template cardinality limits", () => {
    expect(validatePresentationTextLength({ text: "x".repeat(900), kind: "singleModuleAnalysis" })).toHaveLength(0);
    expect(validatePresentationTextLength({ text: "x".repeat(1_000), kind: "singleModuleAnalysis" })).toHaveLength(1);
    const pptx = createPresentation();
    expect(() => buildDualModuleSlide(pptx, { ...testDualModel, modules: [testDualModel.modules[0], testDualModel.modules[1]] })).not.toThrow();
    expect(() => buildCategoryOverviewSlide(pptx, { companyName: "A", categoryName: "C", slideNumber: 1, categoryOpportunity: { value: "$1", label: "Value" }, cards: [{ title: "1", value: "$1", label: "A" }, { title: "2", value: "$1", label: "A" }, { title: "3", value: "$1", label: "A" }, { title: "4", value: "$1", label: "A" }, { title: "5", value: "$1", label: "A" }] })).toThrow(/at most four/);
    const slide = pptx.addSlide();
    expect(() => addAssumptionGrid(slide, { x: 0, y: 0, w: 5, items: [{ label: "1", value: "1" }, { label: "2", value: "2" }, { label: "3", value: "3" }, { label: "4", value: "4" }, { label: "5", value: "5" }] })).toThrow(/at most four/);
  });
  it("uses clearer module narrative headings", async () => {
    const pptx = createPresentation();
    buildDualModuleSlide(pptx, { ...testDualModel, modules: [testDualModel.modules[0], testDualModel.modules[1]] });
    const buffer = await pptx.write({ outputType: "nodebuffer" }) as Buffer;
    const zip = await JSZip.loadAsync(buffer);
    const slideText = await zip.file("ppt/slides/slide1.xml")?.async("text");
    expect(slideText).toContain("HOW MCLEOD HELPS");
    expect(slideText).toContain("CUSTOMER IMPACT");
    expect(testDualModel.modules[0].howMcLeodHelps).toContain("McLeod");
    expect(testDualModel.modules[0].customerImpact).toContain("$5,880");
  });
  it("uses the title background image without overlay or logo art", async () => {
    const withoutImages = createPresentation();
    buildCoverSlide(withoutImages, { companyName: "Test Carrier", titleSlideImagePath: null });
    const withoutImagesMediaCount = await pptxMediaCount(withoutImages);

    const withDefaultTitle = createPresentation();
    buildCoverSlide(withDefaultTitle, { companyName: "Test Carrier" });
    expect(await pptxMediaCount(withDefaultTitle)).toBeGreaterThan(withoutImagesMediaCount);
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
    expect(production).not.toMatch(/West Side Transport|Shermar Transportation|\$503,196|\$503,200/);
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
    const goldenBuffer = readFileSync(path);
    await validatePptxPackage(goldenBuffer);
    const zip = await JSZip.loadAsync(goldenBuffer);
    expect(zip.file("ppt/slides/slide6.xml")).not.toBeNull();
    expect(Object.keys(zip.files).filter((name) => name.startsWith("ppt/media/")).length).toBeGreaterThanOrEqual(2);
    const slideText = await zip.file("ppt/slides/slide2.xml")?.async("text");
    expect(slideText).toContain("West Side Transport");
    expect(slideText).not.toContain("$503,200");
    expect(slideText).toContain("addresses your key areas of need by");
    const roiSlideText = await zip.file("ppt/slides/slide7.xml")?.async("text");
    expect(roiSlideText).toContain("Investment &amp; Return Analysis");
    expect(roiSlideText).not.toContain("Cumulative Net Cash Flow");
    expect(roiSlideText).toContain("Estimated Payback");
  });
});
