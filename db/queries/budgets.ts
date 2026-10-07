import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { budgets, categories, transactions } from "@/db/schema";
import type { DateString } from "@/lib/dates";
import { calculateBudgetUsage, type BudgetState } from "@/lib/finance/rules";
import type { MoneyString } from "@/lib/money";

export type BudgetUsage = {
  id: string;
  categoryId: string;
  name: string | null;
  systemKey: string | null;
  icon: string | null;
  color: string | null;
  limit: MoneyString;
  spent: MoneyString;
  remaining: MoneyString;
  percent: number;
  state: BudgetState;
};

/** Monthly budgets with spending from EXPENSE transactions only (§ Phase 4 DoD). */
export async function listBudgetUsage(userId: string, from: DateString, to: DateString): Promise<BudgetUsage[]> {
  const spent = db
    .select({
      categoryId: transactions.categoryId,
      total: sql<string>`sum(${transactions.amount})`.as("total"),
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "EXPENSE"),
        sql`${transactions.transactionDate} between ${from} and ${to}`,
      ),
    )
    .groupBy(transactions.categoryId)
    .as("spent");

  const rows = await db
    .select({
      id: budgets.id,
      categoryId: budgets.categoryId,
      limit: budgets.amount,
      name: categories.name,
      systemKey: categories.systemKey,
      icon: categories.icon,
      color: categories.color,
      sortOrder: categories.sortOrder,
      spent: sql<string>`coalesce(${spent.total}, 0)::numeric(18,2)::text`,
    })
    .from(budgets)
    .innerJoin(categories, eq(categories.id, budgets.categoryId))
    .leftJoin(spent, eq(spent.categoryId, budgets.categoryId))
    .where(eq(budgets.userId, userId))
    .orderBy(asc(categories.sortOrder));

  return rows.map((row) => {
    const usage = calculateBudgetUsage(row.spent, row.limit);
    return {
      id: row.id,
      categoryId: row.categoryId,
      name: row.name,
      systemKey: row.systemKey,
      icon: row.icon,
      color: row.color,
      limit: row.limit,
      spent: row.spent,
      ...usage,
    };
  });
}
