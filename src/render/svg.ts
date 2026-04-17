import type { CalendarGrid, Theme, ThemeColorScale, ThemeColorScheme } from "../types";
import { themes } from "./themes";

let renderSequence = 0;

interface ResolvedTheme {
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

/**
 * Renders a heatmap calendar as SVG inside the given container.
 */
export function renderSvgCalendar(
  container: HTMLElement,
  model: CalendarGrid,
  theme?: Theme,
): void {
  if (model.weeks.length === 0) {
    container.innerHTML = "";
    return;
  }

  const resolvedTheme = resolveTheme(theme);
  const svgId = `streakr-svg-${++renderSequence}`;
  const weeks = model.weeks.length;
  const width =
    resolvedTheme.padding * 2 +
    weeks * resolvedTheme.cellSize +
    Math.max(0, weeks - 1) * resolvedTheme.gap;
  const height = resolvedTheme.padding * 2 + 7 * resolvedTheme.cellSize + 6 * resolvedTheme.gap;

  const rects: string[] = [];

  for (let weekIndex = 0; weekIndex < model.weeks.length; weekIndex++) {
    const week = model.weeks[weekIndex];
    for (let dayIndex = 0; dayIndex < week.length; dayIndex++) {
      const cell = week[dayIndex];
      if (!cell) continue;

      const x = resolvedTheme.padding + weekIndex * (resolvedTheme.cellSize + resolvedTheme.gap);
      const y = resolvedTheme.padding + dayIndex * (resolvedTheme.cellSize + resolvedTheme.gap);
      const fill = resolvedTheme.colors[clampLevel(cell.level)];
      const title = `${cell.date}: ${cell.count} contribution${cell.count === 1 ? "" : "s"}`;

      if (resolvedTheme.colorScheme === "system") {
        rects.push(
          `<rect class="streakr-cell" x="${x}" y="${y}" width="${resolvedTheme.cellSize}" height="${resolvedTheme.cellSize}" rx="${resolvedTheme.borderRadius}" data-date="${escapeXml(cell.date)}" data-count="${cell.count}" data-level="${clampLevel(cell.level)}"><title>${escapeXml(title)}</title></rect>`,
        );
        continue;
      }

      rects.push(
        `<rect x="${x}" y="${y}" width="${resolvedTheme.cellSize}" height="${resolvedTheme.cellSize}" rx="${resolvedTheme.borderRadius}" fill="${escapeXml(fill)}" style="fill:${escapeXml(fill)};" data-date="${escapeXml(cell.date)}" data-count="${cell.count}" data-level="${clampLevel(cell.level)}"><title>${escapeXml(title)}</title></rect>`,
      );
    }
  }

  const inlineSvgStyle =
    resolvedTheme.colorScheme === "system"
      ? "display:block;color-scheme:light dark;"
      : `display:block;background:${escapeXml(resolvedTheme.background)};color:${escapeXml(
          resolvedTheme.textColor,
        )};`;

  const backgroundRect =
    resolvedTheme.colorScheme === "system"
      ? `<rect class="streakr-background" x="0" y="0" width="${width}" height="${height}" />`
      : `<rect x="0" y="0" width="${width}" height="${height}" fill="${escapeXml(
          resolvedTheme.background,
        )}" style="fill:${escapeXml(resolvedTheme.background)};" />`;

  container.innerHTML = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Contribution heatmap" data-streakr-id="${svgId}" style="${inlineSvgStyle}">`,
    resolvedTheme.colorScheme === "system" ? buildSystemThemeStyle(svgId, resolvedTheme) : "",
    backgroundRect,
    ...rects,
    "</svg>",
  ].join("");
}

function resolveTheme(theme?: Theme): ResolvedTheme {
  const base =
    theme?.colorScheme === "dark"
      ? themes.dark
      : theme?.colorScheme === "system"
        ? themes.system
        : themes.classicGreen;
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

function buildSystemThemeStyle(svgId: string, theme: ResolvedTheme): string {
  const selector = `svg[data-streakr-id="${escapeCss(svgId)}"]`;
  const lightRules = buildPaletteRules(selector, theme.colors, theme.background, theme.textColor);
  const darkRules = buildPaletteRules(
    selector,
    theme.darkColors,
    theme.darkBackground,
    theme.darkTextColor,
  );

  return `<style>${lightRules}@media (prefers-color-scheme: dark){${darkRules}}</style>`;
}

function buildPaletteRules(
  selector: string,
  colors: ThemeColorScale,
  background: string,
  textColor: string,
): string {
  const levelRules = colors
    .map(
      (fill, level) => `${selector} .streakr-cell[data-level="${level}"]{fill:${escapeCss(fill)};}`,
    )
    .join("");

  return `${selector}{background:${escapeCss(background)};color:${escapeCss(
    textColor,
  )};}${selector} .streakr-background{fill:${escapeCss(background)};}${levelRules}`;
}

function clampLevel(level: number): 0 | 1 | 2 | 3 | 4 {
  if (level <= 0) return 0;
  if (level >= 4) return 4;
  return level as 0 | 1 | 2 | 3;
}

function escapeCss(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
