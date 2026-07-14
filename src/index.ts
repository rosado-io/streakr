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
export { GitHubCoAuthorProvider } from "./providers/github-coauthor";
export type { GitHubCoAuthorProviderOptions } from "./providers/github-coauthor";
export {
  AGENT_TRAILER_RULES,
  parseCoAuthors,
  matchAgent,
  parseAgentCoAuthors,
} from "./providers/trailers";
export type { CoAuthor, AgentCoAuthor, AgentTrailerRule } from "./providers/trailers";

export { createStreakr } from "./component/streakr";
export { DEFAULT_PROVIDERS, AGENT_PROVIDERS } from "./component/providers";

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
