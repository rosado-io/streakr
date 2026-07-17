import type { ContributionDay } from "../types";
import { addDays, daysInRange } from "./date";

const mergeSources = (
  current: ContributionDay["sources"] = {},
  next: ContributionDay["sources"] = {},
): ContributionDay["sources"] => {
  const entries = Object.entries(next).map(([source, count]): [string, number] => [
    source,
    (current[source] ?? 0) + count,
  ]);
  return Object.keys(next).length ? { ...current, ...Object.fromEntries(entries) } : current;
};

const cloneDay = (day: ContributionDay): ContributionDay => {
  const sources = day.sources;
  return {
    date: day.date,
    count: day.count,
    ...(sources ? { sources: { ...sources } } : {}),
  };
};

const mergeDay = (
  existing: ContributionDay | undefined,
  next: ContributionDay,
): ContributionDay => {
  if (!existing) return cloneDay(next);
  const sources =
    next.sources || existing.sources ? mergeSources(existing.sources, next.sources) : undefined;
  return {
    date: existing.date,
    count: existing.count + next.count,
    ...(sources ? { sources } : {}),
  };
};

export const normalizeEventsToDaily = (events: ContributionDay[]): ContributionDay[] => {
  if (events.length === 0) return [];

  const merged = events.reduce((acc, event) => {
    acc.set(event.date, mergeDay(acc.get(event.date), event));
    return acc;
  }, new Map<string, ContributionDay>());

  const dates = [...merged.keys()].sort((a, b) => a.localeCompare(b));
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];
  if (startDate === undefined || endDate === undefined) return [];

  return Array.from({ length: daysInRange(startDate, endDate) }, (_, i) => {
    const dateStr = addDays(startDate, i);
    return merged.get(dateStr) ?? { date: dateStr, count: 0 };
  });
};

export const toCanonicalDays = (
  days: ContributionDay[],
  start: string,
  end: string,
): ContributionDay[] => {
  const anchors =
    start === end
      ? [{ date: start, count: 0 }]
      : [
          { date: start, count: 0 },
          { date: end, count: 0 },
        ];
  return normalizeEventsToDaily([...anchors, ...days]);
};
