import { describe, expect, it } from "vitest";
import { renderContributionWidget } from "../render/widget";
import type { CalendarGrid } from "../types";

function createContainer(): HTMLElement {
  return { innerHTML: "" } as HTMLElement;
}

describe("renderContributionWidget", () => {
  const grid: CalendarGrid = {
    weeks: [
      [
        { date: "2025-06-01", count: 2, level: 2 },
        { date: "2025-06-02", count: 4, level: 4 },
        null,
        null,
        null,
        null,
        null,
      ],
    ],
    totalContributions: 6,
  };

  it("renders the heatmap and summary metrics together", () => {
    const container = createContainer();

    renderContributionWidget(container, {
      grid,
      metrics: [
        { label: "Total Contributions", value: 552 },
        { label: "Best Streak", value: "6 days" },
        { label: "Current Streak", value: "6 days" },
        { label: "Active Days", value: 147 },
      ],
      size: "lg",
      statsPosition: "right",
    });

    expect(container.innerHTML).toContain('data-size="lg"');
    expect(container.innerHTML).toContain('data-position="right"');
    expect(container.innerHTML).toContain("Total Contributions");
    expect(container.innerHTML).toContain("Best Streak");
    expect(container.innerHTML).toContain("<svg");
  });

  it("supports placing metrics on the left", () => {
    const container = createContainer();

    renderContributionWidget(container, {
      grid,
      metrics: [
        { label: "Total Contributions", value: 12 },
        { label: "Best Streak", value: "3 days" },
      ],
      size: "sm",
      statsPosition: "left",
    });

    expect(container.innerHTML).toContain('data-size="sm"');
    expect(container.innerHTML).toContain('data-position="left"');
    expect(container.innerHTML).toContain("grid-template-columns:220px minmax(0, 1fr)");
  });
});
