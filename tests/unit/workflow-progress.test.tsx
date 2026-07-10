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
    expect(screen.getByText("Review").closest("li")).toHaveAttribute("aria-current", "step");
  });

  it("links backward stages and gates forward stages", () => {
    render(<WorkflowProgress activeStage="assessment" analysisId="analysis-1" canReview={false} canGeneratePresentation={false} />);
    expect(screen.getByRole("link", { name: "Company" })).toHaveAttribute("href", "/analyses/analysis-1/company");
    expect(screen.getByRole("link", { name: "Opportunities" })).toHaveAttribute("href", "/analyses/analysis-1/opportunities");
    expect(screen.queryByRole("link", { name: "Review" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Presentation" })).toBeNull();
  });

  it("allows review and presentation only when readiness allows them", () => {
    render(<WorkflowProgress activeStage="opportunities" analysisId="analysis-1" canReview canGeneratePresentation />);
    expect(screen.getByRole("link", { name: "Review" })).toHaveAttribute("href", "/analyses/analysis-1/review");
    expect(screen.getByRole("link", { name: "Presentation" })).toHaveAttribute("href", "/analyses/analysis-1/presentation");
  });
});
