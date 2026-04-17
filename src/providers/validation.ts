import { normalizeEventsToDaily } from "../core/normalize";
import type { ContributionDay } from "../types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function validateInputDates(start: string, end: string): void {
  if (!isValidDate(start)) throw new Error(`Invalid start date "${start}" (expected YYYY-MM-DD)`);
  if (!isValidDate(end)) throw new Error(`Invalid end date "${end}" (expected YYYY-MM-DD)`);
  if (start > end) throw new Error(`Invalid range: start "${start}" must be <= end "${end}"`);
}

export function isValidDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function toCanonicalDays(days: ContributionDay[], start: string, end: string): ContributionDay[] {
  if (days.length > 0) return normalizeEventsToDaily(days);

  return start === end
    ? normalizeEventsToDaily([{ date: start, count: 0 }])
    : normalizeEventsToDaily([{ date: start, count: 0 }, { date: end, count: 0 }]);
}
