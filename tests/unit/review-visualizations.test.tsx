import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ValueWaterfallChart } from "@/components/review/charts/value-waterfall-chart";
import { ValueBreakdownBars } from "@/components/review/charts/value-breakdown-bars";
import { CumulativeBenefitChart } from "@/components/review/charts/cumulative-benefit-chart";
import { OverlapNotices } from "@/components/review/overlap-notices";
import type { OverlapNotice } from "@/lib/modules";

describe("ValueWaterfallChart", () => {
  const data = {
    total: 240000,
    steps: [
      { analysisModuleId: "m1", moduleKey: "BROKER_PRODUCTIVITY", label: "Broker Productivity", value: 200000, start: 0, end: 200000 },
      { analysisModuleId: "m2", moduleKey: "REDUCE_BILLING_LABOR", label: "Reduce Billing Labor", value: 40000, start: 200000, end: 240000 },
    ],
  } as const;

  it("renders an accessible image with a data table fallback", () => {
    render(<ValueWaterfallChart data={data} />);
    const image = screen.getByRole("img");
    expect(image).toHaveAttribute("aria-label", expect.stringContaining("$240,000"));
    const table = screen.getByRole("table");
    expect(within(table).getByRole("rowheader", { name: "Broker Productivity" })).toBeInTheDocument();
    expect(within(table).getByRole("rowheader", { name: "Total Opportunity" })).toBeInTheDocument();
  });

  it("renders nothing when there is no value", () => {
    const { container } = render(<ValueWaterfallChart data={{ total: 0, steps: [] }} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("ValueBreakdownBars", () => {
  it("renders segments with percentage shares in the legend and table", () => {
    render(
      <ValueBreakdownBars
        title="Opportunity by Value Type"
        description="desc"
        data={{
          total: 250000,
          segments: [
            { key: "REVENUE_MARGIN_OPPORTUNITY", label: "Revenue & Margin", value: 200000, share: 0.8 },
            { key: "CAPACITY_VALUE", label: "Labor Capacity", value: 50000, share: 0.2 },
          ],
        }}
      />,
    );
    expect(screen.getByRole("img", { name: /Opportunity by Value Type/ })).toBeInTheDocument();
    const table = screen.getByRole("table");
    expect(within(table).getByRole("rowheader", { name: "Revenue & Margin" })).toBeInTheDocument();
    expect(within(table).getAllByText("80%").length).toBeGreaterThan(0);
  });
});

describe("CumulativeBenefitChart", () => {
  it("plots the investment at year zero and labels payback", () => {
    render(
      <CumulativeBenefitChart
        data={{
          investment: 300000,
          paybackYears: 1.25,
          maxMagnitude: 420000,
          points: [
            { year: 1, cumulativeNetCashFlow: -60000, cumulativeNetBenefit: 240000 },
            { year: 2, cumulativeNetCashFlow: 180000, cumulativeNetBenefit: 480000 },
            { year: 3, cumulativeNetCashFlow: 420000, cumulativeNetBenefit: 720000 },
          ],
        }}
      />,
    );
    expect(screen.getByRole("img", { name: /Payback in 1.3 years/ })).toBeInTheDocument();
    const table = screen.getByRole("table");
    expect(within(table).getByRole("rowheader", { name: "Now" })).toBeInTheDocument();
    expect(within(table).getByText("-$300,000")).toBeInTheDocument();
  });
});

describe("OverlapNotices", () => {
  it("shows the empty state when there are no overlaps", () => {
    render(<OverlapNotices states={[]} saveAction={() => undefined} />);
    expect(screen.getByText("No potential value overlaps identified.")).toBeInTheDocument();
  });

  it("labels review overlaps and clarifies values are not discounted", () => {
    const notices: OverlapNotice[] = [
      {
        key: "OPERATIONS_REDUNDANT_LABOR",
        type: "REVIEW",
        message: "Review overlapping labor hours.",
        modules: ["OPERATIONS_EFFICIENCY", "EDI_ORDER_AUTOMATION"],
        selectedModuleKeys: ["OPERATIONS_EFFICIENCY", "EDI_ORDER_AUTOMATION"],
      },
      {
        key: "RFP_VALUE",
        type: "INFORMATION",
        message: "Different types of value.",
        modules: ["RFP_PROCESS_EFFICIENCY", "RFP_GROWTH_OPPORTUNITY"],
        selectedModuleKeys: ["RFP_PROCESS_EFFICIENCY", "RFP_GROWTH_OPPORTUNITY"],
      },
    ];
    render(<OverlapNotices states={notices.map((notice) => ({ notice, sourceFingerprint: "fp", disposition: null, status: notice.type === "INFORMATION" ? "REVIEWED" : "NOT_REVIEWED", blocksPresentation: notice.type === "REVIEW" }))} saveAction={() => undefined} />);
    expect(screen.getByText(/values are not automatically discounted/i)).toBeInTheDocument();
    expect(screen.getByText("Review Overlap")).toBeInTheDocument();
    expect(screen.getByText("Informational")).toBeInTheDocument();
  });
});
