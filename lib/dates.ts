/**
 * Calendar-date helpers. Financial dates are stored as `YYYY-MM-DD` strings
 * (Postgres DATE) and interpreted in the user's timezone (default Asia/Dhaka).
 */

export type DateString = string;

export const DEFAULT_TIMEZONE = "Asia/Dhaka";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isDateString(value: string): value is DateString {
  if (!DATE_PATTERN.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** Today's calendar date in the given timezone. */
export function todayInTimezone(timezone: string = DEFAULT_TIMEZONE, now: Date = new Date()): DateString {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Current hour (0-23) in the given timezone. */
export function hourInTimezone(timezone: string = DEFAULT_TIMEZONE, now: Date = new Date()): number {
  const hour = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    hourCycle: "h23",
  }).format(now);
  return Number(hour);
}

function toUtcDate(date: DateString): Date {
  return new Date(`${date}T00:00:00Z`);
}

function fromUtcDate(date: Date): DateString {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: DateString, days: number): DateString {
  const d = toUtcDate(date);
  d.setUTCDate(d.getUTCDate() + days);
  return fromUtcDate(d);
}

/** Add calendar months, clamping to the last day of the target month. */
export function addMonths(date: DateString, months: number): DateString {
  const d = toUtcDate(date);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return fromUtcDate(d);
}

export function addYears(date: DateString, years: number): DateString {
  return addMonths(date, years * 12);
}

export function startOfMonth(date: DateString): DateString {
  return `${date.slice(0, 7)}-01`;
}

export function endOfMonth(date: DateString): DateString {
  return addDays(addMonths(startOfMonth(date), 1), -1);
}

export function startOfYear(date: DateString): DateString {
  return `${date.slice(0, 4)}-01-01`;
}

export function endOfYear(date: DateString): DateString {
  return `${date.slice(0, 4)}-12-31`;
}

/** 0 = Sunday … 6 = Saturday. */
export function dayOfWeek(date: DateString): number {
  return toUtcDate(date).getUTCDay();
}

export function startOfWeek(date: DateString, weekStartsOn: number): DateString {
  const diff = (dayOfWeek(date) - weekStartsOn + 7) % 7;
  return addDays(date, -diff);
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: DateString, to: DateString): number {
  return Math.round((toUtcDate(to).getTime() - toUtcDate(from).getTime()) / 86_400_000);
}

export function daysInMonth(date: DateString): number {
  return Number(endOfMonth(date).slice(8, 10));
}

export function compareDates(a: DateString, b: DateString): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Every date from `from` to `to`, inclusive. */
export function eachDay(from: DateString, to: DateString): DateString[] {
  const days: DateString[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);
  return days;
}
