// Core
export { normalizeEventsToDaily } from "./core/normalize";
export { computeStreaks } from "./core/streaks";
export { buildCalendarGrid } from "./core/grid";

// Providers
export type { Provider } from "./providers/types";
export { aggregate } from "./providers/aggregator";
export { GitHubProvider } from "./providers/github";
export type { GitHubProviderOptions } from "./providers/github";

// Render
export { renderSvgCalendar } from "./render/svg";
export { themes } from "./render/themes";

// Types
export type {
  ContributionDay,
  CalendarGrid,
  CalendarCell,
  GridOptions,
  StreakResult,
  Theme,
  FetchParams,
} from "./types";
