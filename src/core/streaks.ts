import type { ContributionDay, StreakResult } from "../types";

/**
 * Computes streak statistics from a daily contribution series.
 *
 * Expects a **sorted, contiguous** array (as produced by `normalizeEventsToDaily`).
 * A "streak" is a consecutive run of days where `count > 0`.
 *
 * @param days - Sorted array of ContributionDay (ascending by date)
 * @returns StreakResult with total contributions, longest streak, and current streak
 */
export function computeStreaks(days: ContributionDay[]): StreakResult {
  if (days.length === 0) {
    return { total: 0, bestStreak: 0, currentStreak: 0 };
  }

  let total = 0;
  let bestStreak = 0;
  let currentRun = 0;

  for (const day of days) {
    total += day.count;

    if (day.count > 0) {
      currentRun++;
      if (currentRun > bestStreak) {
        bestStreak = currentRun;
      }
    } else {
      currentRun = 0;
    }
  }

  return { total, bestStreak, currentStreak: currentRun };
}
