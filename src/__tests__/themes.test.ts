import { describe, it, expect } from "vitest";
import { themes } from "../render/themes";

describe("themes", () => {
  it("exports classicGreen and dark themes", () => {
    expect(themes.classicGreen).toBeDefined();
    expect(themes.dark).toBeDefined();
  });

  it("each theme has exactly 5 colors", () => {
    expect(themes.classicGreen.colors).toHaveLength(5);
    expect(themes.dark.colors).toHaveLength(5);
  });
});
