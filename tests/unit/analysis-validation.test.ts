import { describe, expect, it } from "vitest";
import { createAnalysisSchema } from "@/lib/validation/analysis";

describe("createAnalysisSchema", () => {
  const baseInput = {
    companyName: "Acme Logistics",
    businessType: "TRUCKLOAD",
    preparedBy: "McLeod Seller",
    analysisDate: "2026-07-07",
  };

  it("accepts a valid Truckload analysis", () => {
    const result = createAnalysisSchema.safeParse(baseInput);
    expect(result.success).toBe(true);
    expect(result.success ? result.data.businessType : undefined).toBe("TRUCKLOAD");
  });

  it("accepts a valid Brokerage analysis", () => {
    const result = createAnalysisSchema.safeParse({ ...baseInput, businessType: "BROKERAGE" });
    expect(result.success).toBe(true);
    expect(result.success ? result.data.businessType : undefined).toBe("BROKERAGE");
  });

  it("rejects a missing company name", () => {
    const result = createAnalysisSchema.safeParse({ ...baseInput, companyName: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid business type", () => {
    const result = createAnalysisSchema.safeParse({ ...baseInput, businessType: "LTL" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing prepared by value", () => {
    const result = createAnalysisSchema.safeParse({ ...baseInput, preparedBy: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid serialized analysis date", () => {
    const result = createAnalysisSchema.safeParse({ ...baseInput, analysisDate: "not-a-date" });
    expect(result.success).toBe(false);
  });
});
