import type { ContributionDay, CalendarGrid, CalendarCell, GridOptions } from "../types";
import { addDays, daysInRange, toUTC } from "./date";
import { computeLevelThresholds, countToLevel } from "./leveling";

const adjustedDayOfWeek = (utcDay: number, weekStartsOn: number): number =>
  (utcDay - weekStartsOn + 7) % 7;

export const buildCalendarGrid = (days: ContributionDay[], options?: GridOptions): CalendarGrid => {
  if (days.length === 0) {
    return { weeks: [], totalContributions: 0 };
  }

  const first = days[0];
  const last = days[days.length - 1];
  if (!first || !last) {
    return { weeks: [], totalContributions: 0 };
  }

  const weekStartsOn = options?.weekStartsOn ?? 0;
  const startDate = options?.startDate ?? first.date;
  const endDate = options?.endDate ?? last.date;
  const inRange = days.filter((d) => d.date >= startDate && d.date <= endDate);

  const dayMap = new Map(inRange.map((d) => [d.date, d]));
  const thresholds = computeLevelThresholds(inRange.map((d) => d.count));

  if (startDate > endDate) {
    return { weeks: [], totalContributions: 0 };
  }

  const firstDayOfWeek = adjustedDayOfWeek(new Date(toUTC(startDate)).getUTCDay(), weekStartsOn);

  const cells = [
    ...new Array<CalendarCell | null>(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInRange(startDate, endDate) }, (_, i) => {
      const dateStr = addDays(startDate, i);
      const count = dayMap.get(dateStr)?.count ?? 0;
      return { date: dateStr, count, level: countToLevel(count, thresholds) };
    }),
  ];

  const totalCells = Math.ceil(cells.length / 7) * 7;
  const paddedCells = [
    ...cells,
    ...new Array<CalendarCell | null>(totalCells - cells.length).fill(null),
  ];

  const weeks = Array.from({ length: paddedCells.length / 7 }, (_, i) =>
    paddedCells.slice(i * 7, (i + 1) * 7),
  );

  const totalContributions = inRange.reduce((sum, d) => sum + d.count, 0);

  return { weeks, totalContributions };
};
