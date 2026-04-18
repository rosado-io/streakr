import type { ContributionDay } from "../../src/index";
import { shiftDate, formatDate } from "./dates";

export function generateMockSeries(length: number, endDate: Date): ContributionDay[] {
  const WEEKEND = new Set([0, 6]);
  const PEAK_DAYS = new Set([2, 4]);
  const TAIL_COUNTS = [4, 3, 5, 2, 6, 4];

  return Array.from({ length }, (_, i) => {
    const offset = length - 1 - i;
    const date = shiftDate(endDate, -offset);
    const weekday = date.getUTCDay();
    const wave = (length - offset) % 9;

    let count = WEEKEND.has(weekday) ? 0 : 1 + (wave % 4);
    if (PEAK_DAYS.has(weekday)) count += 2;
    if (wave === 0 || wave === 5) count += 3;
    if ((length - offset) % 23 === 0) count = 0;
    if (offset < TAIL_COUNTS.length) count = TAIL_COUNTS[offset] ?? count;

    return {
      date: formatDate(date),
      count,
      sources: {
        github: Math.max(0, Math.ceil(count * 0.7)),
        gitlab: Math.max(0, Math.floor(count * 0.3)),
      },
    };
  });
}
