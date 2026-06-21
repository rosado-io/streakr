export interface ContributionDay {
  date: string;
  count: number;
  sources?: Record<string, number>;
}

export interface StreakResult {
  total: number;
  bestStreak: number;
  currentStreak: number;
}

export interface GridOptions {
  startDate?: string;
  endDate?: string;
  weekStartsOn?: 0 | 1;
}

export interface CalendarCell {
  date: string;
  count: number;
  level: number;
}

export interface CalendarGrid {
  weeks: (CalendarCell | null)[][];
  totalContributions: number;
}

export interface FetchParams {
  user: string;
  start: string;
  end: string;
}

export type StreakrTheme = "dark" | "light";

export type StreakrThemeMode = StreakrTheme | "system";

export type StreakrState = "loading" | "empty" | "ready";

export type StreakrProviders = Record<string, boolean>;

export interface StreakrProvider {
  key: string;
  name: string;
  color: string;
  icon?: string;
}

export interface StreakrDay {
  date: Date;
  total: number;
  sources?: Record<string, number>;
}

export interface StreakrLeveledDay extends StreakrDay {
  level: 0 | 1 | 2 | 3 | 4;
}

export interface StreakrOptions {
  target: HTMLElement;
  theme?: StreakrThemeMode;
  accent?: string;
  tintHeatmap?: boolean;
  showProviders?: boolean;
  showStats?: boolean;
  state?: StreakrState;
  years: number[];
  year?: number;
  /** Reference "today" date used for the current-year year-to-date window. Default: `new Date()`. */
  today?: Date;
  getDays: (year: number) => StreakrDay[];
  providers?: StreakrProvider[];
  onYearChange?: (year: number) => void;
  onProviderToggle?: (key: string, enabled: boolean, providers: StreakrProviders) => void;
}

export interface StreakrInstance {
  update(patch: Partial<StreakrOptions>): void;
  setYear(year: number): void;
  setProviders(next: StreakrProviders): void;
  destroy(): void;
}
