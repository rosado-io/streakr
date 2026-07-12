export type Level = 0 | 1 | 2 | 3 | 4;

const LEVEL_PERCENTILES = [0.25, 0.55, 0.8] as const;

// Leveling maps a contribution count to one of five intensity buckets (0–4).
// Thresholds are sampled at the 25th, 55th and 80th percentiles of the
// non-zero counts, so the scale adapts to skewed distributions — a handful of
// very-high days no longer compress every other active day into level 1. A
// count of 0 is always level 0; otherwise the level is the first bucket whose
// upper threshold the count does not exceed, capped at 4.
//
// This is the single source of truth shared by `buildCalendarGrid` (core) and
// `levelize` (component), so the same input produces the same level on either
// path. Percentiles were chosen over fixed max-quartiles because real
// contribution data is right-skewed (most days low, a few very high); the
// distribution-based thresholds keep the mid-range visibly graduated instead of
// collapsing it into level 1.
export const computeLevelThresholds = (counts: number[]): [number, number, number] => {
  const active = counts.filter((c) => c > 0).sort((a, b) => a - b);
  if (active.length === 0) return [0, 0, 0];
  const at = (q: number) => active[Math.min(active.length - 1, Math.floor(active.length * q))];
  return [at(LEVEL_PERCENTILES[0]), at(LEVEL_PERCENTILES[1]), at(LEVEL_PERCENTILES[2])];
};

export const countToLevel = (count: number, [t1, t2, t3]: [number, number, number]): Level => {
  if (count <= 0) return 0;
  if (count <= t1) return 1;
  if (count <= t2) return 2;
  if (count <= t3) return 3;
  return 4;
};

export const computeLevels = (counts: number[]): Level[] => {
  const thresholds = computeLevelThresholds(counts);
  return counts.map((c) => countToLevel(c, thresholds));
};
