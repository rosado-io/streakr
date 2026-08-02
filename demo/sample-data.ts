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

function dayTotal(rand: () => number, dow: number): number {
  const weekendBias = dow === 0 || dow === 6 ? 0.55 : 1;
  const burst = rand() < 0.08 ? 2.4 : 1;
  const empty = rand() < 0.18 ? 0 : 1;
  return Math.max(0, Math.round(rand() * 8 * weekendBias * burst * empty));
}

function humanCounts(rand: () => number, total: number): { github: number; gitlab: number } {
  if (total === 0) return { github: 0, gitlab: 0 };
  if (rand() < 0.6) {
    const github = Math.round(total * (0.6 + rand() * 0.4));
    return { github, gitlab: Math.max(0, total - github) };
  }
  const gitlab = Math.round(total * (0.5 + rand() * 0.4));
  return { github: Math.max(0, total - gitlab - Math.round(rand())), gitlab };
}

function agentCounts(
  rand: () => number,
  total: number,
  adoption: number,
): {
  claude: number;
  codex: number;
  opencode: number;
  copilot: number;
  kimi: number;
  antigravity: number;
} {
  const none = { claude: 0, codex: 0, opencode: 0, copilot: 0, kimi: 0, antigravity: 0 };
  if (total === 0 || adoption === 0 || rand() >= adoption) return none;
  return {
    claude: 1 + Math.round(rand() * 4 * adoption),
    codex: rand() < 0.3 ? Math.round(rand() * 3) : 0,
    copilot: rand() < 0.2 ? Math.round(rand() * 2) : 0,
    opencode: rand() < 0.12 ? Math.round(rand() * 2) : 0,
    kimi: rand() < 0.25 ? Math.round(rand() * 3) : 0,
    antigravity: rand() < 0.15 ? Math.round(rand() * 2) : 0,
  };
}

function generateYear(year: number, seed: number): StreakrDay[] {
  const rand = seeded(seed);
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  const days: StreakrDay[] = [];
  const cur = new Date(start);
  const adoption = agentAdoption(year);
  while (cur <= end) {
    const total = dayTotal(rand, cur.getDay());
    const { github, gitlab } = humanCounts(rand, total);
    const { claude, codex, opencode, copilot, kimi, antigravity } = agentCounts(
      rand,
      total,
      adoption,
    );
    days.push({
      date: [
        cur.getFullYear(),
        String(cur.getMonth() + 1).padStart(2, "0"),
        String(cur.getDate()).padStart(2, "0"),
      ].join("-"),
      count: github + gitlab + claude + codex + opencode + copilot + kimi + antigravity,
      sources: { github, gitlab, claude, codex, opencode, copilot, kimi, antigravity },
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

const TODAY = "2026-04-26";
YEARS[2026] = YEARS[2026].filter((day) => day.date <= TODAY);

export const StreakrSampleData = {
  availableYears: YEARS_LIST,
  days: YEARS_LIST.flatMap((year) => YEARS[year] ?? []),
  today: TODAY,
};
