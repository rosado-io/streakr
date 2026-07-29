import type {
  StreakrDay,
  StreakrOptions,
  StreakrSource,
  StreakrSourceState,
  StreakrStatus,
  StreakrThemeMode,
} from "../types";
import {
  currentDateKey,
  normalizeDays,
  normalizeSources,
  normalizeYears,
  parseDateKey,
  validateAccent,
  validateBoolean,
  validateSelectedYear,
  validateStatus,
  validateTheme,
} from "./contract";
import { DEFAULT_SOURCES, enabledSourceState } from "./sources";
import type { RenderableDay } from "./types";

export interface InternalState {
  year: number | null;
  sources: Record<string, boolean>;
  yearModalOpen: boolean;
  selectedDay: Date;
}

export interface ResolvedConfig {
  target: HTMLElement;
  theme: StreakrThemeMode;
  accent: string;
  tintHeatmap: boolean;
  showSources: boolean;
  showStats: boolean;
  status: StreakrStatus;
  errorMessage: string;
  years: number[];
  year: number | null;
  today: Date;
  inputDays: StreakrDay[];
  days: RenderableDay[];
  sources: StreakrSource[];
  onYearChange: ((year: number) => void) | null;
  onSourceToggle: ((key: string, enabled: boolean, sources: StreakrSourceState) => void) | null;
}

export interface ComponentCtx {
  cfg: ResolvedConfig;
  state: InternalState;
}

export const sourceCount = (day: RenderableDay, key: string): number => day.sources?.[key] ?? 0;

const assertTarget = (target: HTMLElement | undefined): HTMLElement => {
  if (!target || typeof target.appendChild !== "function") {
    throw new Error("streakr: `target` is required");
  }
  return target;
};

const assertArray = (value: unknown, key: string): readonly unknown[] => {
  if (!Array.isArray(value)) {
    throw new Error(`streakr: \`${key}\` is required`);
  }
  return value;
};

export const resolveConfig = (options: StreakrOptions): ResolvedConfig => {
  const opts = options as Partial<StreakrOptions>;
  const sources = normalizeSources(opts.sources ?? DEFAULT_SOURCES);
  const inputDays = [...assertArray(opts.days, "days")] as StreakrDay[];
  const years = normalizeYears(assertArray(opts.years, "years") as number[]);
  const year = validateSelectedYear(opts.year, years);
  const todayKey = opts.today ?? currentDateKey();

  return {
    target: assertTarget(opts.target),
    theme: validateTheme(opts.theme ?? "dark"),
    accent: validateAccent(opts.accent ?? "#39d353"),
    tintHeatmap: validateBoolean(opts.tintHeatmap ?? true, "tintHeatmap"),
    showSources: validateBoolean(opts.showSources ?? true, "showSources"),
    showStats: validateBoolean(opts.showStats ?? true, "showStats"),
    status: validateStatus(opts.status ?? "ready"),
    errorMessage: opts.errorMessage ?? "Contribution data is unavailable.",
    years,
    year,
    today: parseDateKey(todayKey, "today"),
    inputDays,
    days: normalizeDays(inputDays, sources),
    sources,
    onYearChange: opts.onYearChange ?? null,
    onSourceToggle: opts.onSourceToggle ?? null,
  };
};

export const createInitialState = (cfg: ResolvedConfig): InternalState => ({
  year: cfg.year,
  sources: enabledSourceState(cfg.sources),
  yearModalOpen: false,
  selectedDay: cfg.today,
});
