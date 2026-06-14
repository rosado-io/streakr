import type { ContributionDay } from "../types";

const mergeSources = (
  current: ContributionDay["sources"] = {},
  next: ContributionDay["sources"] = {},
): ContributionDay["sources"] => {
  const entries = Object.entries(next).map(([source, count]) => [
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

export const formatDateYYYYMMDD = (d: Date): string => {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return `${y}-${m < 10 ? "0" + m : m}-${day < 10 ? "0" + day : day}`;
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

  const [startY, startM, startD] = startDate.split("-").map(Number);
  const [endY, endM, endD] = endDate.split("-").map(Number);
  const startUTC = Date.UTC(startY, startM - 1, startD);
  const endUTC = Date.UTC(endY, endM - 1, endD);

  const dayCount = Math.round((endUTC - startUTC) / (1000 * 60 * 60 * 24)) + 1;

  return Array.from({ length: dayCount }, (_, i) => {
    const d = new Date(Date.UTC(startY, startM - 1, startD + i));
    const dateStr = formatDateYYYYMMDD(d);
    return merged.get(dateStr) ?? { date: dateStr, count: 0 };
  });
};
