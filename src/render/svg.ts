import type { CalendarGrid, Theme } from "../types";
import { themes } from "./themes";

const CELL_SIZE = 12;
const CELL_GAP = 3;
const PADDING = 12;

interface ResolvedTheme {
  colors: [string, string, string, string, string];
  background: string;
  textColor: string;
  borderRadius: number;
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
  const weeks = model.weeks.length;
  const width = PADDING * 2 + weeks * CELL_SIZE + Math.max(0, weeks - 1) * CELL_GAP;
  const height = PADDING * 2 + 7 * CELL_SIZE + 6 * CELL_GAP;

  const rects: string[] = [];

  for (let weekIndex = 0; weekIndex < model.weeks.length; weekIndex++) {
    const week = model.weeks[weekIndex];
    for (let dayIndex = 0; dayIndex < week.length; dayIndex++) {
      const cell = week[dayIndex];
      if (!cell) continue;

      const x = PADDING + weekIndex * (CELL_SIZE + CELL_GAP);
      const y = PADDING + dayIndex * (CELL_SIZE + CELL_GAP);
      const fill = resolvedTheme.colors[clampLevel(cell.level)];
      const title = `${cell.date}: ${cell.count} contribution${cell.count === 1 ? "" : "s"}`;

      rects.push(
        `<rect x="${x}" y="${y}" width="${CELL_SIZE}" height="${CELL_SIZE}" rx="${resolvedTheme.borderRadius}" fill="${escapeXml(fill)}" data-date="${escapeXml(cell.date)}" data-count="${cell.count}" data-level="${clampLevel(cell.level)}"><title>${escapeXml(title)}</title></rect>`,
      );
    }
  }

  container.innerHTML = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Contribution heatmap" style="display:block;background:${escapeXml(
      resolvedTheme.background,
    )};color:${escapeXml(resolvedTheme.textColor)};">`,
    `<rect x="0" y="0" width="${width}" height="${height}" fill="${escapeXml(resolvedTheme.background)}" />`,
    ...rects,
    "</svg>",
  ].join("");
}

function resolveTheme(theme?: Theme): ResolvedTheme {
  const base = themes.classicGreen;

  return {
    colors: theme?.colors ?? base.colors,
    background: theme?.background ?? base.background ?? "#ffffff",
    textColor: theme?.textColor ?? base.textColor ?? "#24292e",
    borderRadius: theme?.borderRadius ?? base.borderRadius ?? 2,
  };
}

function clampLevel(level: number): 0 | 1 | 2 | 3 | 4 {
  if (level <= 0) return 0;
  if (level >= 4) return 4;
  return level as 0 | 1 | 2 | 3;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
