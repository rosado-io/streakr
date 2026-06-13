import type { StreakrDay, StreakrLeveledDay } from "../types";

export interface StreakrStats {
  total: number;
  active: number;
  best: number;
  current: number;
}

const LEVEL_PERCENTILES = [0.25, 0.55, 0.8] as const;

export const levelize = (days: StreakrDay[]): StreakrLeveledDay[] => {
  const counts = days
    .map((day) => day.total)
    .filter((total) => total > 0)
    .sort((a, b) => a - b);

  const p = (q: number) => counts[Math.min(counts.length - 1, Math.floor(counts.length * q))];
  const t1 = p(LEVEL_PERCENTILES[0]);
  const t2 = p(LEVEL_PERCENTILES[1]);
  const t3 = p(LEVEL_PERCENTILES[2]);

  return !counts.length
    ? days.map((day) => ({ ...day, level: 0 }))
    : days.map((day) => ({
        ...day,
        level:
          day.total <= 0 ? 0 : day.total <= t1 ? 1 : day.total <= t2 ? 2 : day.total <= t3 ? 3 : 4,
      }));
};

export const computeStats = (days: StreakrDay[]): StreakrStats => {
  const total = days.reduce((sum, d) => sum + d.total, 0);
  const active = days.reduce((count, d) => count + (d.total > 0 ? 1 : 0), 0);
  const best = days.reduce(
    (acc, d) => {
      const curRun = d.total > 0 ? acc.curRun + 1 : 0;
      return {
        best: Math.max(acc.best, curRun),
        curRun,
      };
    },
    { best: 0, curRun: 0 },
  ).best;
  const current = days.reduceRight(
    (acc, d) =>
      acc.halted
        ? acc
        : d.total > 0
          ? { count: acc.count + 1, halted: false }
          : { count: acc.count, halted: true },
    { count: 0, halted: false },
  ).count;

  return { total, active, best, current };
};

export const formatTotalLabel = (total: number): string =>
  total === 0 ? "No contributions" : total === 1 ? "1 contribution" : `${total} contributions`;
