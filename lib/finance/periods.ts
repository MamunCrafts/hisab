import {
  addDays,
  addMonths,
  daysBetween,
  endOfMonth,
  endOfYear,
  isDateString,
  startOfMonth,
  startOfYear,
  type DateString,
} from "@/lib/dates";

export const ANALYTICS_PERIODS = ["7d", "30d", "month", "lastMonth", "3m", "6m", "year", "custom"] as const;
export type AnalyticsPeriod = (typeof ANALYTICS_PERIODS)[number];

export type ResolvedPeriod = {
  period: AnalyticsPeriod;
  from: DateString;
  to: DateString;
  /** Days counted for averages: up to today for open periods. */
  elapsedDays: number;
  totalDays: number;
  granularity: "day" | "month";
};

export function resolvePeriod(
  period: string | undefined,
  today: DateString,
  custom?: { from?: string | null; to?: string | null },
): ResolvedPeriod {
  const p = (ANALYTICS_PERIODS as readonly string[]).includes(period ?? "") ? (period as AnalyticsPeriod) : "month";
  let from: DateString;
  let to: DateString;
  switch (p) {
    case "7d":
      from = addDays(today, -6);
      to = today;
      break;
    case "30d":
      from = addDays(today, -29);
      to = today;
      break;
    case "lastMonth":
      from = addMonths(startOfMonth(today), -1);
      to = endOfMonth(from);
      break;
    case "3m":
      from = addMonths(startOfMonth(today), -2);
      to = endOfMonth(today);
      break;
    case "6m":
      from = addMonths(startOfMonth(today), -5);
      to = endOfMonth(today);
      break;
    case "year":
      from = startOfYear(today);
      to = endOfYear(today);
      break;
    case "custom": {
      const f = custom?.from && isDateString(custom.from) ? custom.from : startOfMonth(today);
      const t = custom?.to && isDateString(custom.to) ? custom.to : today;
      [from, to] = f <= t ? [f, t] : [t, f];
      break;
    }
    default:
      from = startOfMonth(today);
      to = endOfMonth(today);
  }
  const effectiveEnd = to < today ? to : today;
  const elapsedDays = from > today ? 0 : daysBetween(from, effectiveEnd) + 1;
  const totalDays = daysBetween(from, to) + 1;
  return { period: p, from, to, elapsedDays, totalDays, granularity: totalDays > 62 ? "month" : "day" };
}
