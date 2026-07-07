export const workflowStages = [
  { id: "company", label: "Company" },
  { id: "opportunities", label: "Opportunities" },
  { id: "assessment", label: "Assessment" },
  { id: "review", label: "Review" },
  { id: "presentation", label: "Presentation" },
] as const;

export type WorkflowStage = (typeof workflowStages)[number]["id"];
