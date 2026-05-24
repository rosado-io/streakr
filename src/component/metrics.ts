import type { StreakrDay, StreakrLeveledDay } from "../types";

export interface StreakrStats {
  total: number;
  active: number;
  best: number;
  current: number;
}

const LEVEL_PERCENTILES = [0.25, 0.55, 0.8] as const;

export function levelize(days: StreakrDay[]): StreakrLeveledDay[] {
  const counts = days
    .map((day) => day.total)
    .filter((total) => total > 0)
    .sort((a, b) => a - b);

  if (!counts.length) {
    return days.map((day) => ({ ...day, level: 0 }));
  }

  const p = (q: number) => counts[Math.min(counts.length - 1, Math.floor(counts.length * q))];
  const t1 = p(LEVEL_PERCENTILES[0]);
  const t2 = p(LEVEL_PERCENTILES[1]);
  const t3 = p(LEVEL_PERCENTILES[2]);

  return days.map((day) => {
    let level: 0 | 1 | 2 | 3 | 4 = 0;
    if (day.total > 0) level = 1;
    if (day.total > t1) level = 2;
    if (day.total > t2) level = 3;
    if (day.total > t3) level = 4;
    return { ...day, level };
  });
}

export function computeStats(days: StreakrDay[]): StreakrStats {
  let total = 0;
  let active = 0;
  let best = 0;
  let curRun = 0;

  for (let i = 0; i < days.length; i++) {
    const val = days[i].total;
    total += val;
    if (val > 0) {
      active++;
      curRun++;
      if (curRun > best) best = curRun;
    } else {
      curRun = 0;
    }
  }

  let current = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].total > 0) {
      current++;
    } else {
      break;
    }
  }

  return { total, active, best, current };
}

export function formatTotalLabel(total: number): string {
  const labels = new Map([
    [0, "No contributions"],
    [1, "1 contribution"],
  ]);
  return labels.get(total) ?? `${total} contributions`;
}
