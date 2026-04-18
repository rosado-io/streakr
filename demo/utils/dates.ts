export function shiftDate(date: Date, days: number): Date {
  const shifted = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted;
}

export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function formatRange(start: string, end: string): string {
  const startDate = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).formatRange(startDate, endDate);
}
