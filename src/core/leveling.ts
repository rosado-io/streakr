export type Level = 0 | 1 | 2 | 3 | 4;

const LEVEL_PERCENTILES = [0.25, 0.55, 0.8] as const;

export const computeLevelThresholds = (counts: number[]): [number, number, number] => {
  const active = counts.filter((c) => c > 0).sort((a, b) => a - b);
  if (active.length === 0) return [0, 0, 0];
  const at = (q: number): number =>
    active[Math.min(active.length - 1, Math.floor(active.length * q))] ?? 0;
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
