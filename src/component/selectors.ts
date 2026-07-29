import { padDaysToRange, padDaysToYear, yearToDateRange } from "./calendar";
import type { ComponentCtx, ResolvedConfig } from "./config";
import { sourceCount } from "./config";
import { computeStats, levelize, type StreakrStats } from "./metrics";
import type { LeveledDay, RenderableDay } from "./types";

const MAX_VISIBLE_YEARS = 5;

export interface RenderFlags {
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  allOff: boolean;
  canEnableAll: boolean;
  days: RenderableDay[];
  sourcesWithDataCount: number;
  sourceTotals: Record<string, number>;
  leveled: LeveledDay[];
  stats: StreakrStats;
}

export const isCurrentYear = (ctx: ComponentCtx): boolean =>
  ctx.state.year === ctx.cfg.today.getFullYear();

const activeDayTotal = (ctx: ComponentCtx, day: RenderableDay): number =>
  day.sources == null
    ? day.total
    : ctx.cfg.sources
        .filter((source) => ctx.state.sources[source.key])
        .reduce((total, source) => total + sourceCount(day, source.key), 0);

const getCurrentDays = (ctx: ComponentCtx): RenderableDay[] => {
  const { cfg, state } = ctx;
  if (cfg.status !== "ready" || state.year == null) return [];
  const currentYearDays = cfg.days
    .filter((day) => day.date.getFullYear() === state.year)
    .map((day) => ({
      ...day,
      total: activeDayTotal(ctx, day),
    }));
  if (!isCurrentYear(ctx)) return currentYearDays;
  const { start, end } = yearToDateRange(cfg.today);
  return currentYearDays.filter((day) => day.date >= start && day.date <= end);
};

const getHeatmapDays = (ctx: ComponentCtx, days: RenderableDay[]): RenderableDay[] => {
  if (ctx.state.year == null) return days;
  return padDaysToYear(days, ctx.state.year);
};

const getStatsDays = (ctx: ComponentCtx, days: RenderableDay[]): RenderableDay[] => {
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

const computeSourceTotals = (
  ctx: ComponentCtx,
  days: readonly RenderableDay[],
): Record<string, number> => {
  const totals = Object.fromEntries(ctx.cfg.sources.map((source) => [source.key, 0]));
  days.forEach((day) => {
    ctx.cfg.sources.forEach((source) => {
      totals[source.key] = (totals[source.key] ?? 0) + sourceCount(day, source.key);
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
  const yearTotal = statsDays.reduce((total, day) => total + day.total, 0);
  const leveled = levelize(heatmapDays);
  const isLoading = cfg.status === "loading";
  const isError = cfg.status === "error";
  const isEmpty = cfg.status === "empty" || (cfg.status === "ready" && yearTotal === 0);
  const hasTotalOnlyDays = days.some((day) => day.sources == null && day.total > 0);
  const allOff =
    !hasTotalOnlyDays &&
    cfg.sources.length > 0 &&
    cfg.sources.every((source) => !state.sources[source.key]);
  const canEnableAll =
    cfg.status === "ready" &&
    yearTotal === 0 &&
    cfg.sources.some(
      (source) =>
        !state.sources[source.key] && days.some((day) => sourceCount(day, source.key) > 0),
    );
  const sourcesWithDataCount =
    cfg.status === "ready"
      ? cfg.sources.filter((source) => days.some((day) => sourceCount(day, source.key) > 0)).length
      : 0;

  return {
    isLoading,
    isError,
    isEmpty,
    allOff,
    canEnableAll,
    days,
    sourcesWithDataCount,
    sourceTotals: computeSourceTotals(ctx, days),
    leveled,
    stats,
  };
};
