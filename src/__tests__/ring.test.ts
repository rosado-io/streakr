import { describe, expect, it } from "vitest";
import { parseLocalDate } from "../component/calendar";
import { findDayByDateKey } from "../component/render/ring";
import type { LeveledDay } from "../component/types";

const lday = (dateKey: string, total: number): LeveledDay => ({
  date: parseLocalDate(dateKey),
  dateKey,
  total,
  level: 0,
  sources: {},
});

describe("parseLocalDate", () => {
  it("parses the key as a local calendar day", () => {
    const date = parseLocalDate("2026-12-31");
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(11);
    expect(date.getDate()).toBe(31);
    expect(date.getHours()).toBe(0);
  });
});

describe("findDayByDateKey", () => {
  it("returns the matching day", () => {
    const days = [lday("2026-01-01", 1), lday("2026-01-02", 2)];
    expect(findDayByDateKey(days, "2026-01-02").total).toBe(2);
  });

  it("falls back to the first day when the key is missing", () => {
    const days = [lday("2026-01-01", 1)];
    expect(findDayByDateKey(days, "2026-03-03").dateKey).toBe("2026-01-01");
  });

  it("synthesizes an empty local day for an empty list", () => {
    const day = findDayByDateKey([], "2026-06-15");
    expect(day.dateKey).toBe("2026-06-15");
    expect(day.total).toBe(0);
    expect(day.level).toBe(0);
    expect(day.date.getFullYear()).toBe(2026);
    expect(day.date.getMonth()).toBe(5);
    expect(day.date.getDate()).toBe(15);
  });
});
