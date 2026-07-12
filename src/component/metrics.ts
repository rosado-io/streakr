import type { StreakrDay, StreakrLeveledDay } from "../types";
import { computeLevels } from "../core/leveling";

export interface StreakrStats {
  total: number;
  active: number;
  best: number;
  current: number;
}

export const levelize = (days: StreakrDay[]): StreakrLeveledDay[] => {
  const levels = computeLevels(days.map((day) => day.total));
  return days.map((day, i) => ({ ...day, level: levels[i] }));
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
