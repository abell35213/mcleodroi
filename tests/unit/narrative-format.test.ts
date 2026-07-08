import { describe, expect, it } from "vitest";
import { formatCount, formatCurrency, formatHours, formatPercentage, formatPercentagePoints } from "@/lib/narratives";

describe("narrative formatters", () => {
  it("formats currencies as whole-dollar US currency by default", () => {
    expect(formatCurrency(5250)).toBe("$5,250");
    expect(formatCurrency(6133.333333)).toBe("$6,133");
  });

  it("formats percentages and percentage points", () => {
    expect(formatPercentage(0.02)).toBe("2%");
    expect(formatPercentage(0.125)).toBe("12.5%");
    expect(formatPercentagePoints(0.01)).toBe("1 percentage-point");
  });

  it("formats modeled counts and hours without excessive precision", () => {
    expect(formatCount(350)).toBe("350");
    expect(formatCount(8.5)).toBe("8.5");
    expect(formatCount(4032.2580645)).toBe("4,032.3");
    expect(formatHours(113.6625)).toBe("113.7 hours");
  });
});
