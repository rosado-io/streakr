import { describe, it, expect } from "vitest";
import { computeStreaks } from "../core/streaks";

describe("computeStreaks", () => {
  it("returns zeroed result for empty input", () => {
    const result = computeStreaks([]);
    expect(result).toEqual({ total: 0, bestStreak: 0, currentStreak: 0 });
  });
});
