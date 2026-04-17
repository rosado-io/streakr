import type { Theme, ThemeColorScale, ThemeColorScheme } from "../types";
import { themes } from "./themes";

export interface ResolvedTheme {
  colors: ThemeColorScale;
  darkColors: ThemeColorScale;
  background: string;
  darkBackground: string;
  textColor: string;
  darkTextColor: string;
  borderRadius: number;
  cellSize: number;
  gap: number;
  padding: number;
  colorScheme: ThemeColorScheme;
}

const THEME_MAP: Record<string, Theme> = {
  dark: themes.dark,
  system: themes.system,
};

export function resolveTheme(theme?: Theme): ResolvedTheme {
  const base = THEME_MAP[theme?.colorScheme ?? ""] ?? themes.classicGreen;
  const darkBase = themes.dark;

  return {
    colors: theme?.colors ?? base.colors,
    darkColors: theme?.darkColors ?? darkBase.colors,
    background: theme?.background ?? base.background ?? "#ffffff",
    darkBackground: theme?.darkBackground ?? darkBase.background ?? "#0d1117",
    textColor: theme?.textColor ?? base.textColor ?? "#24292e",
    darkTextColor: theme?.darkTextColor ?? darkBase.textColor ?? "#c9d1d9",
    borderRadius: theme?.borderRadius ?? base.borderRadius ?? 2,
    cellSize: theme?.cellSize ?? base.cellSize ?? 12,
    gap: theme?.gap ?? base.gap ?? 3,
    padding: theme?.padding ?? base.padding ?? 12,
    colorScheme: theme?.colorScheme ?? base.colorScheme ?? "light",
  };
}

export function escapeCss(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const clampLevel = (level: number): 0 | 1 | 2 | 3 | 4 =>
  Math.max(0, Math.min(4, level)) as 0 | 1 | 2 | 3 | 4;
