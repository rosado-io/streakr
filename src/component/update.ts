import type { StreakrUpdate } from "../types";
import {
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
import type { InternalState, ResolvedConfig } from "./config";

const resolvePatchValue = <TInput, TOutput>(
  value: TInput | undefined,
  current: TOutput,
  validate: (value: TInput) => TOutput,
): TOutput => (value === undefined ? current : validate(value));

const retainedYear = (year: number | null, years: readonly number[]): number | undefined =>
  year !== null && years.includes(year) ? year : undefined;

export const applyUpdate = (
  cfg: ResolvedConfig,
  state: InternalState,
  patch: StreakrUpdate,
  hooks: { onThemeChange: () => void },
): void => {
  const nextSources = resolvePatchValue(patch.sources, cfg.sources, normalizeSources);
  const nextInputDays = resolvePatchValue(patch.days, cfg.inputDays, (days) => [...days]);
  const nextYears = resolvePatchValue(patch.years, cfg.years, normalizeYears);
  const requestedYear = patch.year ?? retainedYear(state.year, nextYears);
  const nextYear = validateSelectedYear(requestedYear, nextYears);
  const nextAccent = resolvePatchValue(patch.accent, cfg.accent, validateAccent);
  const nextStatus = resolvePatchValue(patch.status, cfg.status, validateStatus);
  const nextToday = resolvePatchValue(patch.today, cfg.today, (today) =>
    parseDateKey(today, "today"),
  );
  const nextTheme = resolvePatchValue(patch.theme, cfg.theme, validateTheme);
  const nextTintHeatmap = resolvePatchValue(patch.tintHeatmap, cfg.tintHeatmap, (tintHeatmap) =>
    validateBoolean(tintHeatmap, "tintHeatmap"),
  );
  const nextShowSources = resolvePatchValue(patch.showSources, cfg.showSources, (showSources) =>
    validateBoolean(showSources, "showSources"),
  );
  const nextShowStats = resolvePatchValue(patch.showStats, cfg.showStats, (showStats) =>
    validateBoolean(showStats, "showStats"),
  );
  const nextDays = normalizeDays(nextInputDays, nextSources);

  cfg.sources = nextSources;
  cfg.inputDays = nextInputDays;
  cfg.days = nextDays;
  cfg.years = nextYears;
  cfg.year = nextYear;
  cfg.accent = nextAccent;
  cfg.status = nextStatus;
  cfg.today = nextToday;
  cfg.theme = nextTheme;
  cfg.tintHeatmap = nextTintHeatmap;
  cfg.showSources = nextShowSources;
  cfg.showStats = nextShowStats;
  state.year = nextYear;

  if (patch.theme !== undefined) {
    hooks.onThemeChange();
  }
  if (patch.errorMessage !== undefined) cfg.errorMessage = patch.errorMessage;
  if (patch.onYearChange !== undefined) cfg.onYearChange = patch.onYearChange;
  if (patch.onSourceToggle !== undefined) cfg.onSourceToggle = patch.onSourceToggle;
};
