import { addDays, addMonths, addYears, daysBetween, type DateString } from "@/lib/dates";

export type Frequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

/** The n-th occurrence (0-based) counted from the start date, so month-ends stay stable (31 → 28 → 31). */
export function occurrence(start: DateString, frequency: Frequency, n: number): DateString {
  switch (frequency) {
    case "DAILY":
      return addDays(start, n);
    case "WEEKLY":
      return addDays(start, n * 7);
    case "MONTHLY":
      return addMonths(start, n);
    case "YEARLY":
      return addYears(start, n);
  }
}

/** First occurrence strictly after `current`, or null when past the end date. */
export function nextOccurrenceAfter(
  start: DateString,
  frequency: Frequency,
  current: DateString,
  endDate: DateString | null,
): DateString | null {
  const approx =
    frequency === "DAILY"
      ? daysBetween(start, current)
      : frequency === "WEEKLY"
        ? Math.floor(daysBetween(start, current) / 7)
        : frequency === "MONTHLY"
          ? (Number(current.slice(0, 4)) - Number(start.slice(0, 4))) * 12 + Number(current.slice(5, 7)) - Number(start.slice(5, 7))
          : Number(current.slice(0, 4)) - Number(start.slice(0, 4));
  let n = Math.max(0, approx - 1);
  let next = occurrence(start, frequency, n);
  while (next <= current) next = occurrence(start, frequency, ++n);
  return endDate && next > endDate ? null : next;
}

/** First occurrence on or after `from` (used when a rule is created or edited). */
export function firstOccurrenceFrom(start: DateString, frequency: Frequency, from: DateString, endDate: DateString | null): DateString | null {
  if (start >= from) return endDate && start > endDate ? null : start;
  return nextOccurrenceAfter(start, frequency, addDays(from, -1), endDate);
}
