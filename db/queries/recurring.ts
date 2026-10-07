import "server-only";
import { and, asc, eq, isNotNull, lte } from "drizzle-orm";
import { db } from "@/db/client";
import { accounts, categories, recurringRules } from "@/db/schema";
import { addDays, type DateString } from "@/lib/dates";

const selection = {
  id: recurringRules.id,
  type: recurringRules.type,
  amount: recurringRules.amount,
  title: recurringRules.title,
  note: recurringRules.note,
  frequency: recurringRules.frequency,
  startDate: recurringRules.startDate,
  endDate: recurringRules.endDate,
  nextOccurrence: recurringRules.nextOccurrence,
  isActive: recurringRules.isActive,
  categoryId: recurringRules.categoryId,
  accountId: recurringRules.accountId,
  categoryName: categories.name,
  categoryKey: categories.systemKey,
  categoryIcon: categories.icon,
  categoryColor: categories.color,
  accountName: accounts.name,
};

export async function listRules(userId: string) {
  return db
    .select(selection)
    .from(recurringRules)
    .innerJoin(categories, eq(categories.id, recurringRules.categoryId))
    .innerJoin(accounts, eq(accounts.id, recurringRules.accountId))
    .where(eq(recurringRules.userId, userId))
    .orderBy(asc(recurringRules.nextOccurrence), asc(recurringRules.title));
}

export type RuleRow = Awaited<ReturnType<typeof listRules>>[number];

/** Active rules due within `days` days (including overdue ones). */
export async function listUpcoming(userId: string, today: DateString, days = 7) {
  return db
    .select(selection)
    .from(recurringRules)
    .innerJoin(categories, eq(categories.id, recurringRules.categoryId))
    .innerJoin(accounts, eq(accounts.id, recurringRules.accountId))
    .where(
      and(
        eq(recurringRules.userId, userId),
        eq(recurringRules.isActive, true),
        isNotNull(recurringRules.nextOccurrence),
        lte(recurringRules.nextOccurrence, addDays(today, days)),
      ),
    )
    .orderBy(asc(recurringRules.nextOccurrence));
}
