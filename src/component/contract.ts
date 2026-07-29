import type { StreakrDay, StreakrSource, StreakrStatus, StreakrThemeMode } from "../types";
import type { RenderableDay } from "./types";

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const SOURCE_KEY_PATTERN = /^[a-z0-9][a-z0-9._-]*$/i;
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;
const STATUSES = new Set<StreakrStatus>(["loading", "empty", "ready", "error"]);
const THEMES = new Set<StreakrThemeMode>(["dark", "light", "system"]);

function assertCount(count: unknown, label: string): asserts count is number {
  if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0) {
    throw new Error(`streakr: ${label} must be a non-negative safe integer`);
  }
}

export const parseDateKey = (value: string, label = "date"): Date => {
  const match = DATE_PATTERN.exec(value);
  if (!match) {
    throw new Error(`streakr: ${label} must use YYYY-MM-DD`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    throw new Error(`streakr: ${label} is not a valid calendar date`);
  }
  return parsed;
};

export const currentDateKey = (): string => {
  const date = new Date();
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const normalizeYears = (years: readonly number[]): number[] => {
  const normalized = [...years];
  normalized.forEach((year) => {
    if (!Number.isSafeInteger(year) || year < 1 || year > 9999) {
      throw new Error("streakr: every year must be an integer between 1 and 9999");
    }
  });
  if (new Set(normalized).size !== normalized.length) {
    throw new Error("streakr: `years` must not contain duplicates");
  }
  return normalized.sort((left, right) => left - right);
};

export const normalizeSources = (sources: readonly unknown[]): StreakrSource[] => {
  const keys = new Set<string>();
  return sources.map((input) => {
    if (!input || typeof input !== "object") {
      throw new Error("streakr: every source must be an object");
    }
    const source = input as Partial<StreakrSource>;
    if (typeof source.key !== "string") {
      throw new Error("streakr: every source requires a string key");
    }
    if (!SOURCE_KEY_PATTERN.test(source.key)) {
      throw new Error(`streakr: invalid source key "${source.key}"`);
    }
    if (keys.has(source.key)) {
      throw new Error(`streakr: duplicate source key "${source.key}"`);
    }
    if (typeof source.name !== "string" || source.name.trim().length === 0) {
      throw new Error(`streakr: source "${source.key}" requires a name`);
    }
    if (typeof source.color !== "string") {
      throw new Error(`streakr: source "${source.key}" requires a color`);
    }
    const colorProbe = document.createElement("span");
    colorProbe.style.color = source.color;
    if (colorProbe.style.color.length === 0) {
      throw new Error(`streakr: source "${source.key}" has an invalid color`);
    }
    if (source.icon !== undefined && typeof source.icon !== "function") {
      throw new Error(`streakr: source "${source.key}" icon must be a function`);
    }
    keys.add(source.key);
    return { ...source } as StreakrSource;
  });
};

export const normalizeDays = (
  days: readonly unknown[],
  sources: readonly StreakrSource[],
): RenderableDay[] => {
  const knownSources = new Set(sources.map(({ key }) => key));
  const dates = new Set<string>();

  return days.map((input, index) => {
    const label = `days[${index}]`;
    if (!input || typeof input !== "object") {
      throw new Error(`streakr: ${label} must be an object`);
    }
    const day = input as Partial<StreakrDay>;
    if (typeof day.date !== "string") {
      throw new Error(`streakr: ${label}.date must use YYYY-MM-DD`);
    }
    if (dates.has(day.date)) {
      throw new Error(`streakr: duplicate day "${day.date}"`);
    }
    dates.add(day.date);
    assertCount(day.count, `${label}.count`);

    const rawSources = (input as { sources?: unknown }).sources;
    if (
      rawSources !== undefined &&
      (!rawSources || typeof rawSources !== "object" || Array.isArray(rawSources))
    ) {
      throw new Error(`streakr: ${label}.sources must be an object`);
    }
    const sourceEntries = rawSources ? Object.entries(rawSources as Record<string, unknown>) : null;
    let normalizedSourceCounts: Record<string, number> | null = null;
    if (sourceEntries) {
      let sourceTotal = 0;
      normalizedSourceCounts = {};
      for (const [key, count] of sourceEntries) {
        if (!knownSources.has(key)) {
          throw new Error(`streakr: ${label}.sources contains unknown source "${key}"`);
        }
        assertCount(count, `${label}.sources.${key}`);
        sourceTotal += count;
        normalizedSourceCounts[key] = count;
      }
      if (sourceTotal !== day.count) {
        throw new Error(`streakr: ${label}.count must equal the sum of its source counts`);
      }
    }

    return {
      date: parseDateKey(day.date, `${label}.date`),
      dateKey: day.date,
      total: day.count,
      ...(normalizedSourceCounts ? { sources: normalizedSourceCounts } : {}),
    };
  });
};

export const validateSelectedYear = (
  year: number | undefined,
  years: readonly number[],
): number | null => {
  const selected = year ?? years[years.length - 1] ?? null;
  if (selected !== null && !years.includes(selected)) {
    throw new Error("streakr: `year` must be included in `years`");
  }
  return selected;
};

export const validateStatus = (status: StreakrStatus): StreakrStatus => {
  if (!STATUSES.has(status)) {
    throw new Error(`streakr: invalid status "${status}"`);
  }
  return status;
};

export const validateTheme = (theme: StreakrThemeMode): StreakrThemeMode => {
  if (!THEMES.has(theme)) {
    throw new Error(`streakr: invalid theme "${theme}"`);
  }
  return theme;
};

export const validateBoolean = (value: unknown, label: string): boolean => {
  if (typeof value !== "boolean") {
    throw new Error(`streakr: \`${label}\` must be a boolean`);
  }
  return value;
};

export const validateAccent = (accent: string): string => {
  if (!HEX_COLOR_PATTERN.test(accent)) {
    throw new Error("streakr: `accent` must be a six-digit hex color");
  }
  return accent;
};

export const validateSourceState = (
  state: unknown,
  sources: readonly StreakrSource[],
): Record<string, boolean> => {
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new Error("streakr: source state must be an object");
  }
  const knownSources = new Set(sources.map(({ key }) => key));
  const normalized: Record<string, boolean> = {};
  for (const [key, enabled] of Object.entries(state)) {
    if (!knownSources.has(key)) {
      throw new Error(`streakr: source state contains unknown source "${key}"`);
    }
    if (typeof enabled !== "boolean") {
      throw new Error(`streakr: source state for "${key}" must be a boolean`);
    }
    normalized[key] = enabled;
  }
  return normalized;
};
