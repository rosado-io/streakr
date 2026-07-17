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
  // Plain-JS callers may return undefined despite the public typing.
  getDays: (year: number) => StreakrDay[] | undefined;
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
  // Widened so runtime validation still guards plain-JS callers the types can't.
  const opts: Partial<StreakrOptions> = options;
  if (!opts.target) {
    throw new Error("streakr: `target` is required");
  }

  const cfg: ResolvedConfig = {
    target: opts.target,
    theme: opts.theme ?? "dark",
    accent: opts.accent ?? "#39d353",
    tintHeatmap: opts.tintHeatmap ?? true,
    showProviders: opts.showProviders ?? true,
    showStats: opts.showStats ?? true,
    state: opts.state ?? "ready",
    years: opts.years ?? [],
    year: opts.year ?? null,
    today: opts.today ?? new Date(),
    getDays: opts.getDays ?? (() => []),
    providers: opts.providers ?? DEFAULT_PROVIDERS,
    onYearChange: opts.onYearChange ?? null,
    onProviderToggle: opts.onProviderToggle ?? null,
  };
  if (cfg.year == null && cfg.years.length) {
    cfg.year = cfg.years[cfg.years.length - 1] ?? null;
  }
  return cfg;
};

export const createInitialState = (cfg: ResolvedConfig): InternalState => ({
  year: cfg.year,
  providers: enabledProviderState(cfg.providers),
  yearModalOpen: false,
  selectedDay: cfg.today,
});
