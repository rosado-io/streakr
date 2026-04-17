import type { Theme, ThemeColorScale, ThemeColorScheme } from "../types";

const DEFAULT_CELL_SIZE = 12;
const DEFAULT_GAP = 3;
const DEFAULT_PADDING = 12;

/** Classic green theme (GitHub-style). */
const classicGreen: Theme = {
  colors: ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"],
  background: "#ffffff",
  textColor: "#24292e",
  borderRadius: 2,
  cellSize: DEFAULT_CELL_SIZE,
  gap: DEFAULT_GAP,
  padding: DEFAULT_PADDING,
  colorScheme: "light",
};

/** Dark theme. */
const dark: Theme = {
  colors: ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"],
  background: "#0d1117",
  textColor: "#c9d1d9",
  borderRadius: 2,
  cellSize: DEFAULT_CELL_SIZE,
  gap: DEFAULT_GAP,
  padding: DEFAULT_PADDING,
  colorScheme: "dark",
};

/** Automatic light/dark theme that follows the user's system preference. */
const system: Theme = {
  colors: classicGreen.colors,
  darkColors: dark.colors,
  background: classicGreen.background,
  darkBackground: dark.background,
  textColor: classicGreen.textColor,
  darkTextColor: dark.textColor,
  borderRadius: 2,
  cellSize: DEFAULT_CELL_SIZE,
  gap: DEFAULT_GAP,
  padding: DEFAULT_PADDING,
  colorScheme: "system",
};

/** Built-in theme presets. */
export const themes = {
  classicGreen,
  dark,
  system,
} as const;

export interface CssVarThemeOptions {
  /** CSS variable prefix. `streakr` becomes `--streakr-level-0`, etc. */
  prefix?: string;
  /** Light-mode fallback theme values. */
  fallback?: Theme;
  /** Dark-mode fallback theme values. */
  darkFallback?: Theme;
  /** Resolution mode for the generated theme. */
  colorScheme?: ThemeColorScheme;
}

/**
 * Creates a theme backed by CSS custom properties so host apps can skin the
 * heatmap without rebuilding the SVG.
 */
export function createCssVarTheme(options: CssVarThemeOptions = {}): Theme {
  const prefix = sanitizePrefix(options.prefix ?? "streakr");
  const fallback = options.fallback ?? classicGreen;
  const darkFallback = options.darkFallback ?? dark;

  return {
    colors: buildScale(prefix, "level", fallback.colors),
    darkColors: buildScale(prefix, "level-dark", darkFallback.colors),
    background: cssVar(prefix, "background", fallback.background ?? "#ffffff"),
    darkBackground: cssVar(prefix, "background-dark", darkFallback.background ?? "#0d1117"),
    textColor: cssVar(prefix, "text", fallback.textColor ?? "#24292e"),
    darkTextColor: cssVar(prefix, "text-dark", darkFallback.textColor ?? "#c9d1d9"),
    borderRadius: fallback.borderRadius ?? DEFAULT_GAP,
    cellSize: fallback.cellSize ?? DEFAULT_CELL_SIZE,
    gap: fallback.gap ?? DEFAULT_GAP,
    padding: fallback.padding ?? DEFAULT_PADDING,
    colorScheme: options.colorScheme ?? "system",
  };
}

function buildScale(
  prefix: string,
  key: string,
  fallback: ThemeColorScale,
): ThemeColorScale {
  return fallback.map((value, index) => cssVar(prefix, `${key}-${index}`, value)) as ThemeColorScale;
}

function cssVar(prefix: string, name: string, fallback: string): string {
  return `var(--${prefix}-${name}, ${fallback})`;
}

function sanitizePrefix(prefix: string): string {
  return prefix.trim().replace(/[^a-zA-Z0-9-_]/g, "-");
}
