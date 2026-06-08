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

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const date = d.getDate();
  return `${y}-${m < 10 ? "0" + m : m}-${date < 10 ? "0" + date : date}`;
}

export function padDaysToYear(days: StreakrDay[], year: number): StreakrDay[] {
  const byDate = new Map(days.map((day) => [localDateKey(day.date), day]));
  const out: StreakrDay[] = [];
  const cur = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);

  while (cur <= end) {
    const y = cur.getFullYear();
    const m = cur.getMonth() + 1;
    const d = cur.getDate();
    const key = `${y}-${m < 10 ? "0" + m : m}-${d < 10 ? "0" + d : d}`;
    out.push(byDate.get(key) ?? { date: new Date(cur), total: 0, sources: {} });
    cur.setDate(d + 1);
  }

  return out;
}

export function gridFromDays<T extends StreakrDay>(days: T[]): (T | null)[][] {
  if (!days.length) return [];

  return padGridColumns(
    days.reduce<(T | null)[][]>(
      (cols, day) => {
        const col = cols[cols.length - 1];
        if (col.length === 7) {
          cols.push([day]);
        } else {
          col.push(day);
        }
        return cols;
      },
      [new Array<T | null>(days[0].date.getDay()).fill(null)],
    ),
  );
}

export function padGridColumns<T>(cols: (T | null)[][]): (T | null)[][] {
  return cols.map((col) => [
    ...col,
    ...new Array<T | null>(Math.max(0, 7 - col.length)).fill(null),
  ]);
}

export function monthHeaders<T extends StreakrDay>(
  cols: (T | null)[][],
): { col: number; label: string }[] {
  return cols.reduce<{ headers: { col: number; label: string }[]; lastMonth: number }>(
    (state, col, index) => {
      const firstDay = col.find((day): day is T => Boolean(day));
      const month = firstDay?.date.getMonth();
      const lastHeader = state.headers[state.headers.length - 1];
      const hasRoom = !lastHeader || index - lastHeader.col >= 3;

      if (month !== undefined && month !== state.lastMonth && hasRoom) {
        state.headers.push({ col: index, label: MONTH_LABELS_SHORT[month] });
      }

      return {
        headers: state.headers,
        lastMonth: month ?? state.lastMonth,
      };
    },
    { headers: [], lastMonth: -1 },
  ).headers;
}

export function fmtDateLong(date: Date): string {
  return `${DOW[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}
