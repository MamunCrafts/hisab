import "server-only";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { accounts, categories, contacts } from "@/db/schema";
import { matchingCategoryKeys } from "@/lib/finance/search";
import { listTransactions } from "./transactions";
import { getFilterContext } from "./context";
import { parseTransactionFilters } from "@/lib/finance/filters";

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** Global search across the user's own transactions, people, accounts and categories. */
export async function globalSearch(userId: string, query: string) {
  const q = query.trim().slice(0, 100);
  const pattern = `%${escapeLike(q)}%`;
  const keys = matchingCategoryKeys(q);
  const filters = parseTransactionFilters({ q });
  const ctx = await getFilterContext(userId, filters);
  const [txs, people, accountRows, categoryRows] = await Promise.all([
    listTransactions(userId, filters, ctx),
    db
      .select({ id: contacts.id, name: contacts.name, phone: contacts.phone, avatarInitial: contacts.avatarInitial })
      .from(contacts)
      .where(and(eq(contacts.userId, userId), or(ilike(contacts.name, pattern), ilike(contacts.phone, pattern))))
      .orderBy(contacts.name)
      .limit(5),
    db
      .select({ id: accounts.id, name: accounts.name, type: accounts.type, icon: accounts.icon })
      .from(accounts)
      .where(and(eq(accounts.userId, userId), ilike(accounts.name, pattern)))
      .limit(5),
    db
      .select({ id: categories.id, name: categories.name, systemKey: categories.systemKey, kind: categories.kind, icon: categories.icon, color: categories.color })
      .from(categories)
      .where(
        and(
          eq(categories.userId, userId),
          or(ilike(categories.name, pattern), keys.length > 0 ? and(sql`${categories.name} is null`, inArray(categories.systemKey, keys)) : undefined),
        ),
      )
      .orderBy(desc(categories.kind))
      .limit(6),
  ]);
  return { transactions: txs.items.slice(0, 6), contacts: people, accounts: accountRows, categories: categoryRows, currency: ctx.currency };
}

export type SearchResults = Awaited<ReturnType<typeof globalSearch>>;
