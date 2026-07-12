import { describe, it, expect } from "vitest";
import { buildCalendarGrid } from "../core/grid";
import type { ContributionDay, CalendarCell } from "../types";

function day(date: string, count: number): ContributionDay {
  return { date, count };
}

function countCells(weeks: (CalendarCell | null)[][]): number {
  return weeks.reduce((sum, week) => sum + week.filter((c) => c !== null).length, 0);
}

describe("buildCalendarGrid", () => {
  it("returns empty grid for empty input", () => {
    const result = buildCalendarGrid([]);
    expect(result).toEqual({ weeks: [], totalContributions: 0 });
  });

  it("builds a single-day grid", () => {
    const result = buildCalendarGrid([day("2025-06-15", 5)]);
    expect(result.totalContributions).toBe(5);
    expect(result.weeks).toHaveLength(1);
    expect(result.weeks[0][0]).toEqual({
      date: "2025-06-15",
      count: 5,
      level: 1,
    });
    for (let i = 1; i < 7; i++) {
      expect(result.weeks[0][i]).toBeNull();
    }
  });

  it("fills a full week (7 days)", () => {
    const input = [
      day("2025-06-16", 1),
      day("2025-06-17", 2),
      day("2025-06-18", 3),
      day("2025-06-19", 4),
      day("2025-06-20", 5),
      day("2025-06-21", 6),
      day("2025-06-22", 7),
    ];
    const result = buildCalendarGrid(input);
    expect(result.totalContributions).toBe(28);
    expect(countCells(result.weeks)).toBe(7);
  });

  it("pads the first week with nulls for days before startDate", () => {
    const result = buildCalendarGrid([day("2025-06-18", 1)]);
    expect(result.weeks[0][0]).toBeNull();
    expect(result.weeks[0][1]).toBeNull();
    expect(result.weeks[0][2]).toBeNull();
    const wed = result.weeks[0][3];
    expect(wed).not.toBeNull();
    expect(wed?.date).toBe("2025-06-18");
  });

  it("supports weekStartsOn = 1 (Monday)", () => {
    const result = buildCalendarGrid([day("2025-06-18", 1)], {
      weekStartsOn: 1,
    });
    expect(result.weeks[0][0]).toBeNull();
    expect(result.weeks[0][1]).toBeNull();
    const wed = result.weeks[0][2];
    expect(wed).not.toBeNull();
    expect(wed?.date).toBe("2025-06-18");
  });

  it("all weeks have exactly 7 elements", () => {
    const input: ContributionDay[] = [];
    for (let i = 1; i <= 14; i++) {
      input.push(day(`2025-06-${String(i).padStart(2, "0")}`, i));
    }
    const result = buildCalendarGrid(input);
    for (const week of result.weeks) {
      expect(week).toHaveLength(7);
    }
  });

  it("assigns intensity levels 0–4 based on the active-day distribution", () => {
    const input = [
      day("2025-06-15", 0),
      day("2025-06-16", 1),
      day("2025-06-17", 3),
      day("2025-06-18", 7),
      day("2025-06-19", 15),
      day("2025-06-20", 30),
      day("2025-06-21", 100),
    ];
    const result = buildCalendarGrid(input);
    const cells = result.weeks.flat().filter((c): c is CalendarCell => c !== null);
    const levelOf = (count: number) => cells.find((c) => c.count === count)?.level;

    expect(levelOf(0)).toBe(0);
    expect(levelOf(1)).toBe(1);
    expect(levelOf(7)).toBe(2);
    expect(levelOf(30)).toBe(3);
    expect(levelOf(100)).toBe(4);
  });

  it("level 0 for all-zero input", () => {
    const input = [day("2025-06-15", 0), day("2025-06-16", 0), day("2025-06-17", 0)];
    const result = buildCalendarGrid(input);
    const cells = result.weeks.flat().filter((c): c is CalendarCell => c !== null);
    expect(cells.every((c) => c.level === 0)).toBe(true);
  });

  it("respects custom startDate and endDate options", () => {
    const input = [day("2025-06-10", 1), day("2025-06-15", 5), day("2025-06-20", 3)];
    const result = buildCalendarGrid(input, {
      startDate: "2025-06-12",
      endDate: "2025-06-18",
    });
    const cells = result.weeks.flat().filter((c): c is CalendarCell => c !== null);
    expect(cells).toHaveLength(7);
    const jun15 = cells.find((c) => c.date === "2025-06-15");
    expect(jun15?.count).toBe(5);
    const jun12 = cells.find((c) => c.date === "2025-06-12");
    expect(jun12?.count).toBe(0);
  });

  it("totalContributions sums all cell counts", () => {
    const input = [day("2025-06-15", 3), day("2025-06-16", 7), day("2025-06-17", 2)];
    const result = buildCalendarGrid(input);
    expect(result.totalContributions).toBe(12);
  });

  it("handles a full month correctly", () => {
    const input: ContributionDay[] = [];
    for (let i = 1; i <= 30; i++) {
      input.push(day(`2025-06-${String(i).padStart(2, "0")}`, 1));
    }
    const result = buildCalendarGrid(input);
    expect(result.totalContributions).toBe(30);
    expect(countCells(result.weeks)).toBe(30);
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
    const input = [
      day("2025-06-10", 100),
      day("2025-06-12", 1),
      day("2025-06-14", 7),
      day("2025-06-16", 30),
      day("2025-06-20", 50),
    ];
    const result = buildCalendarGrid(input, {
      startDate: "2025-06-11",
      endDate: "2025-06-17",
    });
    const cells = result.weeks.flat().filter((c): c is CalendarCell => c !== null);
    const jun16 = cells.find((c) => c.date === "2025-06-16");
    // Thresholds from the filtered active counts [1, 7, 30] put 30 at level 3;
    // computed from the full input [1, 7, 30, 50, 100] it would be level 2.
    expect(jun16?.level).toBe(3);
  });
});
