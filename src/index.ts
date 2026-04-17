export { normalizeEventsToDaily } from "./core/normalize";
export { computeStreaks } from "./core/streaks";
export { buildCalendarGrid } from "./core/grid";

export type { Provider } from "./providers/types";
export { aggregate } from "./providers/aggregator";
export { GitHubProvider } from "./providers/github";
export type { GitHubProviderOptions } from "./providers/github";
export { GitLabProvider } from "./providers/gitlab";
export type { GitLabProviderOptions } from "./providers/gitlab";

export { renderSvgCalendar } from "./render/svg";
export { renderContributionWidget } from "./render/widget";
export { themes, createCssVarTheme } from "./render/themes";

export type {
  ContributionDay,
  ContributionMetric,
  CalendarGrid,
  CalendarCell,
  ContributionWidgetOptions,
  GridOptions,
  StreakResult,
  Theme,
  ThemeColorScale,
  ThemeColorScheme,
  FetchParams,
  WidgetSize,
  WidgetStatsPosition,
} from "./types";
