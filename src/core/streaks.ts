import type { ContributionDay, StreakResult } from "../types";

export const computeStreaks = (days: ContributionDay[]): StreakResult =>
  days.reduce<StreakResult>(
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
