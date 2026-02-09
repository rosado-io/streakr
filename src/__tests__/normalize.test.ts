import { describe, it, expect } from "vitest";
import { normalizeEventsToDaily } from "../core/normalize";
import type { ContributionDay } from "../types";

describe("normalizeEventsToDaily", () => {
  it("returns empty array for empty input", () => {
    expect(normalizeEventsToDaily([])).toEqual([]);
  });

  it("returns single-day input unchanged", () => {
    const input: ContributionDay[] = [{ date: "2025-06-15", count: 3 }];
    const result = normalizeEventsToDaily(input);
    expect(result).toEqual([{ date: "2025-06-15", count: 3 }]);
  });

  it("sorts unsorted input chronologically", () => {
    const input: ContributionDay[] = [
      { date: "2025-06-17", count: 1 },
      { date: "2025-06-15", count: 2 },
      { date: "2025-06-16", count: 3 },
    ];
    const result = normalizeEventsToDaily(input);
    expect(result.map((d) => d.date)).toEqual(["2025-06-15", "2025-06-16", "2025-06-17"]);
  });

  it("fills gaps with zero-count days", () => {
    const input: ContributionDay[] = [
      { date: "2025-06-10", count: 5 },
      { date: "2025-06-13", count: 2 },
    ];
    const result = normalizeEventsToDaily(input);
    expect(result).toEqual([
      { date: "2025-06-10", count: 5 },
      { date: "2025-06-11", count: 0 },
      { date: "2025-06-12", count: 0 },
      { date: "2025-06-13", count: 2 },
    ]);
  });

  it("merges duplicate dates by summing counts", () => {
    const input: ContributionDay[] = [
      { date: "2025-06-15", count: 3 },
      { date: "2025-06-15", count: 7 },
    ];
    const result = normalizeEventsToDaily(input);
    expect(result).toEqual([{ date: "2025-06-15", count: 10 }]);
  });

  it("merges sources across duplicate dates", () => {
    const input: ContributionDay[] = [
      { date: "2025-06-15", count: 3, sources: { github: 3 } },
      { date: "2025-06-15", count: 2, sources: { gitlab: 2 } },
    ];
    const result = normalizeEventsToDaily(input);
    expect(result).toEqual([
      {
        date: "2025-06-15",
        count: 5,
        sources: { github: 3, gitlab: 2 },
      },
    ]);
  });

  it("sums same-source counts on duplicate dates", () => {
    const input: ContributionDay[] = [
      { date: "2025-06-15", count: 3, sources: { github: 3 } },
      { date: "2025-06-15", count: 4, sources: { github: 4 } },
    ];
    const result = normalizeEventsToDaily(input);
    expect(result).toEqual([
      {
        date: "2025-06-15",
        count: 7,
        sources: { github: 7 },
      },
    ]);
  });

  it("handles mix of entries with and without sources", () => {
    const input: ContributionDay[] = [
      { date: "2025-06-15", count: 3, sources: { github: 3 } },
      { date: "2025-06-15", count: 2 },
    ];
    const result = normalizeEventsToDaily(input);
    expect(result).toHaveLength(1);
    expect(result[0].count).toBe(5);
    expect(result[0].sources).toEqual({ github: 3 });
  });

  it("does not add sources property to gap-filled days", () => {
    const input: ContributionDay[] = [
      { date: "2025-06-10", count: 1, sources: { github: 1 } },
      { date: "2025-06-12", count: 2, sources: { gitlab: 2 } },
    ];
    const result = normalizeEventsToDaily(input);
    expect(result[1]).toEqual({ date: "2025-06-11", count: 0 });
    expect(result[1].sources).toBeUndefined();
  });

  it("handles a full realistic scenario", () => {
    const input: ContributionDay[] = [
      { date: "2025-01-03", count: 1, sources: { github: 1 } },
      { date: "2025-01-01", count: 5, sources: { github: 3, gitlab: 2 } },
      { date: "2025-01-01", count: 1, sources: { github: 1 } },
      { date: "2025-01-05", count: 2 },
    ];
    const result = normalizeEventsToDaily(input);
    expect(result).toEqual([
      {
        date: "2025-01-01",
        count: 6,
        sources: { github: 4, gitlab: 2 },
      },
      { date: "2025-01-02", count: 0 },
      { date: "2025-01-03", count: 1, sources: { github: 1 } },
      { date: "2025-01-04", count: 0 },
      { date: "2025-01-05", count: 2 },
    ]);
  });

  it("accepts timezone parameter without error", () => {
    const input: ContributionDay[] = [{ date: "2025-06-15", count: 1 }];
    const result = normalizeEventsToDaily(input, "America/Chicago");
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("2025-06-15");
  });
});
