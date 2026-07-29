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

export const applyUpdate = (
  cfg: ResolvedConfig,
  state: InternalState,
  patch: StreakrUpdate,
  hooks: { onThemeChange: () => void },
): void => {
  const nextSources = patch.sources === undefined ? cfg.sources : normalizeSources(patch.sources);
  const nextInputDays = patch.days === undefined ? cfg.inputDays : [...patch.days];
  const nextYears = patch.years === undefined ? cfg.years : normalizeYears(patch.years);
  const requestedYear =
    patch.year ?? (state.year !== null && nextYears.includes(state.year) ? state.year : undefined);
  const nextYear = validateSelectedYear(requestedYear, nextYears);
  const nextAccent = patch.accent === undefined ? cfg.accent : validateAccent(patch.accent);
  const nextStatus = patch.status === undefined ? cfg.status : validateStatus(patch.status);
  const nextToday = patch.today === undefined ? cfg.today : parseDateKey(patch.today, "today");
  const nextTheme = patch.theme === undefined ? cfg.theme : validateTheme(patch.theme);
  const nextTintHeatmap =
    patch.tintHeatmap === undefined
      ? cfg.tintHeatmap
      : validateBoolean(patch.tintHeatmap, "tintHeatmap");
  const nextShowSources =
    patch.showSources === undefined
      ? cfg.showSources
      : validateBoolean(patch.showSources, "showSources");
  const nextShowStats =
    patch.showStats === undefined ? cfg.showStats : validateBoolean(patch.showStats, "showStats");
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
