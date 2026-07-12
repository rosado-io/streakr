import { describe, it, expect } from "vitest";
import { levelize } from "../component/metrics";
import { buildCalendarGrid } from "../core/grid";
import type { StreakrDay, ContributionDay, StreakrLeveledDay } from "../types";

function sday(date: string, total: number): StreakrDay {
  return { date: new Date(`${date}T00:00:00`), total };
}

describe("levelize", () => {
  it("assigns level 0 to every day when there are no contributions", () => {
    const days = [sday("2025-06-15", 0), sday("2025-06-16", 0), sday("2025-06-17", 0)];
    const leveled = levelize(days);
    expect(leveled).toHaveLength(3);
    expect(leveled.every((d) => d.level === 0)).toBe(true);
  });

  it("assigns levels 0–4 from the active-day distribution", () => {
    const days = [
      sday("2025-06-15", 0),
      sday("2025-06-16", 1),
      sday("2025-06-17", 3),
      sday("2025-06-18", 7),
      sday("2025-06-19", 15),
      sday("2025-06-20", 30),
      sday("2025-06-21", 100),
    ];
    const byTotal = new Map<number, StreakrLeveledDay["level"]>(
      levelize(days).map((d) => [d.total, d.level]),
    );

    expect(byTotal.get(0)).toBe(0);
    expect(byTotal.get(1)).toBe(1);
    expect(byTotal.get(7)).toBe(2);
    expect(byTotal.get(30)).toBe(3);
    expect(byTotal.get(100)).toBe(4);
  });

  it("preserves day fields and returns levels in input order", () => {
    const days = [
      sday("2025-06-16", 1),
      sday("2025-06-17", 3),
      sday("2025-06-18", 7),
      sday("2025-06-19", 15),
      sday("2025-06-20", 30),
      sday("2025-06-21", 100),
    ];
    const leveled = levelize(days);
    expect(leveled.map((d) => d.date.toISOString().slice(0, 10))).toEqual([
      "2025-06-16",
      "2025-06-17",
      "2025-06-18",
      "2025-06-19",
      "2025-06-20",
      "2025-06-21",
    ]);
    expect(leveled.every((d) => d.sources === undefined)).toBe(true);
  });

  it("produces the same levels as buildCalendarGrid for the same counts", () => {
    const counts = [0, 1, 3, 7, 15, 30, 100];
    const streakDays: StreakrDay[] = counts.map((c, i) => sday(`2025-06-${16 + i}`, c));
    const contributionDays: ContributionDay[] = counts.map((c, i) => ({
      date: `2025-06-${16 + i}`,
      count: c,
    }));

    const leveled = levelize(streakDays);
    const grid = buildCalendarGrid(contributionDays);
    const gridCells = grid.weeks.flat().filter((c): c is NonNullable<typeof c> => c !== null);

    counts.forEach((_, i) => {
      const dateStr = `2025-06-${16 + i}`;
      const gridLevel = gridCells.find((c) => c.date === dateStr)?.level;
      expect(gridLevel).toBe(leveled[i].level);
    });
  });
});
