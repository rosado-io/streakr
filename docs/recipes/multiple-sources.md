# Merge several sources

Normalize every collector to `{ date, count }`, then merge counts by date and
source before calling Streakr:

```ts
import type { StreakrDay } from "@rosado-io/streakr";

interface DailyCount {
  date: string;
  count: number;
}

export function mergeSources(input: Readonly<Record<string, readonly DailyCount[]>>): StreakrDay[] {
  const byDate = new Map<string, Record<string, number>>();

  for (const [source, days] of Object.entries(input)) {
    for (const day of days) {
      const sources = byDate.get(day.date) ?? {};
      sources[source] = (sources[source] ?? 0) + day.count;
      byDate.set(day.date, sources);
    }
  }

  return [...byDate]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, sources]) => ({
      date,
      count: Object.values(sources).reduce((total, count) => total + count, 0),
      sources,
    }));
}

const days = mergeSources({
  github: githubDays,
  gitlab: gitlabDays,
  local: localDays,
});
```

Declare matching visual sources:

```ts
createStreakr({
  target,
  years: [2026],
  days,
  sources: [
    { key: "github", name: "GitHub", color: "#39d353" },
    { key: "gitlab", name: "GitLab", color: "#fc6d26" },
    { key: "local", name: "Local", color: "#4f8cff" },
  ],
});
```
