import { describe, it, expect } from "vitest";
import { computeStreaks } from "../core/streaks";
import type { ContributionDay } from "../types";

function day(date: string, count: number): ContributionDay {
  return { date, count };
}

describe("computeStreaks", () => {
  it("returns zeros for empty input", () => {
    expect(computeStreaks([])).toEqual({
      total: 0,
      bestStreak: 0,
      currentStreak: 0,
    });
  });

  it("handles a single active day", () => {
    const result = computeStreaks([day("2025-06-15", 5)]);
    expect(result).toEqual({
      total: 5,
      bestStreak: 1,
      currentStreak: 1,
    });
  });

  it("handles a single inactive day", () => {
    const result = computeStreaks([day("2025-06-15", 0)]);
    expect(result).toEqual({
      total: 0,
      bestStreak: 0,
      currentStreak: 0,
    });
  });

  it("computes a simple consecutive streak", () => {
    const input = [day("2025-06-01", 3), day("2025-06-02", 1), day("2025-06-03", 2)];
    const result = computeStreaks(input);
    expect(result).toEqual({
      total: 6,
      bestStreak: 3,
      currentStreak: 3,
    });
  });

  it("resets streak on a zero-count day", () => {
    const input = [day("2025-06-01", 3), day("2025-06-02", 0), day("2025-06-03", 2)];
    const result = computeStreaks(input);
    expect(result).toEqual({
      total: 5,
      bestStreak: 1,
      currentStreak: 1,
    });
  });

  it("tracks best streak separately from current streak", () => {
    const input = [
      day("2025-06-01", 1),
      day("2025-06-02", 1),
      day("2025-06-03", 1),
      day("2025-06-04", 0),
      day("2025-06-05", 1),
      day("2025-06-06", 1),
    ];
    const result = computeStreaks(input);
    expect(result).toEqual({
      total: 5,
      bestStreak: 3,
      currentStreak: 2,
    });
  });

  it("current streak is 0 when last day is inactive", () => {
    const input = [day("2025-06-01", 5), day("2025-06-02", 3), day("2025-06-03", 0)];
    const result = computeStreaks(input);
    expect(result).toEqual({
      total: 8,
      bestStreak: 2,
      currentStreak: 0,
    });
  });

  it("best and current can be equal", () => {
    const input = [
      day("2025-06-01", 1),
      day("2025-06-02", 2),
      day("2025-06-03", 3),
      day("2025-06-04", 4),
      day("2025-06-05", 5),
    ];
    const result = computeStreaks(input);
    expect(result).toEqual({
      total: 15,
      bestStreak: 5,
      currentStreak: 5,
    });
  });

  it("handles multiple zero gaps", () => {
    const input = [
      day("2025-06-01", 1),
      day("2025-06-02", 0),
      day("2025-06-03", 1),
      day("2025-06-04", 1),
      day("2025-06-05", 0),
      day("2025-06-06", 0),
      day("2025-06-07", 1),
    ];
    const result = computeStreaks(input);
    expect(result).toEqual({
      total: 4,
      bestStreak: 2,
      currentStreak: 1,
    });
  });

  it("handles all zeros", () => {
    const input = [day("2025-06-01", 0), day("2025-06-02", 0), day("2025-06-03", 0)];
    const result = computeStreaks(input);
    expect(result).toEqual({
      total: 0,
      bestStreak: 0,
      currentStreak: 0,
    });
  });

  it("handles a realistic year scenario", () => {
    const days: ContributionDay[] = [];
    let d = 1;

    for (let i = 0; i < 10; i++) days.push(day(`2025-01-${String(d++).padStart(2, "0")}`, 2));
    for (let i = 0; i < 3; i++) days.push(day(`2025-01-${String(d++).padStart(2, "0")}`, 0));
    for (let i = 0; i < 5; i++) days.push(day(`2025-01-${String(d++).padStart(2, "0")}`, 1));
    for (let i = 0; i < 2; i++) days.push(day(`2025-01-${String(d++).padStart(2, "0")}`, 0));
    for (let i = 0; i < 7; i++) days.push(day(`2025-01-${String(d++).padStart(2, "0")}`, 3));

    const result = computeStreaks(days);
    expect(result.bestStreak).toBe(10);
    expect(result.currentStreak).toBe(7);
    expect(result.total).toBe(46);
  });
});
