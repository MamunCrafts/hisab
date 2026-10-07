import "server-only";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { categories, transactions } from "@/db/schema";
import { addDays, addMonths, endOfMonth, startOfMonth, type DateString } from "@/lib/dates";
import type { MoneyString } from "@/lib/money";

/** Income and expense totals for a date range. Debts, transfers and adjustments are excluded by type. */
export async function getIncomeExpense(userId: string, from: DateString, to: DateString, accountId?: string | null) {
  const [row] = await db
    .select({
      income: sql<string>`coalesce(sum(${transactions.amount}) filter (where ${transactions.type} = 'INCOME'), 0)::numeric(18,2)::text`,
      expense: sql<string>`coalesce(sum(${transactions.amount}) filter (where ${transactions.type} = 'EXPENSE'), 0)::numeric(18,2)::text`,
      count: sql<number>`count(*) filter (where ${transactions.type} in ('INCOME', 'EXPENSE'))::int`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.transactionDate, from),
        lte(transactions.transactionDate, to),
        accountId ? eq(transactions.accountId, accountId) : undefined,
      ),
    );
  return row;
}

/** This month vs last month (same calendar months). */
export async function getMonthlyOverview(userId: string, today: DateString) {
  const thisStart = startOfMonth(today);
  const lastStart = addMonths(thisStart, -1);
  const [current, previous] = await Promise.all([
    getIncomeExpense(userId, thisStart, endOfMonth(today)),
    getIncomeExpense(userId, lastStart, endOfMonth(lastStart)),
  ]);
  return { current, previous, monthStart: thisStart, lastMonthStart: lastStart };
}

export type DailyPoint = { date: DateString; expense: MoneyString; income: MoneyString };

/** Per-day income/expense, filling empty days with zero. */
export async function getDailySeries(
  userId: string,
  from: DateString,
  to: DateString,
  accountId?: string | null,
): Promise<DailyPoint[]> {
  const rows = await db
    .select({
      date: transactions.transactionDate,
      expense: sql<string>`coalesce(sum(${transactions.amount}) filter (where ${transactions.type} = 'EXPENSE'), 0)::numeric(18,2)::text`,
      income: sql<string>`coalesce(sum(${transactions.amount}) filter (where ${transactions.type} = 'INCOME'), 0)::numeric(18,2)::text`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.transactionDate, from),
        lte(transactions.transactionDate, to),
        sql`${transactions.type} in ('EXPENSE', 'INCOME')`,
        accountId ? eq(transactions.accountId, accountId) : undefined,
      ),
    )
    .groupBy(transactions.transactionDate);
  const byDate = new Map(rows.map((r) => [r.date, r]));
  const points: DailyPoint[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const row = byDate.get(d);
    points.push({ date: d, expense: row?.expense ?? "0.00", income: row?.income ?? "0.00" });
  }
  return points;
}

export type CategoryTotal = {
  categoryId: string | null;
  name: string | null;
  systemKey: string | null;
  icon: string | null;
  color: string | null;
  total: MoneyString;
  count: number;
};

/** Totals per category for EXPENSE (or INCOME) transactions in a range, largest first. */
export async function getCategoryTotals(
  userId: string,
  from: DateString,
  to: DateString,
  kind: "EXPENSE" | "INCOME" = "EXPENSE",
  extra?: { accountId?: string | null },
): Promise<CategoryTotal[]> {
  const conditions = [
    eq(transactions.userId, userId),
    eq(transactions.type, kind),
    gte(transactions.transactionDate, from),
    lte(transactions.transactionDate, to),
  ];
  if (extra?.accountId) conditions.push(eq(transactions.accountId, extra.accountId));
  const rows = await db
    .select({
      categoryId: categories.id,
      name: categories.name,
      systemKey: categories.systemKey,
      icon: categories.icon,
      color: categories.color,
      total: sql<string>`sum(${transactions.amount})::numeric(18,2)::text`,
      count: sql<number>`count(*)::int`,
    })
    .from(transactions)
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    .where(and(...conditions))
    .groupBy(categories.id)
    .orderBy(sql`sum(${transactions.amount}) desc`);
  return rows;
}

export type MonthlyPoint = { month: string; income: MoneyString; expense: MoneyString };

/** Per-month income/expense (month = YYYY-MM-01), filling empty months. */
export async function getMonthlySeries(
  userId: string,
  from: DateString,
  to: DateString,
  accountId?: string | null,
): Promise<MonthlyPoint[]> {
  const rows = await db
    .select({
      month: sql<string>`to_char(date_trunc('month', ${transactions.transactionDate}), 'YYYY-MM-DD')`,
      expense: sql<string>`coalesce(sum(${transactions.amount}) filter (where ${transactions.type} = 'EXPENSE'), 0)::numeric(18,2)::text`,
      income: sql<string>`coalesce(sum(${transactions.amount}) filter (where ${transactions.type} = 'INCOME'), 0)::numeric(18,2)::text`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.transactionDate, from),
        lte(transactions.transactionDate, to),
        sql`${transactions.type} in ('EXPENSE', 'INCOME')`,
        accountId ? eq(transactions.accountId, accountId) : undefined,
      ),
    )
    .groupBy(sql`1`);
  const byMonth = new Map(rows.map((r) => [r.month, r]));
  const points: MonthlyPoint[] = [];
  for (let m = startOfMonth(from); m <= to; m = addMonths(m, 1)) {
    const row = byMonth.get(m);
    points.push({ month: m, income: row?.income ?? "0.00", expense: row?.expense ?? "0.00" });
  }
  return points;
}
