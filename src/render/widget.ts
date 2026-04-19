import type { ContributionWidgetOptions, ThemeColorScale, WidgetSize } from "../types";
import { renderSvgCalendar } from "./svg";
import { resolveTheme, escapeCss, escapeHtml } from "./shared";

const WIDGET_SIZES = {
  sm: {
    gap: 12,
    padding: 14,
    radius: 18,
    metricRadius: 16,
    statsWidth: 250,
    valueSize: "1.3rem",
    labelSize: "0.72rem",
    calendarWidth: 350,
  },
  md: {
    gap: 14,
    padding: 16,
    radius: 20,
    metricRadius: 18,
    statsWidth: 252,
    valueSize: "1.7rem",
    labelSize: "0.8rem",
    calendarWidth: 560,
  },
  lg: {
    gap: 16,
    padding: 16,
    radius: 22,
    metricRadius: 20,
    statsWidth: 280,
    valueSize: "1.9rem",
    labelSize: "0.88rem",
    calendarWidth: 680,
  },
} as const;

let widgetSequence = 0;

/**
 * Renders a composite widget with summary metrics and the SVG heatmap.
 */
export function renderContributionWidget(
  container: HTMLElement,
  options: ContributionWidgetOptions,
): void {
  if (options.grid.weeks.length === 0 || options.metrics.length === 0) {
    container.innerHTML = "";
    return;
  }

  const size = options.size ?? "md";
  const statsPosition = options.statsPosition ?? "right";
  const resolved = resolveTheme(options.theme);
  const temp = { innerHTML: "" } as HTMLElement;

  renderSvgCalendar(temp, options.grid, options.theme);

  const widgetId = `streakr-widget-${++widgetSequence}`;
  const statsHtml = [
    '<aside class="streakr-widget__stats">',
    ...options.metrics.map(
      (metric) =>
        `<article class="streakr-widget__metric"><span class="streakr-widget__metric-label">${escapeHtml(
          metric.label,
        )}</span><strong class="streakr-widget__metric-value">${escapeHtml(
          String(metric.value),
        )}</strong></article>`,
    ),
    "</aside>",
  ].join("");
  const legendHtml = options.legend
    ? `<div class="streakr-widget__legend" aria-label="Contribution intensity legend"><span>${escapeHtml(options.legend.less)}</span><div class="streakr-widget__legend-scale">${[0, 1, 2, 3, 4].map((l) => `<i class="streakr-widget__legend-box" style="background:var(--streakr-level-${l})"></i>`).join("")}</div><span>${escapeHtml(options.legend.more)}</span></div>`
    : "";
  const calendarHtml = `<div class="streakr-widget__calendar">${temp.innerHTML}${legendHtml}</div>`;
  const content =
    statsPosition === "left" ? `${statsHtml}${calendarHtml}` : `${calendarHtml}${statsHtml}`;

  container.innerHTML = [
    `<section class="streakr-widget" data-streakr-widget="${widgetId}" data-size="${size}" data-position="${statsPosition}">`,
    `<style>${buildWidgetStyles(widgetId, size, resolved, statsPosition)}</style>`,
    `<div class="streakr-widget__layout">${content}</div>`,
    "</section>",
  ].join("");
}

function buildWidgetStyles(
  widgetId: string,
  size: WidgetSize,
  theme: {
    colors: ThemeColorScale;
    darkColors: ThemeColorScale;
    background: string;
    darkBackground: string;
    textColor: string;
    darkTextColor: string;
    colorScheme: string;
  },
  statsPosition: "left" | "right",
): string {
  const config = WIDGET_SIZES[size];
  const selector = `[data-streakr-widget="${escapeCss(widgetId)}"]`;
  const palette =
    theme.colorScheme === "dark"
      ? buildPaletteRules(
          selector,
          theme.darkColors,
          theme.darkBackground,
          theme.darkTextColor,
          true,
        )
      : buildPaletteRules(selector, theme.colors, theme.background, theme.textColor, false);
  const systemPalette =
    theme.colorScheme === "system"
      ? `@media (prefers-color-scheme: dark){${buildPaletteRules(
          selector,
          theme.darkColors,
          theme.darkBackground,
          theme.darkTextColor,
          true,
        )}}`
      : "";
  const columns =
    statsPosition === "left"
      ? `${config.statsWidth}px minmax(0, 1fr)`
      : `minmax(0, 1fr) ${config.statsWidth}px`;

  const widgetMaxWidth = config.calendarWidth + config.padding * 2 + config.gap + config.statsWidth;

  return [
    `${selector}{display:block;color-scheme:${theme.colorScheme === "system" ? "light dark" : theme.colorScheme};}`,
    `${selector} *{box-sizing:border-box;}`,
    palette,
    systemPalette,
    `${selector} .streakr-widget__layout{display:grid;grid-template-columns:${columns};gap:${config.gap}px;align-items:stretch;max-width:${widgetMaxWidth}px;margin:0 auto;}`,
    `${selector} .streakr-widget__calendar{min-width:0;padding:${config.padding}px;border-radius:${config.radius}px;border:1px solid var(--streakr-widget-border);background:var(--streakr-widget-surface);display:flex;flex-direction:column;justify-content:center;}`,
    `${selector} .streakr-widget__calendar svg{display:block;width:100%;height:auto;}`,
    `${selector} .streakr-widget__stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:${Math.max(10, config.gap - 2)}px;align-content:stretch;}`,
    `${selector} .streakr-widget__metric{padding:${config.padding}px;border-radius:${config.metricRadius}px;border:1px solid var(--streakr-widget-border);background:var(--streakr-widget-card);}`,
    `${selector} .streakr-widget__metric-label{display:block;color:var(--streakr-widget-muted);font-size:${config.labelSize};line-height:1.3;}`,
    `${selector} .streakr-widget__metric-value{display:block;margin-top:4px;color:var(--streakr-widget-ink);font-size:${config.valueSize};font-weight:700;line-height:1;}`,
    `${selector} .streakr-widget__legend{display:flex;align-items:center;gap:8px;margin-top:10px;color:var(--streakr-widget-muted);font-size:0.82rem;align-self:flex-end;}`,
    `${selector} .streakr-widget__legend-scale{display:inline-flex;gap:4px;}`,
    `${selector} .streakr-widget__legend-box{width:12px;height:12px;border-radius:3px;}`,
    `@media (max-width: 920px){${selector} .streakr-widget__layout{grid-template-columns:1fr;max-width:none;}${selector} .streakr-widget__calendar svg{width:auto;min-width:fit-content;}${selector} .streakr-widget__calendar{overflow-x:auto;}}`,
    `@media (max-width: 620px){${selector} .streakr-widget__stats{grid-template-columns:1fr 1fr;}${selector} .streakr-widget__metric-value{font-size:1.7rem;}}`,
  ].join("");
}

function buildPaletteRules(
  selector: string,
  colors: ThemeColorScale,
  background: string,
  textColor: string,
  dark: boolean,
): string {
  const muted = dark ? "#a7b5df" : "#5f6d96";
  const border = dark ? "rgba(124, 136, 255, 0.18)" : "rgba(70, 96, 170, 0.14)";
  const surface = dark
    ? "linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01)), rgba(5, 10, 23, 0.6)"
    : "linear-gradient(180deg, rgba(255, 255, 255, 0.84), rgba(255, 255, 255, 0.62)), rgba(255, 255, 255, 0.74)";
  const card = dark
    ? "linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0)), rgba(7, 12, 26, 0.78)"
    : "linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(255, 255, 255, 0.68)), rgba(255, 255, 255, 0.8)";

  return `${selector}{--streakr-widget-accent:${escapeCss(
    colors[4],
  )};--streakr-widget-soft:${escapeCss(colors[1])};--streakr-widget-background:${escapeCss(
    background,
  )};--streakr-widget-ink:${escapeCss(textColor)};--streakr-widget-muted:${muted};--streakr-widget-border:${border};--streakr-widget-surface:${surface};--streakr-widget-card:${card};--streakr-level-0:${escapeCss(colors[0])};--streakr-level-1:${escapeCss(colors[1])};--streakr-level-2:${escapeCss(colors[2])};--streakr-level-3:${escapeCss(colors[3])};--streakr-level-4:${escapeCss(colors[4])};}`;
}
