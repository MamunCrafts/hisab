import { addDays, addMonths, endOfMonth, isDateString, startOfMonth, startOfWeek, type DateString } from "@/lib/dates";
import { parseAmountInput } from "@/lib/money";

export const RANGE_PRESETS = ["all", "today", "yesterday", "week", "month", "lastMonth", "custom"] as const;
export type RangePreset = (typeof RANGE_PRESETS)[number];

export const TYPE_FILTERS = ["EXPENSE", "INCOME", "TRANSFER", "LEDGER", "ADJUSTMENT"] as const;
export type TypeFilter = (typeof TYPE_FILTERS)[number];

export type TransactionFilters = {
  range: RangePreset;
  from: DateString | null;
  to: DateString | null;
  type: TypeFilter | null;
  categoryId: string | null;
  accountId: string | null;
  contactId: string | null;
  min: string | null;
  max: string | null;
  q: string | null;
  page: number;
};

type Params = Record<string, string | string[] | undefined>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function one(params: Params, key: string): string | null {
  const value = params[key];
  const v = Array.isArray(value) ? value[0] : value;
  return v && v.trim() !== "" ? v.trim() : null;
}

/** Parse (and sanitize) filters from URL search params. Invalid values are dropped. */
export function parseTransactionFilters(params: Params): TransactionFilters {
  const range = one(params, "range");
  const type = one(params, "type");
  const from = one(params, "from");
  const to = one(params, "to");
  const uuid = (key: string) => {
    const v = one(params, key);
    return v && UUID.test(v) ? v : null;
  };
  const amount = (key: string) => {
    const v = one(params, key);
    return v ? parseAmountInput(v) : null;
  };
  const page = Number(one(params, "page") ?? "1");
  return {
    range: (RANGE_PRESETS as readonly string[]).includes(range ?? "") ? (range as RangePreset) : from || to ? "custom" : "all",
    from: from && isDateString(from) ? from : null,
    to: to && isDateString(to) ? to : null,
    type: (TYPE_FILTERS as readonly string[]).includes(type ?? "") ? (type as TypeFilter) : null,
    categoryId: uuid("categoryId"),
    accountId: uuid("accountId"),
    contactId: uuid("contactId"),
    min: amount("min"),
    max: amount("max"),
    q: one(params, "q")?.slice(0, 100) ?? null,
    page: Number.isInteger(page) && page > 0 && page < 10_000 ? page : 1,
  };
}

/** Concrete date bounds for a preset, in the user's calendar. */
export function resolveDateRange(
  filters: Pick<TransactionFilters, "range" | "from" | "to">,
  today: DateString,
  weekStartsOn: number,
): { from: DateString | null; to: DateString | null } {
  switch (filters.range) {
    case "today":
      return { from: today, to: today };
    case "yesterday": {
      const y = addDays(today, -1);
      return { from: y, to: y };
    }
    case "week":
      return { from: startOfWeek(today, weekStartsOn), to: today };
    case "month":
      return { from: startOfMonth(today), to: endOfMonth(today) };
    case "lastMonth": {
      const start = addMonths(startOfMonth(today), -1);
      return { from: start, to: endOfMonth(start) };
    }
    case "custom":
      return { from: filters.from, to: filters.to };
    default:
      return { from: null, to: null };
  }
}

/** Serialize filters back to a query string (omitting defaults). */
export function filtersToSearchParams(filters: Partial<TransactionFilters>): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.range && filters.range !== "all") params.set("range", filters.range);
  if (filters.range === "custom") {
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
  }
  if (filters.type) params.set("type", filters.type);
  if (filters.categoryId) params.set("categoryId", filters.categoryId);
  if (filters.accountId) params.set("accountId", filters.accountId);
  if (filters.contactId) params.set("contactId", filters.contactId);
  if (filters.min) params.set("min", filters.min);
  if (filters.max) params.set("max", filters.max);
  if (filters.q) params.set("q", filters.q);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  return params;
}
