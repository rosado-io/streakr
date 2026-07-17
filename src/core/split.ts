import type { ContributionDay } from "../types";
import { normalizeEventsToDaily } from "./normalize";

export interface SplitCoAuthoredOptions {
  humanKey?: string;
}

export const splitCoAuthored = (
  totalDays: ContributionDay[],
  agentDays: Record<string, ContributionDay[]>,
  options?: SplitCoAuthoredOptions,
): ContributionDay[] => {
  const humanKey = options?.humanKey ?? "github";
  const agentKeys = Object.keys(agentDays);
  if (agentKeys.includes(humanKey)) {
    throw new Error(`Agent key "${humanKey}" must not equal the human key`);
  }

  const totalByDate = new Map(
    normalizeEventsToDaily(totalDays).map((day) => [day.date, day.count]),
  );

  const agentsByDate = agentKeys.reduce((acc, key) => {
    normalizeEventsToDaily(agentDays[key] ?? []).forEach((day) => {
      acc.set(day.date, { ...acc.get(day.date), [key]: day.count });
    });
    return acc;
  }, new Map<string, Record<string, number>>());

  const dates = [...new Set([...totalByDate.keys(), ...agentsByDate.keys()])].sort((a, b) =>
    a.localeCompare(b),
  );

  return dates.map((date) => {
    const perAgent = Object.fromEntries(
      agentKeys.map((key) => [key, agentsByDate.get(date)?.[key] ?? 0]),
    );
    const agentSum = Object.values(perAgent).reduce((sum, value) => sum + value, 0);
    const total = totalByDate.get(date) ?? agentSum;
    return {
      date,
      count: Math.max(total, agentSum),
      sources: { [humanKey]: Math.max(0, total - agentSum), ...perAgent },
    };
  });
};
