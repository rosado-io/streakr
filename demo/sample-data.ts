import type { StreakrDay } from "../src/index";

function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function agentAdoption(year: number): number {
  if (year >= 2026) return 0.7;
  if (year === 2025) return 0.45;
  if (year === 2024) return 0.2;
  return 0;
}

function generateYear(year: number, seed: number): StreakrDay[] {
  const rand = seeded(seed);
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  const days: StreakrDay[] = [];
  const cur = new Date(start);
  const adoption = agentAdoption(year);
  while (cur <= end) {
    const dow = cur.getDay();
    const weekendBias = dow === 0 || dow === 6 ? 0.55 : 1;
    const burst = rand() < 0.08 ? 2.4 : 1;
    const empty = rand() < 0.18 ? 0 : 1;
    const total = Math.max(0, Math.round(rand() * 8 * weekendBias * burst * empty));
    let github = 0;
    let gitlab = 0;
    if (total > 0) {
      const r = rand();
      if (r < 0.6) {
        github = Math.round(total * (0.6 + rand() * 0.4));
        gitlab = Math.max(0, total - github);
      } else {
        gitlab = Math.round(total * (0.5 + rand() * 0.4));
        github = Math.max(0, total - gitlab - Math.round(rand()));
      }
    }
    let claude = 0;
    let codex = 0;
    let opencode = 0;
    let copilot = 0;
    if (total > 0 && adoption > 0 && rand() < adoption) {
      claude = 1 + Math.round(rand() * 4 * adoption * burst);
      if (rand() < 0.3) codex = Math.round(rand() * 3);
      if (rand() < 0.2) copilot = Math.round(rand() * 2);
      if (rand() < 0.12) opencode = Math.round(rand() * 2);
    }
    days.push({
      date: new Date(cur),
      total: github + gitlab + claude + codex + opencode + copilot,
      sources: { github, gitlab, claude, codex, opencode, copilot },
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

export const StreakrSampleData = {
  availableYears: YEARS_LIST,
  getDays: (year: number): StreakrDay[] => YEARS[year] ?? [],
  today: TODAY,
};
