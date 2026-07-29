/**
 * One calendar day in Streakr's presentation contract.
 *
 * `date` must use the local-calendar form `YYYY-MM-DD`. When `sources` is
 * present, its values must add up to `count`.
 */
export interface StreakrDay {
  readonly date: string;
  readonly count: number;
  readonly sources?: Readonly<Record<string, number>>;
}

export type StreakrTheme = "dark" | "light";

export type StreakrThemeMode = StreakrTheme | "system";

export type StreakrStatus = "loading" | "empty" | "ready" | "error";

export type StreakrSourceState = Readonly<Record<string, boolean>>;

export interface StreakrSource {
  readonly key: string;
  readonly name: string;
  readonly color: string;
  readonly icon?: () => SVGElement;
}

export interface StreakrOptions {
  readonly target: HTMLElement;
  readonly days: readonly StreakrDay[];
  readonly years: readonly number[];
  readonly year?: number;
  readonly today?: string;
  readonly status?: StreakrStatus;
  readonly errorMessage?: string;
  readonly theme?: StreakrThemeMode;
  readonly accent?: string;
  readonly tintHeatmap?: boolean;
  readonly showSources?: boolean;
  readonly showStats?: boolean;
  readonly sources?: readonly StreakrSource[];
  readonly onYearChange?: (year: number) => void;
  readonly onSourceToggle?: (key: string, enabled: boolean, sources: StreakrSourceState) => void;
}

export type StreakrUpdate = Partial<Omit<StreakrOptions, "target">>;

export interface StreakrInstance {
  update(patch: StreakrUpdate): void;
  setYear(year: number): void;
  setSources(next: StreakrSourceState): void;
  destroy(): void;
}
