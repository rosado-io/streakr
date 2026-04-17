import type {
  ContributionWidgetOptions,
  Theme,
  ThemeColorScale,
  ThemeColorScheme,
  WidgetSize,
} from "../types";
import { renderSvgCalendar } from "./svg";
import { themes } from "./themes";

const WIDGET_SIZES = {
  sm: {
    gap: 12,
    padding: 14,
    radius: 18,
    metricRadius: 16,
    statsWidth: 220,
    valueSize: "1.9rem",
    calendarWidth: 420,
  },
  md: {
    gap: 14,
    padding: 16,
    radius: 20,
    metricRadius: 18,
    statsWidth: 252,
    valueSize: "2.2rem",
    calendarWidth: 560,
  },
  lg: {
    gap: 16,
    padding: 18,
    radius: 22,
    metricRadius: 20,
    statsWidth: 280,
    valueSize: "2.5rem",
    calendarWidth: 680,
  },
} as const;

let widgetSequence = 0;

interface ResolvedWidgetTheme {
  colors: ThemeColorScale;
  darkColors: ThemeColorScale;
  background: string;
  darkBackground: string;
  textColor: string;
  darkTextColor: string;
  colorScheme: ThemeColorScheme;
}

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
  const resolvedTheme = resolveWidgetTheme(options.theme);
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
  const calendarHtml = `<div class="streakr-widget__calendar">${temp.innerHTML}</div>`;
  const content =
    statsPosition === "left" ? `${statsHtml}${calendarHtml}` : `${calendarHtml}${statsHtml}`;

  container.innerHTML = [
    `<section class="streakr-widget" data-streakr-widget="${widgetId}" data-size="${size}" data-position="${statsPosition}">`,
    `<style>${buildWidgetStyles(widgetId, size, resolvedTheme, statsPosition)}</style>`,
    `<div class="streakr-widget__layout">${content}</div>`,
    "</section>",
  ].join("");
}

function buildWidgetStyles(
  widgetId: string,
  size: WidgetSize,
  theme: ResolvedWidgetTheme,
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

  return [
    `${selector}{display:block;color-scheme:${theme.colorScheme === "system" ? "light dark" : theme.colorScheme};}`,
    `${selector} *{box-sizing:border-box;}`,
    palette,
    systemPalette,
    `${selector} .streakr-widget__layout{display:grid;grid-template-columns:${columns};gap:${config.gap}px;align-items:stretch;}`,
    `${selector} .streakr-widget__calendar{min-width:0;padding:${config.padding}px;border-radius:${config.radius}px;border:1px solid var(--streakr-widget-border);background:var(--streakr-widget-surface);box-shadow:var(--streakr-widget-shadow);}`,
    `${selector} .streakr-widget__calendar svg{display:block;width:min(100%, ${config.calendarWidth}px);height:auto;margin:0 auto;}`,
    `${selector} .streakr-widget__stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:${Math.max(10, config.gap - 2)}px;align-content:start;}`,
    `${selector} .streakr-widget__metric{padding:${config.padding}px;border-radius:${config.metricRadius}px;border:1px solid var(--streakr-widget-border);background:var(--streakr-widget-card);box-shadow:var(--streakr-widget-shadow);}`,
    `${selector} .streakr-widget__metric-label{display:block;color:var(--streakr-widget-muted);font-size:0.88rem;line-height:1.3;}`,
    `${selector} .streakr-widget__metric-value{display:block;margin-top:8px;color:var(--streakr-widget-ink);font-size:${config.valueSize};font-weight:700;line-height:1;}`,
    `@media (max-width: 920px){${selector} .streakr-widget__layout{grid-template-columns:1fr;}${selector} .streakr-widget__calendar svg{width:auto;min-width:fit-content;}${selector} .streakr-widget__calendar{overflow-x:auto;}}`,
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
  const shadow = dark ? "0 24px 60px rgba(2, 6, 23, 0.46)" : "0 24px 50px rgba(72, 98, 187, 0.12)";

  return `${selector}{--streakr-widget-accent:${escapeCss(
    colors[4],
  )};--streakr-widget-soft:${escapeCss(colors[1])};--streakr-widget-background:${escapeCss(
    background,
  )};--streakr-widget-ink:${escapeCss(textColor)};--streakr-widget-muted:${muted};--streakr-widget-border:${border};--streakr-widget-surface:${surface};--streakr-widget-card:${card};--streakr-widget-shadow:${shadow};}`;
}

function resolveWidgetTheme(theme?: Theme): ResolvedWidgetTheme {
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
    colorScheme: theme?.colorScheme ?? base.colorScheme ?? "light",
  };
}

function escapeCss(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
