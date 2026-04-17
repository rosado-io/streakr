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

  it("supports configurable spacing values from the theme", () => {
    const container = createContainer();

    const model: CalendarGrid = {
      weeks: [[{ date: "2025-06-15", count: 3, level: 2 }, null, null, null, null, null, null]],
      totalContributions: 3,
    };

    renderSvgCalendar(container, model, {
      colors: ["#f3f3f3", "#d4f0d2", "#95dc90", "#4faf59", "#2e7d32"],
      cellSize: 16,
      gap: 2,
      padding: 8,
      borderRadius: 4,
    });

    expect(container.innerHTML).toContain('width="32"');
    expect(container.innerHTML).toContain('height="128"');
    expect(container.innerHTML).toContain('x="8"');
    expect(container.innerHTML).toContain('y="8"');
    expect(container.innerHTML).toContain('width="16" height="16"');
  });

  it("renders a system theme with media-query driven dark mode rules", () => {
    const container = createContainer();

    const model: CalendarGrid = {
      weeks: [[{ date: "2025-06-15", count: 1, level: 1 }, null, null, null, null, null, null]],
      totalContributions: 1,
    };

    renderSvgCalendar(container, model, {
      colors: ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"],
      darkColors: ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"],
      background: "#ffffff",
      darkBackground: "#0d1117",
      textColor: "#24292e",
      darkTextColor: "#c9d1d9",
      colorScheme: "system",
    });

    expect(container.innerHTML).toContain("prefers-color-scheme: dark");
    expect(container.innerHTML).toContain('class="streakr-cell"');
    expect(container.innerHTML).toContain('class="streakr-background"');
    expect(container.innerHTML).toContain("color-scheme:light dark;");
  });

  it("clears container when grid is empty", () => {
    const container = createContainer();
    container.innerHTML = "<div>stale</div>";

    renderSvgCalendar(container, { weeks: [], totalContributions: 0 });
    expect(container.innerHTML).toBe("");
  });
});
