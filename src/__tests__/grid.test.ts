import { describe, it, expect } from "vitest";
import { buildCalendarGrid } from "../core/grid";
import type { ContributionDay, CalendarCell } from "../types";

/** Helper to create a ContributionDay. */
function day(date: string, count: number): ContributionDay {
  return { date, count };
}

/** Helper to count non-null cells across all weeks. */
function countCells(weeks: (CalendarCell | null)[][]): number {
  return weeks.reduce((sum, week) => sum + week.filter((c) => c !== null).length, 0);
}

describe("buildCalendarGrid", () => {
  it("returns empty grid for empty input", () => {
    const result = buildCalendarGrid([]);
    expect(result).toEqual({ weeks: [], totalContributions: 0 });
  });

  it("builds a single-day grid", () => {
    // 2025-06-15 is a Sunday (day 0)
    const result = buildCalendarGrid([day("2025-06-15", 5)]);
    expect(result.totalContributions).toBe(5);
    expect(result.weeks).toHaveLength(1);
    // Sunday = first cell, rest are null padding
    expect(result.weeks[0][0]).toEqual({
      date: "2025-06-15",
      count: 5,
      level: 4,
    });
    for (let i = 1; i < 7; i++) {
      expect(result.weeks[0][i]).toBeNull();
    }
  });

  it("fills a full week (7 days)", () => {
    // Mon Jun 16 to Sun Jun 22, 2025
    const input = [
      day("2025-06-16", 1), // Mon
      day("2025-06-17", 2), // Tue
      day("2025-06-18", 3), // Wed
      day("2025-06-19", 4), // Thu
      day("2025-06-20", 5), // Fri
      day("2025-06-21", 6), // Sat
      day("2025-06-22", 7), // Sun
    ];
    const result = buildCalendarGrid(input);
    expect(result.totalContributions).toBe(28);

    // Sun starts week → Mon is index 1 → first cell (Sun before Mon) is null
    // The first week has: [null, Mon, Tue, Wed, Thu, Fri, Sat]
    // Second week has: [Sun, null*6]
    const totalCells = countCells(result.weeks);
    expect(totalCells).toBe(7);
  });

  it("pads the first week with nulls for days before startDate", () => {
    // 2025-06-18 is Wednesday (day 3 in Sun-start)
    const result = buildCalendarGrid([day("2025-06-18", 1)]);
    // First 3 positions (Sun, Mon, Tue) should be null
    expect(result.weeks[0][0]).toBeNull(); // Sun
    expect(result.weeks[0][1]).toBeNull(); // Mon
    expect(result.weeks[0][2]).toBeNull(); // Tue
    const wed = result.weeks[0][3];
    expect(wed).not.toBeNull();
    expect(wed?.date).toBe("2025-06-18");
  });

  it("supports weekStartsOn = 1 (Monday)", () => {
    // 2025-06-18 is Wednesday
    // With Monday start: Mon=0, Tue=1, Wed=2
    const result = buildCalendarGrid([day("2025-06-18", 1)], {
      weekStartsOn: 1,
    });
    expect(result.weeks[0][0]).toBeNull(); // Mon
    expect(result.weeks[0][1]).toBeNull(); // Tue
    const wed = result.weeks[0][2];
    expect(wed).not.toBeNull();
    expect(wed?.date).toBe("2025-06-18");
  });

  it("all weeks have exactly 7 elements", () => {
    // 14 days = should produce full weeks
    const input: ContributionDay[] = [];
    for (let i = 1; i <= 14; i++) {
      input.push(day(`2025-06-${String(i).padStart(2, "0")}`, i));
    }
    const result = buildCalendarGrid(input);
    for (const week of result.weeks) {
      expect(week).toHaveLength(7);
    }
  });

  it("assigns intensity levels 0–4 based on quartiles", () => {
    // Counts: 0, 1, 5, 8, 10 → max=10, q1=3, q2=5, q3=8
    const input = [
      day("2025-06-15", 0), // level 0
      day("2025-06-16", 1), // level 1 (< q1=3)
      day("2025-06-17", 5), // level 3 (>= q2=5, < q3=8)
      day("2025-06-18", 8), // level 4 (>= q3=8)
      day("2025-06-19", 10), // level 4
    ];
    const result = buildCalendarGrid(input);

    // Collect all non-null cells
    const cells = result.weeks.flat().filter((c): c is CalendarCell => c !== null);

    const zeroDay = cells.find((c) => c.count === 0);
    expect(zeroDay?.level).toBe(0);

    const maxDay = cells.find((c) => c.count === 10);
    expect(maxDay?.level).toBe(4);
  });

  it("level 0 for all-zero input", () => {
    const input = [day("2025-06-15", 0), day("2025-06-16", 0), day("2025-06-17", 0)];
    const result = buildCalendarGrid(input);
    const cells = result.weeks.flat().filter((c): c is CalendarCell => c !== null);
    expect(cells.every((c) => c.level === 0)).toBe(true);
  });

  it("respects custom startDate and endDate options", () => {
    const input = [day("2025-06-10", 1), day("2025-06-15", 5), day("2025-06-20", 3)];
    // Only include days within 12–18
    const result = buildCalendarGrid(input, {
      startDate: "2025-06-12",
      endDate: "2025-06-18",
    });
    // Should have exactly 7 date cells (Jun 12–18)
    const cells = result.weeks.flat().filter((c): c is CalendarCell => c !== null);
    expect(cells).toHaveLength(7);
    // Jun 15 should have count 5 (from input), others 0
    const jun15 = cells.find((c) => c.date === "2025-06-15");
    expect(jun15?.count).toBe(5);
    // Jun 12 not in input → count 0
    const jun12 = cells.find((c) => c.date === "2025-06-12");
    expect(jun12?.count).toBe(0);
  });

  it("totalContributions sums all cell counts", () => {
    const input = [day("2025-06-15", 3), day("2025-06-16", 7), day("2025-06-17", 2)];
    const result = buildCalendarGrid(input);
    expect(result.totalContributions).toBe(12);
  });

  it("handles a full month correctly", () => {
    // June 2025: 30 days, starts on Sunday
    const input: ContributionDay[] = [];
    for (let i = 1; i <= 30; i++) {
      input.push(day(`2025-06-${String(i).padStart(2, "0")}`, 1));
    }
    const result = buildCalendarGrid(input);
    expect(result.totalContributions).toBe(30);
    const totalCells = countCells(result.weeks);
    expect(totalCells).toBe(30);
    // June 1 is Sunday → first cell is not null
    const firstCell = result.weeks[0][0];
    expect(firstCell).not.toBeNull();
    expect(firstCell?.date).toBe("2025-06-01");
  });

  it("returns empty grid for inverted date range", () => {
    const input = [day("2025-06-15", 5)];
    const result = buildCalendarGrid(input, {
      startDate: "2025-06-20",
      endDate: "2025-06-10",
    });
    expect(result).toEqual({ weeks: [], totalContributions: 0 });
  });

  it("scales intensity levels to the filtered range, not all input", () => {
    // Full input has max=100, but filtered range (Jun 12-18) max=5
    const input = [day("2025-06-10", 100), day("2025-06-15", 5), day("2025-06-20", 50)];
    const result = buildCalendarGrid(input, {
      startDate: "2025-06-12",
      endDate: "2025-06-18",
    });
    const cells = result.weeks.flat().filter((c): c is CalendarCell => c !== null);
    // Jun 15 count=5 should be level 4 (max in range), not level 1 (if max were 100)
    const jun15 = cells.find((c) => c.date === "2025-06-15");
    expect(jun15?.level).toBe(4);
  });
});
