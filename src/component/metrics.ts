import type { StreakrDay, StreakrLeveledDay } from "../types";

export interface StreakrStats {
  total: number;
  active: number;
  best: number;
  current: number;
}

const LEVEL_PERCENTILES = [0.25, 0.55, 0.8] as const;

const getDayLevel = (total: number, t1: number, t2: number, t3: number): 0 | 1 | 2 | 3 | 4 => {
  if (total <= 0) return 0;
  if (total <= t1) return 1;
  if (total <= t2) return 2;
  if (total <= t3) return 3;
  return 4;
};

export const levelize = (days: StreakrDay[]): StreakrLeveledDay[] => {
  const counts = days
    .map((day) => day.total)
    .filter((total) => total > 0)
    .sort((a, b) => a - b);

  const p = (q: number) => counts[Math.min(counts.length - 1, Math.floor(counts.length * q))];
  const t1 = p(LEVEL_PERCENTILES[0]);
  const t2 = p(LEVEL_PERCENTILES[1]);
  const t3 = p(LEVEL_PERCENTILES[2]);

  return counts.length === 0
    ? days.map((day) => ({ ...day, level: 0 }))
    : days.map((day) => ({
        ...day,
        level: getDayLevel(day.total, t1, t2, t3),
      }));
};

const nextStreakState = (
  acc: { count: number; halted: boolean },
  total: number,
): { count: number; halted: boolean } => {
  if (acc.halted) return acc;
  if (total > 0) return { count: acc.count + 1, halted: false };
  return { count: acc.count, halted: true };
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
  const current = days.reduceRight((acc, d) => nextStreakState(acc, d.total), {
    count: 0,
    halted: false,
  }).count;

  return { total, active, best, current };
};

export const formatTotalLabel = (total: number): string => {
  if (total === 0) return "No contributions";
  if (total === 1) return "1 contribution";
  return `${total} contributions`;
};
