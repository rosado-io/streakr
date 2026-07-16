import type {
  StreakrDay,
  StreakrOptions,
  StreakrProvider,
  StreakrProviders,
  StreakrThemeMode,
} from "../types";
import { DEFAULT_PROVIDERS, enabledProviderState } from "./providers";

export interface InternalState {
  year: number | null;
  providers: StreakrProviders;
  yearModalOpen: boolean;
  selectedDay: Date;
}

export interface ResolvedConfig {
  target: HTMLElement;
  theme: StreakrThemeMode;
  accent: string;
  tintHeatmap: boolean;
  showProviders: boolean;
  showStats: boolean;
  state: "loading" | "empty" | "ready";
  years: number[];
  year: number | null;
  today: Date;
  getDays: (year: number) => StreakrDay[];
  providers: StreakrProvider[];
  onYearChange: ((year: number) => void) | null;
  onProviderToggle: ((key: string, enabled: boolean, providers: StreakrProviders) => void) | null;
}

export interface ComponentCtx {
  cfg: ResolvedConfig;
  state: InternalState;
}

export const sourceCount = (day: StreakrDay, key: string): number => day.sources?.[key] ?? 0;

export const resolveConfig = (options: StreakrOptions): ResolvedConfig => {
  const cfg: ResolvedConfig = {
    target: options.target,
    theme: options.theme ?? "dark",
    accent: options.accent ?? "#39d353",
    tintHeatmap: options.tintHeatmap ?? true,
    showProviders: options.showProviders ?? true,
    showStats: options.showStats ?? true,
    state: options.state ?? "ready",
    years: options.years ?? [],
    year: options.year ?? null,
    today: options.today ?? new Date(),
    getDays: options.getDays ?? (() => []),
    providers: options.providers ?? DEFAULT_PROVIDERS,
    onYearChange: options.onYearChange ?? null,
    onProviderToggle: options.onProviderToggle ?? null,
  };

  if (!cfg.target) {
    throw new Error("streakr: `target` is required");
  }
  if (cfg.year == null && cfg.years.length) {
    cfg.year = cfg.years[cfg.years.length - 1];
  }
  return cfg;
};

export const createInitialState = (cfg: ResolvedConfig): InternalState => ({
  year: cfg.year,
  providers: enabledProviderState(cfg.providers),
  yearModalOpen: false,
  selectedDay: cfg.today,
});
