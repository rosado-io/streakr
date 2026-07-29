# Custom API recipe

Keep authentication, caching, retries, and provider-specific schemas in your
application. Return Streakr's contract from the endpoint:

```json
[
  {
    "date": "2026-07-28",
    "count": 7,
    "sources": { "work": 5, "personal": 2 }
  }
]
```

```ts
import { createStreakr, type StreakrDay } from "@rosado-io/streakr";

const years = [2024, 2025, 2026];
let selectedYear = 2026;

const streakr = createStreakr({
  target: document.querySelector<HTMLElement>("#streakr")!,
  years,
  year: selectedYear,
  days: [],
  status: "loading",
  sources: [
    { key: "work", name: "Work", color: "#39d353" },
    { key: "personal", name: "Personal", color: "#4f8cff" },
  ],
  onYearChange(year) {
    selectedYear = year;
    void load(year);
  },
});

async function load(year: number): Promise<void> {
  streakr.update({ year, status: "loading" });
  try {
    const response = await fetch(`/api/activity?year=${year}`);
    if (!response.ok) throw new Error(`Request failed (${response.status})`);
    const days = (await response.json()) as StreakrDay[];
    streakr.update({ days, status: "ready" });
  } catch {
    streakr.update({
      status: "error",
      errorMessage: `Activity for ${selectedYear} could not be loaded.`,
    });
  }
}

void load(selectedYear);
```

Streakr validates the response before rendering. Validate untrusted payloads at
your API boundary as well, especially when they originate outside your system.
