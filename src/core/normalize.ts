import type { ContributionDay } from "../types";

/**
 * Normalizes raw events into a consistent daily contribution series.
 * Fills in missing days with count 0.
 */
export function normalizeEventsToDaily(
  _events: ContributionDay[],
  _timezone?: string,
): ContributionDay[] {
  // TODO: Implement in STR-10
  return [];
}
