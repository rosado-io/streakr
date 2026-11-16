# Day detail panel

Keep activity records and fetching in your application. Streakr emits a
`StreakrDay` with the date and filtered totals; it does not fetch details.

```html
<div id="streakr"></div>
<p id="detail" role="status" aria-live="polite">Select a day to explore.</p>
```

```ts
import { createStreakr, type StreakrDay } from "@rosado-io/streakr";
import "@rosado-io/streakr/styles.css";

const target = document.querySelector<HTMLElement>("#streakr")!;
const detail = document.querySelector<HTMLElement>("#detail")!;
let pending: AbortController | undefined;

function clearDetail() {
  pending?.abort();
  detail.textContent = "Select a day to explore.";
}

async function showDay(day: StreakrDay) {
  pending?.abort();
  const request = new AbortController();
  pending = request;
  detail.textContent = `Loading activity for ${day.date}…`;
  try {
    // Pass the selected source keys to an application-owned endpoint.
    const query = new URLSearchParams({ date: day.date });
    if (day.sources) query.set("sources", Object.keys(day.sources).join(","));
    const response = await fetch(`/api/activity/details?${query}`, { signal: request.signal });
    if (!response.ok) throw new Error(`Request failed (${response.status})`);
    // This example endpoint returns a plain-text summary.
    const summary = await response.text();
    if (request.signal.aborted) return;
    detail.textContent = `${day.date} · ${day.count} contributions. ${summary}`;
  } catch {
    if (request.signal.aborted) return;
    detail.textContent = `Could not load activity for ${day.date}. Select the day to retry.`;
  }
}

const streakr = createStreakr({
  target,
  years: [2026],
  days: [{ date: "2026-07-28", count: 7 }],
  onDaySelect: (day) => { void showDay(day); },
  onYearChange: clearDetail,
  onSourceToggle: clearDetail,
});

// On teardown, abort outstanding requests before removing the component.
function dispose() {
  pending?.abort();
  streakr.destroy();
}
```

Clear or recompute the detail panel when updating data or filters programmatically,
since `update()` and `setSources()` do not emit `onDaySelect`. Validate structured
API responses at your application boundary before rendering records.
