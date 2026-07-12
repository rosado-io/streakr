import type { ContributionDay, CalendarGrid, CalendarCell, GridOptions } from "../types";
import { formatDateYYYYMMDD } from "./normalize";
import { computeLevelThresholds, countToLevel } from "./leveling";

const adjustedDayOfWeek = (utcDay: number, weekStartsOn: number): number =>
  (utcDay - weekStartsOn + 7) % 7;

export const buildCalendarGrid = (days: ContributionDay[], options?: GridOptions): CalendarGrid => {
  if (days.length === 0) {
    return { weeks: [], totalContributions: 0 };
  }

  const weekStartsOn = options?.weekStartsOn ?? 0;
  const startDate = options?.startDate ?? days[0].date;
  const endDate = options?.endDate ?? days[days.length - 1].date;
  const inRange = days.filter((d) => d.date >= startDate && d.date <= endDate);

  const dayMap = new Map(inRange.map((d) => [d.date, d]));
  const thresholds = computeLevelThresholds(inRange.map((d) => d.count));

  const [sY, sM, sD] = startDate.split("-").map(Number);
  const [eY, eM, eD] = endDate.split("-").map(Number);
  const startUTC = Date.UTC(sY, sM - 1, sD);
  const endUTC = Date.UTC(eY, eM - 1, eD);

  if (startUTC > endUTC) {
    return { weeks: [], totalContributions: 0 };
  }

  const dayCount = Math.round((endUTC - startUTC) / (1000 * 60 * 60 * 24)) + 1;
  const firstDayOfWeek = adjustedDayOfWeek(new Date(startUTC).getUTCDay(), weekStartsOn);

  const cells = [
    ...new Array<CalendarCell | null>(firstDayOfWeek).fill(null),
    ...Array.from({ length: dayCount }, (_, i) => {
      const d = new Date(Date.UTC(sY, sM - 1, sD + i));
      const dateStr = formatDateYYYYMMDD(d);
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
