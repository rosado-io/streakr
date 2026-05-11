import type { ContributionDay, CalendarGrid, CalendarCell, GridOptions } from "../types";

/**
 * Builds a calendar grid (weeks × days) from a daily contribution series.
 *
 * The grid is structured like GitHub's contribution graph:
 * - Each column is a week
 * - Each row is a day of the week (0 = Sunday … 6 = Saturday, or 1 = Monday … 0 = Sunday)
 * - Cells contain contribution count and an intensity level (0–4)
 * - Empty leading/trailing cells are `null`
 *
 * @param days - Sorted array of ContributionDay (ascending by date)
 * @param options - Grid configuration (start/end dates, week start day)
 * @returns CalendarGrid with 2D cell matrix and total contributions
 */
export function buildCalendarGrid(days: ContributionDay[], options?: GridOptions): CalendarGrid {
  if (days.length === 0) {
    return { weeks: [], totalContributions: 0 };
  }

  const weekStartsOn = options?.weekStartsOn ?? 0;
  const startDate = options?.startDate ?? days[0].date;
  const endDate = options?.endDate ?? days[days.length - 1].date;
  const inRange = days.filter((d) => d.date >= startDate && d.date <= endDate);

  const dayMap = new Map<string, ContributionDay>();
  for (const d of inRange) {
    dayMap.set(d.date, d);
  }

  const maxCount = inRange.reduce((max, d) => Math.max(max, d.count), 0);
  const thresholds = computeThresholds(maxCount);

  const [sY, sM, sD] = startDate.split("-").map(Number);
  const [eY, eM, eD] = endDate.split("-").map(Number);
  const current = new Date(Date.UTC(sY, sM - 1, sD));
  const end = new Date(Date.UTC(eY, eM - 1, eD));

  if (current > end) {
    return { weeks: [], totalContributions: 0 };
  }

  const weeks: (CalendarCell | null)[][] = [];
  let currentWeek: (CalendarCell | null)[] = [];
  let totalContributions = 0;

  const firstDayOfWeek = adjustedDayOfWeek(current.getUTCDay(), weekStartsOn);
  for (let i = 0; i < firstDayOfWeek; i++) {
    currentWeek.push(null);
  }

  while (current <= end) {
    const dateStr = current.toISOString().slice(0, 10);
    const count = dayMap.get(dateStr)?.count ?? 0;
    const level = countToLevel(count, thresholds);

    currentWeek.push({ date: dateStr, count, level });
    totalContributions += count;

    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }

    current.setUTCDate(current.getUTCDate() + 1);
  }

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  return { weeks, totalContributions };
}

/**
 * Computes quartile-based thresholds for mapping counts to levels 0–4.
 */
function computeThresholds(maxCount: number): [number, number, number] {
  if (maxCount === 0) return [0, 0, 0];
  return [Math.ceil(maxCount * 0.25), Math.ceil(maxCount * 0.5), Math.ceil(maxCount * 0.75)];
}

/**
 * Maps a contribution count to an intensity level (0–4).
 */
function countToLevel(count: number, [q1, q2, q3]: [number, number, number]): number {
  const levels = [
    { level: 0, matches: count === 0 },
    { level: 1, matches: count < q1 },
    { level: 2, matches: count < q2 },
    { level: 3, matches: count < q3 },
  ];

  return levels.find(({ matches }) => matches)?.level ?? 4;
}

/**
 * Adjusts a UTC day-of-week (0=Sun…6=Sat) relative to the configured week start.
 */
function adjustedDayOfWeek(utcDay: number, weekStartsOn: number): number {
  return (utcDay - weekStartsOn + 7) % 7;
}
