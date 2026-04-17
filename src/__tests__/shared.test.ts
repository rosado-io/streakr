import { describe, it, expect } from "vitest";
import { escapeCss, escapeHtml, clampLevel, resolveTheme } from "../render/shared";
import { themes } from "../render/themes";

describe("escapeCss", () => {
  it("escapes backslashes", () => {
    expect(escapeCss("a\\b")).toBe("a\\\\b");
  });

  it("escapes double quotes", () => {
    expect(escapeCss('a"b')).toBe('a\\"b');
  });

  it("returns plain strings unchanged", () => {
    expect(escapeCss("hello")).toBe("hello");
  });
});

describe("escapeHtml", () => {
  it("escapes ampersands", () => {
    expect(escapeHtml("a&b")).toBe("a&amp;b");
  });

  it("escapes angle brackets", () => {
    expect(escapeHtml("<div>")).toBe("&lt;div&gt;");
  });

  it("escapes quotes", () => {
    expect(escapeHtml(`"it's"`)).toBe("&quot;it&#39;s&quot;");
  });

  it("handles strings with no special characters", () => {
    expect(escapeHtml("hello world")).toBe("hello world");
  });

  it("escapes all special characters in one string", () => {
    expect(escapeHtml(`<a href="x">&'`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&#39;");
  });
});

describe("clampLevel", () => {
  it("clamps negative values to 0", () => {
    expect(clampLevel(-1)).toBe(0);
    expect(clampLevel(-100)).toBe(0);
  });

  it("clamps values above 4 to 4", () => {
    expect(clampLevel(5)).toBe(4);
    expect(clampLevel(100)).toBe(4);
  });

  it("returns valid levels unchanged", () => {
    expect(clampLevel(0)).toBe(0);
    expect(clampLevel(1)).toBe(1);
    expect(clampLevel(2)).toBe(2);
    expect(clampLevel(3)).toBe(3);
    expect(clampLevel(4)).toBe(4);
  });
});

describe("resolveTheme", () => {
  it("defaults to classicGreen when no theme provided", () => {
    const resolved = resolveTheme();
    expect(resolved.colors).toEqual(themes.classicGreen.colors);
    expect(resolved.colorScheme).toBe("light");
  });

  it("resolves dark theme via colorScheme", () => {
    const resolved = resolveTheme({ colors: themes.dark.colors, colorScheme: "dark" });
    expect(resolved.background).toBe(themes.dark.background);
    expect(resolved.colorScheme).toBe("dark");
  });

  it("resolves system theme via colorScheme", () => {
    const resolved = resolveTheme({ colors: themes.system.colors, colorScheme: "system" });
    expect(resolved.colorScheme).toBe("system");
    expect(resolved.darkColors).toBeDefined();
  });

  it("merges custom theme properties with base defaults", () => {
    const resolved = resolveTheme({
      colors: ["#a", "#b", "#c", "#d", "#e"],
      cellSize: 20,
    });
    expect(resolved.colors).toEqual(["#a", "#b", "#c", "#d", "#e"]);
    expect(resolved.cellSize).toBe(20);
    expect(resolved.gap).toBe(themes.classicGreen.gap);
  });

  it("always includes darkColors from dark base", () => {
    const resolved = resolveTheme();
    expect(resolved.darkColors).toEqual(themes.dark.colors);
  });
});
