import { describe, it, expect } from "vitest";
import { normalizeEventsToDaily } from "../core/normalize";

describe("normalizeEventsToDaily", () => {
  it("returns empty array for empty input", () => {
    const result = normalizeEventsToDaily([]);
    expect(result).toEqual([]);
  });
});
