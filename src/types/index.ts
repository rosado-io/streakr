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

/** Parameters for fetching events from a provider. */
export interface FetchParams {
  /** Username to fetch events for */
  user: string;
  /** Start date in YYYY-MM-DD format */
  start: string;
  /** End date in YYYY-MM-DD format */
  end: string;
}

/** Visual theme for the Streakr component. */
export type StreakrTheme = "dark" | "light";

/** Color-scheme alias kept for forward compatibility with auto-detection. */
export type StreakrThemeMode = StreakrTheme | "system";

/** Lifecycle/state of the Streakr component. */
export type StreakrState = "loading" | "empty" | "ready";

/** Map of provider keys to their on/off state. */
export type StreakrProviders = Record<string, boolean>;

/**
 * Provider definition consumed by the Streakr component.
 *
 * `key` is the lookup name used in `StreakrDay.sources`. `name` is the
 * display label, `color` is the dot/accent color, and `icon` is an optional
 * SVG snippet shown in the provider chip.
 */
export interface StreakrProvider {
  /** Stable lookup key (e.g. `"github"`). */
  key: string;
  /** Display name (e.g. `"GitHub"`). */
  name: string;
  /** Dot/accent color used in chips and tooltips. */
  color: string;
  /**
   * Optional inline SVG markup shown inside the provider chip.
   *
   * Built-in icons are provided automatically when `key` is `"github"`,
   * `"gitlab"`, or `"bitbucket"`. Pass your own to override.
   *
   * ⚠️ Security: this string is inserted as raw HTML via `innerHTML`. Only
   * pass trusted, statically-defined SVG markup. Never forward user-supplied
   * or remotely-fetched SVG without sanitizing it first (e.g. with
   * [DOMPurify](https://github.com/cure53/DOMPurify)) — SVG can contain
   * inline scripts and lead to XSS.
   */
  icon?: string;
}

/**
 * A single day's contribution data for the stateful Streakr component.
 *
 * Per-provider counters live under `sources` keyed by `StreakrProvider.key`.
 * `total` is recomputed by the component when toggling providers, so the
 * value you pass in is treated as the "all providers active" total.
 */
export interface StreakrDay {
  /** Calendar date (local time) for this entry. */
  date: Date;
  /** Total contributions across all providers for this day. */
  total: number;
  /** Per-provider counts, keyed by `StreakrProvider.key`. */
  sources?: Record<string, number>;
}

/** A `StreakrDay` with an intensity level (0-4) used for cell coloring. */
export interface StreakrLeveledDay extends StreakrDay {
  level: 0 | 1 | 2 | 3 | 4;
}

/** Options accepted by `createStreakr`. */
export interface StreakrOptions {
  /** Element that the component will mount into. */
  target: HTMLElement;
  /** Visual theme. Default: `"dark"`. */
  theme?: StreakrTheme;
  /** Accent color (any CSS color). Default: `"#39d353"`. */
  accent?: string;
  /** When true, the heatmap palette is tinted from `accent`. Default: `true`. */
  tintHeatmap?: boolean;
  /** Toggle the provider row. Default: `true`. */
  showProviders?: boolean;
  /** Toggle the stats grid. Default: `true`. */
  showStats?: boolean;
  /** Lifecycle state. Default: `"ready"`. */
  state?: StreakrState;
  /** Years available in the year tabs row and modal. */
  years: number[];
  /** Currently selected year. Defaults to the latest entry of `years`. */
  year?: number;
  /** Returns the contribution days for a given year. */
  getDays: (year: number) => StreakrDay[];
  /**
   * Provider definitions shown in the provider chip row and tooltip.
   *
   * Defaults to `[github, gitlab, bitbucket]` (built-in icons). Pass your
   * own array to support arbitrary providers.
   */
  providers?: StreakrProvider[];
  /** Fired when the user changes the active year. */
  onYearChange?: (year: number) => void;
  /** Fired when the user toggles a provider chip. */
  onProviderToggle?: (key: string, enabled: boolean, providers: StreakrProviders) => void;
}

/** Public instance API returned by `createStreakr`. */
export interface StreakrInstance {
  /** Patch options and re-render. */
  update(patch: Partial<StreakrOptions>): void;
  /** Programmatically set the active year. */
  setYear(year: number): void;
  /** Patch the provider toggle state. */
  setProviders(next: StreakrProviders): void;
  /** Tear down the component, listeners, and tooltip node. */
  destroy(): void;
}
