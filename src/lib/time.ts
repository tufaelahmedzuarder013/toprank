/** UTC day helpers. Daily boards always use UTC, regardless of the visitor's time zone. */

const DAY_MS = 86_400_000;

export function utcDayStart(d: Date = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function nextUtcMidnight(d: Date = new Date()): Date {
  return new Date(utcDayStart(d).getTime() + DAY_MS);
}

export function msUntilUtcMidnight(now: Date = new Date()): number {
  return nextUtcMidnight(now).getTime() - now.getTime();
}

/** "YYYY-MM-DD" for the UTC day containing `d`. */
export function toDateKey(d: Date = new Date()): string {
  return utcDayStart(d).toISOString().slice(0, 10);
}

/** Parses "YYYY-MM-DD" into the start of that UTC day; null for anything invalid. */
export function parseDateKey(key: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const d = new Date(`${key}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime()) || toDateKey(d) !== key) return null;
  return d;
}

/** [start, end) window of a UTC day key. */
export function dayWindow(key: string): { start: Date; end: Date } | null {
  const start = parseDateKey(key);
  return start ? { start, end: new Date(start.getTime() + DAY_MS) } : null;
}

export function addDays(key: string, days: number): string {
  const d = parseDateKey(key);
  if (!d) throw new Error(`Invalid date key: ${key}`);
  return toDateKey(new Date(d.getTime() + days * DAY_MS));
}

export function formatDayLabel(key: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric", year: "numeric" }) {
  const d = parseDateKey(key);
  return d ? d.toLocaleDateString("en-US", { ...opts, timeZone: "UTC" }) : key;
}

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const units: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * DAY_MS],
  ["month", 30 * DAY_MS],
  ["week", 7 * DAY_MS],
  ["day", DAY_MS],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

export function timeAgo(date: Date | string, now: Date = new Date()): string {
  const diff = new Date(date).getTime() - now.getTime();
  for (const [unit, ms] of units) {
    if (Math.abs(diff) >= ms) return rtf.format(Math.round(diff / ms), unit);
  }
  return "just now";
}
