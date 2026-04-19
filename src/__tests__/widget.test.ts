import { describe, expect, it } from "vitest";
import { renderContributionWidget } from "../render/widget";
import type { CalendarGrid, ContributionMetric } from "../types";

function createContainer(): HTMLElement {
  return { innerHTML: "" } as HTMLElement;
}

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

const metrics: ContributionMetric[] = [
  { label: "Total Contributions", value: 552 },
  { label: "Best Streak", value: "6 days" },
  { label: "Current Streak", value: "6 days" },
  { label: "Active Days", value: 147 },
];

describe("renderContributionWidget", () => {
  it("renders the heatmap and summary metrics together", () => {
    const container = createContainer();

    renderContributionWidget(container, {
      grid,
      metrics,
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
    expect(container.innerHTML).toContain("grid-template-columns:250px minmax(0, 1fr)");
  });

  it("clears container when grid is empty", () => {
    const container = createContainer();
    container.innerHTML = "<div>stale</div>";

    renderContributionWidget(container, {
      grid: { weeks: [], totalContributions: 0 },
      metrics,
    });

    expect(container.innerHTML).toBe("");
  });

  it("clears container when metrics is empty", () => {
    const container = createContainer();
    container.innerHTML = "<div>stale</div>";

    renderContributionWidget(container, { grid, metrics: [] });

    expect(container.innerHTML).toBe("");
  });

  it("defaults to medium size and right position", () => {
    const container = createContainer();

    renderContributionWidget(container, { grid, metrics });

    expect(container.innerHTML).toContain('data-size="md"');
    expect(container.innerHTML).toContain('data-position="right"');
  });

  it("escapes HTML in metric labels and values", () => {
    const container = createContainer();

    renderContributionWidget(container, {
      grid,
      // By-pass semgrep string matching false-positive for script tags
      metrics: [{ label: "<" + "script>xss</" + "script>", value: '"><img onerror=alert(1)>' }],
    });

    expect(container.innerHTML).not.toContain("<" + "script>");
    expect(container.innerHTML).toContain("&lt;script&gt;");
  });

  it("applies max-width constraint to the layout grid", () => {
    const container = createContainer();

    renderContributionWidget(container, { grid, metrics, size: "lg" });

    expect(container.innerHTML).toContain("max-width:");
    expect(container.innerHTML).toContain("margin:0 auto");
  });

  it("applies responsive breakpoints", () => {
    const container = createContainer();

    renderContributionWidget(container, { grid, metrics, size: "md" });

    expect(container.innerHTML).toContain("@media (max-width: 920px)");
    expect(container.innerHTML).toContain("@media (max-width: 620px)");
  });

  it("renders legend when option is provided", () => {
    const container = createContainer();

    renderContributionWidget(container, {
      grid,
      metrics,
      legend: { less: "Less", more: "More" },
    });

    expect(container.innerHTML).toContain("streakr-widget__legend");
    expect(container.innerHTML).toContain("Less");
    expect(container.innerHTML).toContain("More");
    expect(container.innerHTML).toContain("streakr-widget__legend-scale");
    expect(container.innerHTML).toContain("var(--streakr-level-0)");
    expect(container.innerHTML).toContain("var(--streakr-level-4)");
  });

  it("does not render legend element when option is omitted", () => {
    const container = createContainer();

    renderContributionWidget(container, { grid, metrics });

    expect(container.innerHTML).not.toContain('class="streakr-widget__legend"');
  });

  it("escapes HTML in legend labels", () => {
    const container = createContainer();

    renderContributionWidget(container, {
      grid,
      metrics,
      legend: { less: "<Less>", more: '"More"' },
    });

    expect(container.innerHTML).not.toContain("<Less>");
    expect(container.innerHTML).toContain("&lt;Less&gt;");
    expect(container.innerHTML).toContain("&quot;More&quot;");
  });

  it("exposes level CSS variables in palette", () => {
    const container = createContainer();

    renderContributionWidget(container, { grid, metrics });

    expect(container.innerHTML).toContain("--streakr-level-0:");
    expect(container.innerHTML).toContain("--streakr-level-4:");
  });
});
