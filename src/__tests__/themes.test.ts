import { describe, it, expect } from "vitest";
import { createCssVarTheme, themes } from "../render/themes";

describe("themes", () => {
  it("exports classicGreen, dark and system themes", () => {
    expect(themes.classicGreen).toBeDefined();
    expect(themes.dark).toBeDefined();
    expect(themes.system).toBeDefined();
  });

  it("each theme has exactly 5 colors", () => {
    expect(themes.classicGreen.colors).toHaveLength(5);
    expect(themes.dark.colors).toHaveLength(5);
    expect(themes.system.colors).toHaveLength(5);
    expect(themes.system.darkColors).toHaveLength(5);
  });

  it("can create a CSS variable driven theme", () => {
    const theme = createCssVarTheme({ prefix: "demo" });

    expect(theme.colorScheme).toBe("system");
    expect(theme.colors[0]).toBe("var(--demo-level-0, #ebedf0)");
    expect(theme.darkColors?.[4]).toBe("var(--demo-level-dark-4, #39d353)");
    expect(theme.background).toBe("var(--demo-background, #ffffff)");
    expect(theme.darkBackground).toBe("var(--demo-background-dark, #0d1117)");
  });
});
