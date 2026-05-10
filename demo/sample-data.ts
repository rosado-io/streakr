import type { StreakrDay } from "../src/index";

function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function generateYear(year: number, seed: number): StreakrDay[] {
  const rand = seeded(seed);
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  const days: StreakrDay[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    const dow = cur.getDay();
    const weekendBias = dow === 0 || dow === 6 ? 0.55 : 1;
    const burst = rand() < 0.08 ? 2.4 : 1;
    const empty = rand() < 0.18 ? 0 : 1;
    const total = Math.max(0, Math.round(rand() * 8 * weekendBias * burst * empty));
    let github = 0;
    let gitlab = 0;
    let bitbucket = 0;
    if (total > 0) {
      const r = rand();
      if (r < 0.55) {
        github = Math.round(total * (0.6 + rand() * 0.4));
        gitlab = Math.max(0, total - github - Math.round(rand()));
        bitbucket = Math.max(0, total - github - gitlab);
      } else if (r < 0.85) {
        gitlab = Math.round(total * (0.5 + rand() * 0.4));
        github = Math.max(0, total - gitlab - Math.round(rand()));
        bitbucket = Math.max(0, total - github - gitlab);
      } else {
        bitbucket = Math.round(total * (0.4 + rand() * 0.4));
        github = Math.max(0, total - bitbucket - Math.round(rand()));
        gitlab = Math.max(0, total - github - bitbucket);
      }
    }
    days.push({
      date: new Date(cur),
      total: github + gitlab + bitbucket,
      sources: { github, gitlab, bitbucket },
    });
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

const YEARS_LIST = [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
const YEARS: Record<number, StreakrDay[]> = {};
YEARS_LIST.forEach((y, i) => {
  YEARS[y] = generateYear(y, 1000 + i * 137);
});

const TODAY = new Date(2026, 3, 26);
YEARS[2026] = YEARS[2026].filter((d) => d.date <= TODAY);

function rolling12(): StreakrDay[] {
  const all = [...(YEARS[2024] ?? []), ...(YEARS[2025] ?? []), ...(YEARS[2026] ?? [])];
  const cutoff = new Date(TODAY);
  cutoff.setDate(cutoff.getDate() - 371);
  cutoff.setDate(cutoff.getDate() - cutoff.getDay());
  return all.filter((d) => d.date >= cutoff && d.date <= TODAY);
}

export const StreakrSampleData = {
  availableYears: YEARS_LIST,
  getDays: (year: number): StreakrDay[] =>
    year === 2026 ? rolling12() : YEARS[year] ?? [],
  rolling12,
  today: TODAY,
};
