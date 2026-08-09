import type { RenderableDay } from "./types";

export const DAY_LABELS = ["Mon", "Wed", "Fri"];

export const MONTH_LABELS_SHORT = [
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

const pad2 = (value: number): string => String(value).padStart(2, "0");

export const localDateKey = (d: Date): string =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export const parseLocalDate = (key: string): Date => {
  const [year = 1970, month = 1, day = 1] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
};

export const padDaysToYear = (days: RenderableDay[], year: number): RenderableDay[] => {
  const byDate = new Map(days.map((day) => [day.dateKey, day]));
  const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const dayCount = isLeap(year) ? 366 : 365;

  return Array.from({ length: dayCount }, (_, i) => {
    const cur = new Date(year, 0, i + 1);
    const key = localDateKey(cur);
    return byDate.get(key) ?? { date: cur, dateKey: key, total: 0, sources: {} };
  });
};

const padGridColumns = <T>(cols: (T | null)[][]): (T | null)[][] =>
  cols.map((col) => [...col, ...new Array<T | null>(Math.max(0, 7 - col.length)).fill(null)]);

export const padDaysToRange = (days: RenderableDay[], start: Date, end: Date): RenderableDay[] => {
  const byDate = new Map(days.map((day) => [day.dateKey, day]));
  const out: RenderableDay[] = [];
  const cur = new Date(start);

  while (cur <= end) {
    const key = localDateKey(cur);
    out.push(byDate.get(key) ?? { date: new Date(cur), dateKey: key, total: 0, sources: {} });
    cur.setDate(cur.getDate() + 1);
  }

  return out;
};

export const yearToDateRange = (today: Date): { start: Date; end: Date } => ({
  start: new Date(today.getFullYear(), 0, 1),
  end: new Date(today),
});

export const gridFromDays = <T extends RenderableDay>(days: T[]): (T | null)[][] => {
  const first = days[0];
  if (!first) return [];
  return padGridColumns(
    days.reduce<(T | null)[][]>(
      (cols, day) => {
        const lastCol = cols[cols.length - 1];
        return !lastCol || lastCol.length === 7
          ? [...cols, [day]]
          : [...cols.slice(0, -1), [...lastCol, day]];
      },
      [new Array<T | null>(first.date.getDay()).fill(null)],
    ),
  );
};

export const monthHeaders = (cols: (RenderableDay | null)[][]): { col: number; label: string }[] =>
  cols.reduce<{ headers: { col: number; label: string }[]; lastMonth: number }>(
    (state, col, index) => {
      const firstDay = col.find((day): day is RenderableDay => Boolean(day));
      const month = firstDay?.date.getMonth();
      const lastHeader = state.headers[state.headers.length - 1];
      const hasRoom = !lastHeader || index - lastHeader.col >= 3;

      const nextHeaders =
        month !== undefined && month !== state.lastMonth && hasRoom
          ? [...state.headers, { col: index, label: MONTH_LABELS_SHORT[month] ?? "" }]
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

export const fmtDateShort = (date: Date): string =>
  `${MONTH_LABELS_SHORT[date.getMonth()]} ${date.getDate()}`;

export const dayAngle = (dayIndex: number, totalDays: number): number => {
  const anglePerDay = (2 * Math.PI) / totalDays;
  return -Math.PI / 2 + dayIndex * anglePerDay;
};

export const polarToCartesian = (
  cx: number,
  cy: number,
  r: number,
  angle: number,
): { x: number; y: number } => ({
  x: cx + r * Math.cos(angle),
  y: cy + r * Math.sin(angle),
});

const dayIndexToAngle = (day: Date, totalDays: number): number => {
  const startOfYear = new Date(day.getFullYear(), 0, 1);
  const idx = Math.round((day.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
  return dayAngle(Math.max(0, Math.min(totalDays - 1, idx)), totalDays);
};

export const dayToHandRotation = (day: Date, totalDays: number): number =>
  dayIndexToAngle(day, totalDays) + Math.PI / 2;
