import { normalizeEventsToDaily } from "../core/normalize";
import type { ContributionDay } from "../types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function validateInputDates(start: string, end: string): void {
  const failed = [
    [!isValidDate(start), `Invalid start date "${start}" (expected YYYY-MM-DD)`],
    [!isValidDate(end), `Invalid end date "${end}" (expected YYYY-MM-DD)`],
    [start > end, `Invalid range: start "${start}" must be <= end "${end}"`],
  ].find(([invalid]) => invalid);

  if (failed) throw new Error(String(failed[1]));
}

export function isValidDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function toCanonicalDays(
  days: ContributionDay[],
  start: string,
  end: string,
): ContributionDay[] {
  const rangeAnchors =
    start === end
      ? [{ date: start, count: 0 }]
      : [
          { date: start, count: 0 },
          { date: end, count: 0 },
        ];

  return normalizeEventsToDaily(days.length ? days : rangeAnchors);
}
