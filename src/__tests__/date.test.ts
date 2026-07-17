import { describe, it, expect } from "vitest";
import { validateDateRange } from "../core/date";
import { toCanonicalDays } from "../core/normalize";

describe("validateDateRange", () => {
  it("accepts valid date ranges", () => {
    expect(() => validateDateRange("2025-01-01", "2025-12-31")).not.toThrow();
  });

  it("accepts same start and end date", () => {
    expect(() => validateDateRange("2025-06-15", "2025-06-15")).not.toThrow();
  });

  it("throws on invalid start date", () => {
    expect(() => validateDateRange("bad", "2025-06-15")).toThrow("Invalid start date");
  });

  it("throws on impossible calendar dates", () => {
    expect(() => validateDateRange("2025-02-30", "2025-06-15")).toThrow("Invalid start date");
  });

  it("throws on invalid end date", () => {
    expect(() => validateDateRange("2025-06-15", "bad")).toThrow("Invalid end date");
  });

  it("throws when start is after end", () => {
    expect(() => validateDateRange("2025-06-20", "2025-06-10")).toThrow("Invalid range");
  });
});

describe("toCanonicalDays", () => {
  it("normalizes non-empty days", () => {
    const result = toCanonicalDays([{ date: "2025-06-15", count: 3 }], "2025-06-15", "2025-06-15");
    expect(result).toHaveLength(1);
    expect(result[0]!.count).toBe(3);
  });

  it("fills missing requested boundary days for non-empty days", () => {
    const result = toCanonicalDays([{ date: "2025-06-11", count: 3 }], "2025-06-10", "2025-06-12");
    expect(result).toEqual([
      { date: "2025-06-10", count: 0 },
      { date: "2025-06-11", count: 3 },
      { date: "2025-06-12", count: 0 },
    ]);
  });

  it("returns zero-filled series for empty days with same start/end", () => {
    const result = toCanonicalDays([], "2025-06-15", "2025-06-15");
    expect(result).toHaveLength(1);
    expect(result[0]!.count).toBe(0);
  });

  it("returns zero-filled range for empty days with different dates", () => {
    const result = toCanonicalDays([], "2025-06-10", "2025-06-12");
    expect(result).toHaveLength(3);
    expect(result.every((d) => d.count === 0)).toBe(true);
  });
});
