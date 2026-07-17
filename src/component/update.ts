import type { StreakrOptions } from "../types";
import type { InternalState, ResolvedConfig } from "./config";

export type UpdatePatch = Partial<StreakrOptions>;

type UpdateHandlers = {
  [Key in keyof StreakrOptions]-?: (patch: Pick<UpdatePatch, Key>) => void;
};

export const createUpdateHandlers = (
  cfg: ResolvedConfig,
  state: InternalState,
  hooks: { onThemeChange: () => void },
) => {
  const updateHandlers = {
    target: ({ target }) => {
      if (target !== undefined) {
        throw new Error("Cannot update 'target' after mount. Destroy and recreate the instance.");
      }
    },
    theme: ({ theme }) => {
      if (theme !== undefined) {
        cfg.theme = theme;
        hooks.onThemeChange();
      }
    },
    accent: ({ accent }) => {
      if (accent !== undefined) cfg.accent = accent;
    },
    tintHeatmap: ({ tintHeatmap }) => {
      if (tintHeatmap !== undefined) cfg.tintHeatmap = tintHeatmap;
    },
    showProviders: ({ showProviders }) => {
      if (showProviders !== undefined) cfg.showProviders = showProviders;
    },
    showStats: ({ showStats }) => {
      if (showStats !== undefined) cfg.showStats = showStats;
    },
    state: ({ state: nextState }) => {
      if (nextState !== undefined) cfg.state = nextState;
    },
    years: ({ years }) => {
      if (years !== undefined) {
        cfg.years = years;
        if (cfg.years.length && (state.year == null || !cfg.years.includes(state.year))) {
          state.year = cfg.years[cfg.years.length - 1] ?? null;
        }
      }
    },
    year: ({ year }) => {
      if (year !== undefined) {
        cfg.year = year;
        state.year = year;
      }
    },
    today: ({ today }) => {
      if (today !== undefined) cfg.today = today;
    },
    getDays: ({ getDays }) => {
      if (getDays !== undefined) cfg.getDays = getDays;
    },
    providers: ({ providers }) => {
      if (providers !== undefined) cfg.providers = providers;
    },
    onYearChange: ({ onYearChange }) => {
      if (onYearChange !== undefined) cfg.onYearChange = onYearChange;
    },
    onProviderToggle: ({ onProviderToggle }) => {
      if (onProviderToggle !== undefined) cfg.onProviderToggle = onProviderToggle;
    },
  } satisfies UpdateHandlers;

  // Object.hasOwn() requires ES2022, while the published library targets ES2020.
  const isUpdateKey = (key: string): key is keyof typeof updateHandlers =>
    Object.getOwnPropertyDescriptor(updateHandlers, key) !== undefined;

  return { updateHandlers, isUpdateKey };
};
