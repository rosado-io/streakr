import type { ContributionDay, CalendarGrid, GridOptions } from "../types";

/**
 * Builds a calendar grid (weeks × days) from a daily contribution series.
 * Structured like GitHub's contribution graph.
 */
export function buildCalendarGrid(_days: ContributionDay[], _options?: GridOptions): CalendarGrid {
  // TODO: Implement in STR-12
  return { weeks: [], totalContributions: 0 };
}
