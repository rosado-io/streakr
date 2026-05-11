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
  return days.reduce<StreakResult>(
    (stats, day) => {
      const currentStreak = day.count > 0 ? stats.currentStreak + 1 : 0;

      return {
        total: stats.total + day.count,
        bestStreak: Math.max(stats.bestStreak, currentStreak),
        currentStreak,
      };
    },
    { total: 0, bestStreak: 0, currentStreak: 0 },
  );
}
