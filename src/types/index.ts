/** A single day's contribution data, normalized across providers. */
export interface ContributionDay {
  /** Date in YYYY-MM-DD format */
  date: string;
  /** Total contribution count for the day */
  count: number;
  /** Optional breakdown by source platform */
  sources?: Record<string, number>;
}

/** Result of streak calculations. */
export interface StreakResult {
  /** Total number of contributions across all days */
  total: number;
  /** Longest consecutive streak of active days */
  bestStreak: number;
  /** Current consecutive streak (from today backwards) */
  currentStreak: number;
}

/** Options for building the calendar grid. */
export interface GridOptions {
  /** Start date in YYYY-MM-DD format. Default: 365 days ago */
  startDate?: string;
  /** End date in YYYY-MM-DD format. Default: today */
  endDate?: string;
  /** Day the week starts on. 0 = Sunday, 1 = Monday. Default: 0 */
  weekStartsOn?: 0 | 1;
}

/** A single cell in the calendar grid. */
export interface CalendarCell {
  /** Date in YYYY-MM-DD format */
  date: string;
  /** Contribution count */
  count: number;
  /** Intensity level (0-4) for color mapping */
  level: number;
}

/** The full calendar grid structure. */
export interface CalendarGrid {
  /** 2D array: weeks (columns) × days (rows) */
  weeks: (CalendarCell | null)[][];
  /** Total contributions in the grid */
  totalContributions: number;
}

/** Theme configuration for the heatmap renderer. */
export interface Theme {
  /** 5 colors for levels 0-4: [empty, low, medium, high, max] */
  colors: [string, string, string, string, string];
  /** Background color */
  background?: string;
  /** Text/label color */
  textColor?: string;
  /** Border radius for cells in pixels */
  borderRadius?: number;
}

/** Parameters for fetching events from a provider. */
export interface FetchParams {
  /** Username to fetch events for */
  user: string;
  /** Start date in YYYY-MM-DD format */
  start: string;
  /** End date in YYYY-MM-DD format */
  end: string;
}
