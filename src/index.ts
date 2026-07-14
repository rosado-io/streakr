export { normalizeEventsToDaily } from "./core/normalize";
export { computeStreaks } from "./core/streaks";
export { splitCoAuthored } from "./core/split";
export type { SplitCoAuthoredOptions } from "./core/split";
export { buildCalendarGrid } from "./core/grid";

export type { Provider } from "./providers/types";
export { aggregate } from "./providers/aggregator";
export { GitHubProvider } from "./providers/github";
export type { GitHubProviderOptions } from "./providers/github";
export { GitLabProvider } from "./providers/gitlab";
export type { GitLabProviderOptions } from "./providers/gitlab";

export { createStreakr } from "./component/streakr";

export type {
  ContributionDay,
  CalendarGrid,
  CalendarCell,
  GridOptions,
  StreakResult,
  FetchParams,
  StreakrDay,
  StreakrLeveledDay,
  StreakrOptions,
  StreakrInstance,
  StreakrProvider,
  StreakrProviders,
  StreakrState,
  StreakrTheme,
  StreakrThemeMode,
} from "./types";
