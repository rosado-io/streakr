import type { ContributionDay } from "../types";

function mergeSources(
  current: ContributionDay["sources"] = {},
  next: ContributionDay["sources"] = {},
): ContributionDay["sources"] {
  const entries = Object.entries(next).map(([source, count]) => [
    source,
    (current[source] ?? 0) + count,
  ]);

  return Object.keys(next).length ? { ...current, ...Object.fromEntries(entries) } : current;
}

function cloneDay(day: ContributionDay): ContributionDay {
  return {
    date: day.date,
    count: day.count,
    ...(day.sources ? { sources: { ...day.sources } } : {}),
  };
}

function mergeDay(existing: ContributionDay | undefined, next: ContributionDay): ContributionDay {
  if (!existing) return cloneDay(next);

  const sources = next.sources ? mergeSources(existing.sources, next.sources) : existing.sources;
  return {
    date: existing.date,
    count: existing.count + next.count,
    ...(sources ? { sources } : {}),
  };
}

/**
 * Normalizes raw contribution events into a consistent, gap-free daily series.
 *
 * 1. Merges duplicate dates (summing counts, combining sources)
 * 2. Fills in missing days with `{ count: 0 }` entries
 * 3. Sorts the result chronologically (ascending)
 *
 * @param events - Raw contribution days (may have gaps, duplicates, or be unsorted)
 * @returns A contiguous, sorted array of ContributionDay from min to max date.
 *          Returns an empty array if no events are provided.
 */
export function normalizeEventsToDaily(events: ContributionDay[]): ContributionDay[] {
  if (events.length === 0) return [];

  const merged = new Map<string, ContributionDay>();

  for (const event of events) {
    merged.set(event.date, mergeDay(merged.get(event.date), event));
  }

  const dates = [...merged.keys()].sort((a, b) => a.localeCompare(b));
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];

  const result: ContributionDay[] = [];
  const [startY, startM, startD] = startDate.split("-").map(Number);
  const [endY, endM, endD] = endDate.split("-").map(Number);
  const current = new Date(Date.UTC(startY, startM - 1, startD));
  const end = new Date(Date.UTC(endY, endM - 1, endD));

  while (current <= end) {
    const dateStr = current.toISOString().slice(0, 10);
    result.push(merged.get(dateStr) ?? { date: dateStr, count: 0 });
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return result;
}
