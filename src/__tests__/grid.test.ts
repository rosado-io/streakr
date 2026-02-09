import { describe, it, expect } from "vitest";
import { buildCalendarGrid } from "../core/grid";

describe("buildCalendarGrid", () => {
  it("returns empty grid for empty input", () => {
    const result = buildCalendarGrid([]);
    expect(result).toEqual({ weeks: [], totalContributions: 0 });
  });
});
