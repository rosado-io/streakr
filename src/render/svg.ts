import type { CalendarGrid, Theme, ThemeColorScale } from "../types";
import { type ResolvedTheme, resolveTheme, escapeCss, escapeHtml, clampLevel } from "./shared";

let renderSequence = 0;

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

  const resolved = resolveTheme(theme);
  const svgId = `streakr-svg-${++renderSequence}`;
  const weeks = model.weeks.length;
  const width =
    resolved.padding * 2 + weeks * resolved.cellSize + Math.max(0, weeks - 1) * resolved.gap;
  const height = resolved.padding * 2 + 7 * resolved.cellSize + 6 * resolved.gap;

  const rects = buildCellRects(model, resolved);

  const inlineSvgStyle =
    resolved.colorScheme === "system"
      ? "display:block;color-scheme:light dark;"
      : `display:block;background:${escapeHtml(resolved.background)};color:${escapeHtml(resolved.textColor)};`;

  const backgroundRect =
    resolved.colorScheme === "system"
      ? `<rect class="streakr-background" x="0" y="0" width="${width}" height="${height}" />`
      : `<rect x="0" y="0" width="${width}" height="${height}" fill="${escapeHtml(resolved.background)}" style="fill:${escapeHtml(resolved.background)};" />`;

  container.innerHTML = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Contribution heatmap" data-streakr-id="${svgId}" style="${inlineSvgStyle}">`,
    resolved.colorScheme === "system" ? buildSystemThemeStyle(svgId, resolved) : "",
    backgroundRect,
    ...rects,
    "</svg>",
  ].join("");
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

function buildCellRects(model: CalendarGrid, resolved: ResolvedTheme): string[] {
  const rects: string[] = [];
  for (let weekIndex = 0; weekIndex < model.weeks.length; weekIndex++) {
    const week = model.weeks[weekIndex];
    for (let dayIndex = 0; dayIndex < week.length; dayIndex++) {
      const cell = week[dayIndex];
      if (!cell) continue;

      const x = resolved.padding + weekIndex * (resolved.cellSize + resolved.gap);
      const y = resolved.padding + dayIndex * (resolved.cellSize + resolved.gap);
      const fill = resolved.colors[clampLevel(cell.level)];
      const title = `${cell.date}: ${cell.count} contribution${cell.count === 1 ? "" : "s"}`;
      const level = clampLevel(cell.level);
      const dateHtml = escapeHtml(cell.date);
      const titleHtml = escapeHtml(title);

      if (resolved.colorScheme === "system") {
        rects.push(
          `<rect class="streakr-cell" x="${x}" y="${y}" width="${resolved.cellSize}" height="${resolved.cellSize}" rx="${resolved.borderRadius}" data-date="${dateHtml}" data-count="${cell.count}" data-level="${level}"><title>${titleHtml}</title></rect>`,
        );
      } else {
        const fillHtml = escapeHtml(fill);
        rects.push(
          `<rect x="${x}" y="${y}" width="${resolved.cellSize}" height="${resolved.cellSize}" rx="${resolved.borderRadius}" fill="${fillHtml}" style="fill:${fillHtml};" data-date="${dateHtml}" data-count="${cell.count}" data-level="${level}"><title>${titleHtml}</title></rect>`,
        );
      }
    }
  }
  return rects;
}
