import type { StreakrDay } from "../types";

export const DAY_LABELS = ["Mon", "Wed", "Fri"];

const MONTH_LABELS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const localDateKey = (d: Date): string => {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const date = d.getDate();
  return `${y}-${m < 10 ? "0" + m : m}-${date < 10 ? "0" + date : date}`;
};

export const padDaysToYear = (days: StreakrDay[], year: number): StreakrDay[] => {
  const byDate = new Map(days.map((day) => [localDateKey(day.date), day]));
  const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const dayCount = isLeap(year) ? 366 : 365;

  return Array.from({ length: dayCount }, (_, i) => {
    const cur = new Date(year, 0, i + 1);
    const key = localDateKey(cur);
    return byDate.get(key) ?? { date: cur, total: 0, sources: {} };
  });
};

export const padGridColumns = <T>(cols: (T | null)[][]): (T | null)[][] =>
  cols.map((col) => [...col, ...new Array<T | null>(Math.max(0, 7 - col.length)).fill(null)]);

export const padDaysToRange = (days: StreakrDay[], start: Date, end: Date): StreakrDay[] => {
  const byDate = new Map(days.map((day) => [localDateKey(day.date), day]));
  const out: StreakrDay[] = [];
  const cur = new Date(start);

  while (cur <= end) {
    const key = localDateKey(cur);
    out.push(byDate.get(key) ?? { date: new Date(cur), total: 0, sources: {} });
    cur.setDate(cur.getDate() + 1);
  }

  return out;
};

export const mergeDayRanges = (a: StreakrDay[], b: StreakrDay[]): StreakrDay[] => {
  const byDate = new Map<string, StreakrDay>();
  for (const day of a) {
    byDate.set(localDateKey(day.date), day);
  }
  for (const day of b) {
    const key = localDateKey(day.date);
    const existing = byDate.get(key);
    if (existing) {
      const sources = { ...(existing.sources ?? {}), ...(day.sources ?? {}) };
      const total = (existing.total || 0) + (day.total || 0);
      for (const key of Object.keys(sources)) {
        sources[key] = (existing.sources?.[key] ?? 0) + (day.sources?.[key] ?? 0);
      }
      byDate.set(key, { date: existing.date, total, sources });
    } else {
      byDate.set(key, day);
    }
  }
  return Array.from(byDate.values()).sort((x, y) => x.date.getTime() - y.date.getTime());
};

export const rolling12MonthRange = (today: Date): { start: Date; end: Date } => {
  const end = new Date(today);
  const start = new Date(today);
  start.setDate(start.getDate() - 365);
  start.setDate(start.getDate() - start.getDay());
  return { start, end };
};

export const gridFromDays = <T extends StreakrDay>(days: T[]): (T | null)[][] =>
  days.length === 0
    ? []
    : padGridColumns(
        days.reduce<(T | null)[][]>(
          (cols, day) =>
            cols[cols.length - 1].length === 7
              ? [...cols, [day]]
              : [...cols.slice(0, -1), [...cols[cols.length - 1], day]],
          [new Array<T | null>(days[0].date.getDay()).fill(null)],
        ),
      );

export const monthHeaders = <T extends StreakrDay>(
  cols: (T | null)[][],
): { col: number; label: string }[] =>
  cols.reduce<{ headers: { col: number; label: string }[]; lastMonth: number }>(
    (state, col, index) => {
      const firstDay = col.find((day): day is T => Boolean(day));
      const month = firstDay?.date.getMonth();
      const lastHeader = state.headers[state.headers.length - 1];
      const hasRoom = !lastHeader || index - lastHeader.col >= 3;

      const nextHeaders =
        month !== undefined && month !== state.lastMonth && hasRoom
          ? [...state.headers, { col: index, label: MONTH_LABELS_SHORT[month] }]
          : state.headers;

      return {
        headers: nextHeaders,
        lastMonth: month ?? state.lastMonth,
      };
    },
    { headers: [], lastMonth: -1 },
  ).headers;

export const fmtDateLong = (date: Date): string =>
  `${DOW[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
