import "server-only";
import { and, eq } from "drizzle-orm";
import type { z } from "zod";
import { db } from "@/db/client";
import { accounts, categories, recurringRules } from "@/db/schema";
import { UserFacingError } from "@/lib/action-result";
import type { DateString } from "@/lib/dates";
import { firstOccurrenceFrom, nextOccurrenceAfter } from "@/lib/finance/recurrence";
import type { recurringSchema } from "@/lib/validation/recurring";
import { audit } from "./audit";
import { insertTransactionInTx } from "./transactions";

type RuleValues = z.output<typeof recurringSchema>;

async function assertRuleReferences(userId: string, input: RuleValues) {
  const [category] = await db
    .select({ kind: categories.kind })
    .from(categories)
    .where(and(eq(categories.userId, userId), eq(categories.id, input.categoryId)));
  if (!category || category.kind !== input.type) throw new UserFacingError("validation.selectCategory", "categoryId");
  const [account] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.id, input.accountId), eq(accounts.isArchived, false)));
  if (!account) throw new UserFacingError("validation.selectAccount", "accountId");
}

export async function createRule(userId: string, input: RuleValues, today: DateString) {
  await assertRuleReferences(userId, input);
  const [created] = await db
    .insert(recurringRules)
    .values({ ...input, userId, nextOccurrence: firstOccurrenceFrom(input.startDate, input.frequency, today, input.endDate) })
    .returning({ id: recurringRules.id });
  return created;
}

export async function updateRule(userId: string, id: string, input: RuleValues, today: DateString) {
  await assertRuleReferences(userId, input);
  const [updated] = await db
    .update(recurringRules)
    .set({ ...input, nextOccurrence: firstOccurrenceFrom(input.startDate, input.frequency, today, input.endDate) })
    .where(and(eq(recurringRules.userId, userId), eq(recurringRules.id, id)))
    .returning({ id: recurringRules.id });
  if (!updated) throw new UserFacingError("errors.notFound");
}

export async function setRuleActive(userId: string, id: string, active: boolean) {
  const [updated] = await db
    .update(recurringRules)
    .set({ isActive: active })
    .where(and(eq(recurringRules.userId, userId), eq(recurringRules.id, id)))
    .returning({ id: recurringRules.id });
  if (!updated) throw new UserFacingError("errors.notFound");
}

export async function deleteRule(userId: string, id: string) {
  await db.transaction(async (tx) => {
    const [deleted] = await tx
      .delete(recurringRules)
      .where(and(eq(recurringRules.userId, userId), eq(recurringRules.id, id)))
      .returning({ id: recurringRules.id });
    if (!deleted) throw new UserFacingError("errors.notFound");
    await audit(tx, { userId, action: "recurring.delete", entityType: "recurring_rule", entityId: id });
  });
}

/**
 * Confirms (posts) or skips the pending occurrence. The `occurrence` guard
 * makes double-taps harmless: only the first request advances the rule.
 */
export async function resolveOccurrence(userId: string, id: string, occurrence: DateString, mode: "confirm" | "skip") {
  return db.transaction(async (tx) => {
    const [rule] = await tx
      .select()
      .from(recurringRules)
      .where(and(eq(recurringRules.userId, userId), eq(recurringRules.id, id)))
      .for("update");
    if (!rule || rule.nextOccurrence !== occurrence) throw new UserFacingError("errors.notFound");
    let transactionId: string | null = null;
    if (mode === "confirm") {
      const created = await insertTransactionInTx(
        tx,
        userId,
        {
          type: rule.type as "EXPENSE" | "INCOME",
          amount: rule.amount,
          accountId: rule.accountId,
          categoryId: rule.categoryId,
          transactionDate: occurrence,
          title: rule.title,
          note: rule.note,
          tags: [],
        },
        { recurringRuleId: rule.id },
      );
      transactionId = created.id;
    }
    await tx
      .update(recurringRules)
      .set({ nextOccurrence: nextOccurrenceAfter(rule.startDate, rule.frequency, occurrence, rule.endDate) })
      .where(eq(recurringRules.id, rule.id));
    return { transactionId, amount: rule.amount };
  });
}
