export { normalizeEventsToDaily } from "./core/normalize";
export { computeStreaks } from "./core/streaks";
export { buildCalendarGrid } from "./core/grid";

export type { Provider } from "./providers/types";
export { aggregate } from "./providers/aggregator";
export { GitHubProvider } from "./providers/github";
export type { GitHubProviderOptions } from "./providers/github";
export { GitLabProvider } from "./providers/gitlab";
export type { GitLabProviderOptions } from "./providers/gitlab";
export {
  AGENT_TRAILER_RULES,
  parseCoAuthors,
  matchAgent,
  parseAgentCoAuthors,
} from "./providers/trailers";
export type { CoAuthor, AgentCoAuthor, AgentTrailerRule } from "./providers/trailers";

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
