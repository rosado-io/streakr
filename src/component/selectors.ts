import type { StreakrDay, StreakrLeveledDay } from "../types";
import { padDaysToRange, padDaysToYear, yearToDateRange } from "./calendar";
import type { ComponentCtx, ResolvedConfig } from "./config";
import { sourceCount } from "./config";
import { computeStats, levelize, type StreakrStats } from "./metrics";

const MAX_VISIBLE_YEARS = 5;

export interface RenderFlags {
  isLoading: boolean;
  isEmpty: boolean;
  allOff: boolean;
  canEnableAll: boolean;
  days: StreakrDay[];
  providersWithDataCount: number;
  leveled: StreakrLeveledDay[];
  stats: StreakrStats;
}

export const isCurrentYear = (ctx: ComponentCtx): boolean =>
  ctx.state.year === ctx.cfg.today.getFullYear();

const activeDayTotal = (ctx: ComponentCtx, day: StreakrDay): number =>
  day.sources == null
    ? day.total
    : ctx.cfg.providers
        .filter((provider) => ctx.state.providers[provider.key])
        .reduce((total, provider) => total + sourceCount(day, provider.key), 0);

const getCurrentDays = (ctx: ComponentCtx): StreakrDay[] => {
  const { cfg, state } = ctx;
  if (cfg.state !== "ready" || state.year == null) return [];
  const currentYearDays = (cfg.getDays(state.year) || []).map((day) => ({
    ...day,
    total: activeDayTotal(ctx, day),
  }));
  if (!isCurrentYear(ctx)) return currentYearDays;
  const { start, end } = yearToDateRange(cfg.today);
  return currentYearDays.filter((day) => day.date >= start && day.date <= end);
};

const getHeatmapDays = (ctx: ComponentCtx, days: StreakrDay[]): StreakrDay[] => {
  if (ctx.state.year == null) return days;
  return padDaysToYear(days, ctx.state.year);
};

const getStatsDays = (ctx: ComponentCtx, days: StreakrDay[]): StreakrDay[] => {
  if (ctx.state.year == null) return days;
  if (isCurrentYear(ctx)) {
    const { start, end } = yearToDateRange(ctx.cfg.today);
    return padDaysToRange(days, start, end);
  }
  return padDaysToYear(days, ctx.state.year);
};

export const visibleYears = (
  cfg: ResolvedConfig,
): { visible: number[]; all: number[]; hasMore: boolean } => {
  const all = cfg.years.slice().reverse();
  return {
    visible: all.slice(0, MAX_VISIBLE_YEARS),
    all,
    hasMore: all.length > MAX_VISIBLE_YEARS,
  };
};

export const computeProviderTotals = (ctx: ComponentCtx): Record<string, number> => {
  const { cfg, state } = ctx;
  const totals = Object.fromEntries(cfg.providers.map((p) => [p.key, 0]));
  if (cfg.state !== "ready" || state.year == null) return totals;
  const raw = getCurrentDays(ctx);
  raw.forEach((d) => {
    cfg.providers.forEach((p) => {
      totals[p.key] += sourceCount(d, p.key);
    });
  });
  return totals;
};

export const computeRenderFlags = (ctx: ComponentCtx): RenderFlags => {
  const { cfg, state } = ctx;
  const days = getCurrentDays(ctx);
  const heatmapDays = getHeatmapDays(ctx, days);
  const statsDays = getStatsDays(ctx, days);
  const stats = computeStats(statsDays);
  const yearTotal = statsDays.reduce((a, d) => a + d.total, 0);
  const leveled = levelize(heatmapDays);
  const isLoading = cfg.state === "loading";
  const isEmpty = cfg.state === "empty" || (cfg.state === "ready" && yearTotal === 0);
  const hasTotalOnlyDays = days.some((day) => day.sources == null && day.total > 0);
  const allOff =
    !hasTotalOnlyDays &&
    cfg.providers.length > 0 &&
    cfg.providers.every((p) => !state.providers[p.key]);
  const canEnableAll =
    cfg.state === "ready" &&
    yearTotal === 0 &&
    cfg.providers.some(
      (provider) =>
        !state.providers[provider.key] && days.some((day) => sourceCount(day, provider.key) > 0),
    );
  const providersWithDataCount =
    cfg.state === "ready"
      ? cfg.providers.filter((p) => days.some((d) => sourceCount(d, p.key) > 0)).length
      : 0;
  return {
    isLoading,
    isEmpty,
    allOff,
    canEnableAll,
    days,
    providersWithDataCount,
    leveled,
    stats,
  };
};
