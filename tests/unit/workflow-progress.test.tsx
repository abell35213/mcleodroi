import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WorkflowProgress } from "@/components/analysis/workflow-progress";
import { workflowStages } from "@/components/analysis/workflow-stages";

describe("WorkflowProgress", () => {
  it("renders the shared stage labels in order", () => {
    render(<WorkflowProgress activeStage="assessment" />);
    const renderedStages = screen.getAllByRole("listitem").map((item) => item.textContent);
    expect(renderedStages).toEqual(workflowStages.map((stage) => stage.label));
  });

  it("marks the active stage as the current step", () => {
    render(<WorkflowProgress activeStage="review" />);
    expect(screen.getByText("Review")).toHaveAttribute("aria-current", "step");
  });
});
