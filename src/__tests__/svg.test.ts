import { describe, it, expect } from "vitest";
import { renderSvgCalendar } from "../render/svg";
import type { CalendarGrid, Theme } from "../types";

function createContainer(): HTMLElement {
  return { innerHTML: "" } as HTMLElement;
}

describe("renderSvgCalendar", () => {
  it("renders one SVG rect per non-null cell", () => {
    const container = createContainer();

    const model: CalendarGrid = {
      weeks: [
        [
          { date: "2025-06-01", count: 0, level: 0 },
          { date: "2025-06-02", count: 2, level: 2 },
          null,
          null,
          null,
          null,
          null,
        ],
        [null, { date: "2025-06-09", count: 4, level: 4 }, null, null, null, null, null],
      ],
      totalContributions: 6,
    };

    renderSvgCalendar(container, model);

    expect(container.innerHTML).toContain("<svg");
    expect(container.innerHTML).toContain('data-date="2025-06-01"');
    expect(container.innerHTML).toContain('data-date="2025-06-02"');
    expect(container.innerHTML).toContain('data-date="2025-06-09"');

    const dayRects = container.innerHTML.match(/data-date="/g) ?? [];
    expect(dayRects).toHaveLength(3);
  });

  it("includes a native tooltip title with date + count", () => {
    const container = createContainer();

    const model: CalendarGrid = {
      weeks: [[{ date: "2025-06-15", count: 1, level: 1 }, null, null, null, null, null, null]],
      totalContributions: 1,
    };

    renderSvgCalendar(container, model);
    expect(container.innerHTML).toContain("<title>2025-06-15: 1 contribution</title>");
  });

  it("applies custom theme colors, background and border radius", () => {
    const container = createContainer();

    const model: CalendarGrid = {
      weeks: [[{ date: "2025-06-15", count: 7, level: 3 }, null, null, null, null, null, null]],
      totalContributions: 7,
    };

    const customTheme: Theme = {
      colors: ["#f0f0f0", "#c0e4ff", "#7ec8ff", "#3ea6ff", "#0066cc"],
      background: "#111111",
      textColor: "#fafafa",
      borderRadius: 6,
    };

    renderSvgCalendar(container, model, customTheme);

    expect(container.innerHTML).toContain('fill="#3ea6ff"');
    expect(container.innerHTML).toContain('rx="6"');
    expect(container.innerHTML).toContain(
      'style="display:block;background:#111111;color:#fafafa;"',
    );
  });

  it("clears container when grid is empty", () => {
    const container = createContainer();
    container.innerHTML = "<div>stale</div>";

    renderSvgCalendar(container, { weeks: [], totalContributions: 0 });
    expect(container.innerHTML).toBe("");
  });
});
