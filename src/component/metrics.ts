import type { StreakrDay, StreakrLeveledDay } from "../types";

export interface StreakrStats {
  total: number;
  active: number;
  best: number;
  current: number;
}

interface RunningStats extends StreakrStats {
  run: number;
}

const LEVEL_THRESHOLDS = [
  { level: 4, exceeds: 0.8 },
  { level: 3, exceeds: 0.55 },
  { level: 2, exceeds: 0.25 },
  { level: 1, exceeds: null },
] as const;

function percentile(counts: number[], q: number): number {
  return counts[Math.min(counts.length - 1, Math.floor(counts.length * q))];
}

function levelForTotal(total: number, counts: number[]): StreakrLeveledDay["level"] {
  const match = LEVEL_THRESHOLDS.find(({ exceeds }) =>
    exceeds == null ? total > 0 : total > percentile(counts, exceeds),
  );
  return match?.level ?? 0;
}

export function levelize(days: StreakrDay[]): StreakrLeveledDay[] {
  const counts = days
    .map((day) => day.total)
    .filter((total) => total > 0)
    .sort((a, b) => a - b);

  return days.map((day) => ({
    ...day,
    level: counts.length ? levelForTotal(day.total, counts) : 0,
  }));
}

export function computeStats(days: StreakrDay[]): StreakrStats {
  const { run: _run, ...stats } = days.reduce<RunningStats>(
    (stats, day) => {
      const active = day.total > 0;
      const run = active ? stats.run + 1 : 0;

      return {
        total: stats.total + day.total,
        active: stats.active + Number(active),
        best: Math.max(stats.best, run),
        current: run,
        run,
      };
    },
    { total: 0, active: 0, best: 0, current: 0, run: 0 },
  );

  return stats;
}

export function formatTotalLabel(total: number): string {
  const labels = new Map([
    [0, "No contributions"],
    [1, "1 contribution"],
  ]);
  return labels.get(total) ?? `${total} contributions`;
}
