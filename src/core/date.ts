const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

export const formatDateYYYYMMDD = (d: Date): string => {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return `${y}-${m < 10 ? "0" + m : m}-${day < 10 ? "0" + day : day}`;
};

export const toUTC = (date: string): number => {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

export const addDays = (date: string, days: number): string => {
  const [y, m, d] = date.split("-").map(Number);
  return formatDateYYYYMMDD(new Date(Date.UTC(y, m - 1, d + days)));
};

export const daysInRange = (start: string, end: string): number =>
  Math.round((toUTC(end) - toUTC(start)) / MS_PER_DAY) + 1;

export const isValidDateString = (value: string): boolean => {
  const parsed = DATE_RE.test(value) ? new Date(`${value}T00:00:00Z`) : null;
  return !!parsed && !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

export const validateDateRange = (start: string, end: string): void => {
  if (!isValidDateString(start))
    throw new Error(`Invalid start date "${start}" (expected YYYY-MM-DD)`);
  if (!isValidDateString(end)) throw new Error(`Invalid end date "${end}" (expected YYYY-MM-DD)`);
  if (start > end) throw new Error(`Invalid range: start "${start}" must be <= end "${end}"`);
};
