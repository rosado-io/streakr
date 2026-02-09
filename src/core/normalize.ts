import type { ContributionDay } from "../types";

/**
 * Normalizes raw contribution events into a consistent, gap-free daily series.
 *
 * What it does:
 * 1. Merges duplicate dates (summing counts, combining sources)
 * 2. Fills in missing days with `{ count: 0 }` entries
 * 3. Sorts the result chronologically (ascending)
 *
 * @param events - Raw contribution days (may have gaps, duplicates, or be unsorted)
 * @param timezone - IANA timezone string (e.g. "America/Chicago"). Currently a placeholder
 *                   for future use — all dates are treated as YYYY-MM-DD strings.
 * @returns A contiguous, sorted array of ContributionDay from min to max date.
 *          Returns an empty array if no events are provided.
 */
export function normalizeEventsToDaily(
  events: ContributionDay[],
  _timezone?: string,
): ContributionDay[] {
  if (events.length === 0) return [];

  // Step 1: Merge duplicates — group by date, sum counts, merge sources
  const merged = new Map<string, ContributionDay>();

  for (const event of events) {
    const existing = merged.get(event.date);
    if (existing) {
      existing.count += event.count;
      if (event.sources) {
        if (!existing.sources) existing.sources = {};
        for (const [source, count] of Object.entries(event.sources)) {
          existing.sources[source] = (existing.sources[source] ?? 0) + count;
        }
      }
    } else {
      merged.set(event.date, {
        date: event.date,
        count: event.count,
        ...(event.sources ? { sources: { ...event.sources } } : {}),
      });
    }
  }

  // Step 2: Find date range
  const dates = [...merged.keys()].sort();
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];

  // Step 3: Fill gaps — iterate day by day from start to end
  const result: ContributionDay[] = [];
  const current = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");

  while (current <= end) {
    const dateStr = current.toISOString().slice(0, 10);
    const day = merged.get(dateStr);

    result.push(day ?? { date: dateStr, count: 0 });

    current.setDate(current.getDate() + 1);
  }

  return result;
}
