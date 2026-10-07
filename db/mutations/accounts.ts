import "server-only";
import { and, eq, or, sql } from "drizzle-orm";
import type { z } from "zod";
import { db } from "@/db/client";
import { accounts, profiles, recurringRules, transactions } from "@/db/schema";
import { UserFacingError } from "@/lib/action-result";
import { addMoney, isZeroMoney, subtractMoney } from "@/lib/money";
import { DEFAULT_ACCOUNT_ICON, type accountSchema } from "@/lib/validation/account";
import { accountDeltasSubquery } from "@/db/queries/finance-sql";
import { audit } from "./audit";

type AccountValues = z.output<typeof accountSchema>;

export async function createAccount(userId: string, input: AccountValues) {
  const [{ next }] = await db
    .select({ next: sql<number>`coalesce(max(${accounts.sortOrder}), -1)::int + 1` })
    .from(accounts)
    .where(eq(accounts.userId, userId));
  const [created] = await db
    .insert(accounts)
    .values({ ...input, icon: input.icon ?? DEFAULT_ACCOUNT_ICON[input.type], userId, sortOrder: next })
    .returning({ id: accounts.id });
  return created;
}

export async function updateAccount(userId: string, id: string, input: AccountValues) {
  const [updated] = await db
    .update(accounts)
    .set({ ...input, icon: input.icon ?? DEFAULT_ACCOUNT_ICON[input.type] })
    .where(and(eq(accounts.userId, userId), eq(accounts.id, id)))
    .returning({ id: accounts.id });
  if (!updated) throw new UserFacingError("errors.notFound");
}

export async function setAccountArchived(userId: string, id: string, archived: boolean) {
  await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(accounts)
      .set({ isArchived: archived })
      .where(and(eq(accounts.userId, userId), eq(accounts.id, id)))
      .returning({ id: accounts.id });
    if (!updated) throw new UserFacingError("errors.notFound");
    if (archived) {
      // Archived accounts must not stay the quick-add default.
      await tx
        .update(profiles)
        .set({ lastUsedAccountId: null })
        .where(and(eq(profiles.userId, userId), eq(profiles.lastUsedAccountId, id)));
    }
  });
}

/** Only accounts without any history can be deleted; others must be archived. */
export async function deleteAccount(userId: string, id: string) {
  await db.transaction(async (tx) => {
    const [account] = await tx
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.id, id)))
      .for("update");
    if (!account) throw new UserFacingError("errors.notFound");
    const [used] = await tx
      .select({ id: transactions.id })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), or(eq(transactions.accountId, id), eq(transactions.destinationAccountId, id))))
      .limit(1);
    const [rule] = await tx
      .select({ id: recurringRules.id })
      .from(recurringRules)
      .where(and(eq(recurringRules.userId, userId), eq(recurringRules.accountId, id)))
      .limit(1);
    if (used || rule) throw new UserFacingError("accounts.deleteHasHistory");
    await tx
      .update(profiles)
      .set({ lastUsedAccountId: null })
      .where(and(eq(profiles.userId, userId), eq(profiles.lastUsedAccountId, id)));
    await tx.delete(accounts).where(and(eq(accounts.userId, userId), eq(accounts.id, id)));
    await audit(tx, { userId, action: "account.delete", entityType: "account", entityId: id });
  });
}

/** Records the difference between the real balance and Hisab's balance as an ADJUSTMENT. */
export async function adjustAccountBalance(userId: string, accountId: string, actualBalance: string, date: string) {
  return db.transaction(async (tx) => {
    const [account] = await tx
      .select({ id: accounts.id, opening: accounts.openingBalance, isArchived: accounts.isArchived })
      .from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.id, accountId)))
      .for("update");
    if (!account || account.isArchived) throw new UserFacingError("errors.notFound");
    const result = await tx.execute<{ delta: string }>(sql`
      select coalesce(sum(d.delta), 0)::numeric(18,2)::text as delta
        from (${accountDeltasSubquery(userId)}) d
       where d.account_id = ${accountId}`);
    const current = addMoney(account.opening, result.rows[0]?.delta ?? "0");
    const difference = subtractMoney(actualBalance, current);
    if (isZeroMoney(difference)) throw new UserFacingError("accounts.noChange", "actualBalance");
    const [created] = await tx
      .insert(transactions)
      .values({ userId, type: "ADJUSTMENT", amount: difference, accountId, transactionDate: date, affectsAccount: true })
      .returning({ id: transactions.id });
    return { id: created.id, difference };
  });
}
