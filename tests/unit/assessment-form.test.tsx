import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AssessmentForm } from "@/components/assessment/assessment-form";
import type { CalculatedAnalysisModule } from "@/lib/analyses/types";

function moduleFixture(inputs: CalculatedAnalysisModule["inputs"]): CalculatedAnalysisModule {
  return {
    analysisModuleId: "module-1",
    analysisId: "analysis-1",
    moduleKey: "REDUCE_DEADHEAD",
    status: "IN_PROGRESS",
    displayOrder: 1,
    narrativeMode: "TEMPLATE",
    customNarrative: null,
    customNarrativeSourceFingerprint: null,
    inputs,
    reconstructedInputs: {},
    missingRequiredInputKeys: [],
    calculationOutcome: null,
    validationIssues: [],
    category: "TL_TRUCKING_OPERATIONS",
    valueType: "COST_REDUCTION",
  };
}

describe("AssessmentForm input stability", () => {
  it("renders undefined numeric and percentage values as controlled empty fields without NaN sliders", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(<AssessmentForm module={moduleFixture([])} action={async () => undefined} />);

    expect(screen.getByLabelText("Current deadhead percentage")).toHaveValue("");
    expect(screen.getByLabelText("Current deadhead percentage slider")).toHaveValue("0");
    expect(screen.getByLabelText("Total miles per month")).toHaveValue("");
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("keeps empty percentage text from sending NaN to the range input", () => {
    render(<AssessmentForm module={moduleFixture([{ inputKey: "current_deadhead_pct", numericValue: 12 }])} action={async () => undefined} />);
    const percent = screen.getByLabelText("Current deadhead percentage");
    const slider = screen.getByLabelText("Current deadhead percentage slider");

    fireEvent.change(percent, { target: { value: "" } });

    expect(percent).toHaveValue("");
    expect(slider).toHaveValue("0");
  });

  it("synchronizes valid percentage values between number field and slider", () => {
    render(<AssessmentForm module={moduleFixture([])} action={async () => undefined} />);
    const percent = screen.getByLabelText("Current deadhead percentage");
    const slider = screen.getByLabelText("Current deadhead percentage slider");

    fireEvent.change(percent, { target: { value: "14.5" } });
    expect(slider).toHaveValue("14.5");

    fireEvent.change(slider, { target: { value: "20" } });
    expect(percent).toHaveValue("20");
  });

  it("preserves invalid temporary number text and keeps zero visible", () => {
    render(<AssessmentForm module={moduleFixture([{ inputKey: "monthly_miles", numericValue: 0 }])} action={async () => undefined} />);
    const miles = screen.getByLabelText("Total miles per month");

    expect(miles).toHaveValue("0");
    fireEvent.change(miles, { target: { value: "-" } });
    expect(miles).toHaveDisplayValue("-");
  });
});
