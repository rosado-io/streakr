import type { ContributionDay } from "../types";
import { isValidDateString, validateDateRange } from "../core/date";

export const STREAKR_SNAPSHOT_SCHEMA_VERSION = 1 as const;

export interface PublicStreakrSnapshot {
  schemaVersion: typeof STREAKR_SNAPSHOT_SCHEMA_VERSION;
  generatedAt: string;
  range: { start: string; end: string };
  activity: Record<string, PublicContributionDay[]>;
  agents: PublicAgentDay[];
}

export interface PublicContributionDay {
  date: string;
  count: number;
}

export interface PublicAgentDay extends PublicContributionDay {
  sources: Record<string, number>;
}

export interface CreatePublicSnapshotOptions {
  generatedAt?: string;
  range: { start: string; end: string };
  activity: Record<string, readonly ContributionDay[]>;
  agents: readonly ContributionDay[];
}

const SOURCE_KEY = /^[a-z0-9][a-z0-9._-]*$/i;

export const createPublicSnapshot = (
  options: CreatePublicSnapshotOptions,
): PublicStreakrSnapshot => {
  validateDateRange(options.range.start, options.range.end);
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  if (Number.isNaN(Date.parse(generatedAt))) throw new Error("Invalid snapshot generation date");

  const activity = Object.fromEntries(
    Object.entries(options.activity).map(([source, days]) => {
      validateSourceKey(source);
      return [source, sanitizeDays(days, options.range)];
    }),
  );
  const agents = sanitizeAgentDays(options.agents, options.range);

  return {
    schemaVersion: STREAKR_SNAPSHOT_SCHEMA_VERSION,
    generatedAt,
    range: { ...options.range },
    activity,
    agents,
  };
};

const sanitizeDays = (
  days: readonly ContributionDay[],
  range: CreatePublicSnapshotOptions["range"],
): PublicContributionDay[] =>
  days
    .map(({ date, count }) => {
      validateDay(date, count, range);
      return { date, count };
    })
    .filter(({ count }) => count > 0)
    .sort((left, right) => left.date.localeCompare(right.date));

const sanitizeAgentDays = (
  days: readonly ContributionDay[],
  range: CreatePublicSnapshotOptions["range"],
): PublicAgentDay[] =>
  days
    .map(({ date, count, sources = {} }) => {
      validateDay(date, count, range);
      const publicSources = Object.fromEntries(
        Object.entries(sources)
          .map(([source, sourceCount]) => {
            validateSourceKey(source);
            validateCount(sourceCount);
            return [source, sourceCount] as const;
          })
          .filter(([, sourceCount]) => sourceCount > 0),
      );
      return { date, count, sources: publicSources };
    })
    .filter(({ count, sources }) => count > 0 && Object.keys(sources).length > 0)
    .sort((left, right) => left.date.localeCompare(right.date));

const validateDay = (
  date: string,
  count: number,
  range: CreatePublicSnapshotOptions["range"],
): void => {
  if (!isValidDateString(date)) throw new Error(`Invalid contribution date: ${date}`);
  if (date < range.start || date > range.end) {
    throw new Error(`Contribution date ${date} is outside snapshot range`);
  }
  validateCount(count);
};

const validateCount = (count: number): void => {
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new Error("Contribution count must be a non-negative integer");
  }
};

const validateSourceKey = (source: string): void => {
  if (!SOURCE_KEY.test(source)) throw new Error(`Invalid public source key: ${source}`);
};
