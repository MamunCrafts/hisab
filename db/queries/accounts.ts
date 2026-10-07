import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { accounts } from "@/db/schema";
import type { MoneyString } from "@/lib/money";
import { accountDeltasSubquery } from "./finance-sql";

export type AccountType = (typeof accounts.$inferSelect)["type"];

export type AccountWithBalance = {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  icon: string | null;
  openingBalance: MoneyString;
  balance: MoneyString;
  isArchived: boolean;
  sortOrder: number;
  transactionCount: number;
};

type Row = {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  icon: string | null;
  opening_balance: string;
  balance: string;
  is_archived: boolean;
  sort_order: number;
  transaction_count: number;
};

/** All accounts with balances computed from the ledger in a single query. */
export async function listAccountsWithBalances(userId: string): Promise<AccountWithBalance[]> {
  const result = await db.execute<Row>(sql`
    with deltas as (${accountDeltasSubquery(userId)}),
    totals as (
      select account_id, sum(delta) as delta, count(*)::int as n from deltas group by account_id
    )
    select a.id, a.name, a.type, a.currency, a.icon, a.opening_balance::text, a.is_archived, a.sort_order,
           (a.opening_balance + coalesce(tt.delta, 0))::numeric(18,2)::text as balance,
           coalesce(tt.n, 0) as transaction_count
      from accounts a
      left join totals tt on tt.account_id = a.id
     where a.user_id = ${userId}
     order by a.is_archived, a.sort_order, a.created_at`);
  return result.rows.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    currency: r.currency,
    icon: r.icon,
    openingBalance: r.opening_balance,
    balance: r.balance,
    isArchived: r.is_archived,
    sortOrder: r.sort_order,
    transactionCount: r.transaction_count,
  }));
}

export async function getAccount(userId: string, accountId: string) {
  const [row] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.id, accountId)))
    .limit(1);
  return row ?? null;
}

/** Lightweight list for pickers. */
export async function listAccountOptions(userId: string) {
  return db
    .select({ id: accounts.id, name: accounts.name, type: accounts.type, icon: accounts.icon, isArchived: accounts.isArchived })
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .orderBy(asc(accounts.isArchived), asc(accounts.sortOrder), asc(accounts.createdAt));
}
