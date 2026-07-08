import { readFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { presentationTheme, presentationLayout, validatePresentationTextLength, getGeneratedPresentationPath, sanitizePresentationFileSegment } from "@/lib/presentation";
import { createPresentation } from "@/lib/presentation/pptx/create-presentation";
import { addAssumptionGrid } from "@/lib/presentation/pptx/components";
import { buildCategoryOverviewSlide, buildDualModuleSlide, buildExecutiveSummarySlide } from "@/lib/presentation/slides";
import { executiveModel, dualModel } from "@/scripts/fixtures/presentation-golden";

describe("presentation design system", () => {
  it("uses canonical valid theme colors and 16:9 dimensions", () => {
    for (const color of Object.values(presentationTheme.colors)) expect(color).toMatch(/^[0-9A-F]{6}$/);
    expect(presentationLayout.slide.width / presentationLayout.slide.height).toBeCloseTo(16 / 9, 2);
    expect(presentationTheme.typography.minBodyFontSize).toBeGreaterThanOrEqual(14);
    expect(presentationTheme.typography.minDisclaimerFontSize).toBeGreaterThanOrEqual(8);
  });
  it("validates length and template cardinality limits", () => {
    expect(validatePresentationTextLength({ text: "x".repeat(900), kind: "singleModuleAnalysis" })).toHaveLength(1);
    const pptx = createPresentation();
    expect(() => buildExecutiveSummarySlide(pptx, { ...executiveModel, cards: [...executiveModel.cards, executiveModel.cards[0]] })).toThrow(/at most four/);
    expect(() => buildDualModuleSlide(pptx, { ...dualModel, modules: [dualModel.modules[0], dualModel.modules[1]] })).not.toThrow();
    expect(() => buildCategoryOverviewSlide(pptx, { companyName: "A", categoryName: "C", slideNumber: 1, categoryOpportunity: { value: "$1", label: "Value" }, cards: [...executiveModel.cards, executiveModel.cards[0]] })).toThrow(/at most four/);
    const slide = pptx.addSlide();
    expect(() => addAssumptionGrid(slide, { x: 0, y: 0, w: 5, items: [{ label: "1", value: "1" }, { label: "2", value: "2" }, { label: "3", value: "3" }, { label: "4", value: "4" }, { label: "5", value: "5" }] })).toThrow(/at most four/);
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
    execFileSync("npm", ["run", "presentation:golden"], { stdio: "pipe" });
    const path = "test-results/presentation-golden.pptx";
    expect(statSync(path).size).toBeGreaterThan(10_000);
    const zip = await JSZip.loadAsync(readFileSync(path));
    expect(zip.file("ppt/slides/slide6.xml")).not.toBeNull();
    const slideText = await zip.file("ppt/slides/slide2.xml")?.async("text");
    expect(slideText).toContain("West Side Transport");
    expect(slideText).toContain("$503,200");
  });
});
