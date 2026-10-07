import "server-only";
import { and, desc, eq, gte, ilike, inArray, lte, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db/client";
import { accounts, attachments, categories, contacts, transactions } from "@/db/schema";
import type { DateString } from "@/lib/dates";
import { resolveDateRange, type TransactionFilters } from "@/lib/finance/filters";
import { LEDGER_TYPES, type TransactionType } from "@/lib/finance/rules";
import type { MoneyString } from "@/lib/money";

const destinationAccounts = alias(accounts, "destination_accounts");

export type TransactionListItem = {
  id: string;
  type: TransactionType;
  amount: MoneyString;
  transactionDate: DateString;
  dueDate: DateString | null;
  title: string | null;
  note: string | null;
  tags: string[];
  affectsAccount: boolean;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
  account: { id: string; name: string; type: string; icon: string | null } | null;
  destinationAccount: { id: string; name: string } | null;
  category: { id: string; name: string | null; systemKey: string | null; icon: string | null; color: string | null } | null;
  contact: { id: string; name: string; avatarInitial: string } | null;
  attachment: { id: string; contentType: string; originalName: string; size: number } | null;
};

const selection = {
  id: transactions.id,
  type: transactions.type,
  amount: transactions.amount,
  transactionDate: transactions.transactionDate,
  dueDate: transactions.dueDate,
  title: transactions.title,
  note: transactions.note,
  tags: transactions.tags,
  affectsAccount: transactions.affectsAccount,
  createdAt: transactions.createdAt,
  updatedAt: transactions.updatedAt,
  accountId: accounts.id,
  accountName: accounts.name,
  accountType: accounts.type,
  accountIcon: accounts.icon,
  destinationId: destinationAccounts.id,
  destinationName: destinationAccounts.name,
  categoryId: categories.id,
  categoryName: categories.name,
  categoryKey: categories.systemKey,
  categoryIcon: categories.icon,
  categoryColor: categories.color,
  contactId: contacts.id,
  contactName: contacts.name,
  contactInitial: contacts.avatarInitial,
  attachmentId: attachments.id,
  attachmentType: attachments.contentType,
  attachmentName: attachments.originalName,
  attachmentSize: attachments.size,
};


/** Edits more than a minute after creation are shown as "Edited". */
const EDITED_THRESHOLD_MS = 60_000;

function toItem(row: SelectedRow): TransactionListItem {
  const { createdAt, updatedAt } = row;
  return {
    id: row.id,
    type: row.type,
    amount: row.amount,
    transactionDate: row.transactionDate,
    dueDate: row.dueDate,
    title: row.title,
    note: row.note,
    tags: row.tags,
    affectsAccount: row.affectsAccount,
    isEdited: updatedAt.getTime() - createdAt.getTime() > EDITED_THRESHOLD_MS,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
    account: row.accountId
      ? { id: row.accountId, name: row.accountName as string, type: row.accountType as string, icon: row.accountIcon }
      : null,
    destinationAccount: row.destinationId ? { id: row.destinationId, name: row.destinationName as string } : null,
    category: row.categoryId
      ? { id: row.categoryId, name: row.categoryName, systemKey: row.categoryKey, icon: row.categoryIcon, color: row.categoryColor }
      : null,
    contact: row.contactId
      ? { id: row.contactId, name: row.contactName as string, avatarInitial: row.contactInitial as string }
      : null,
    attachment: row.attachmentId
      ? {
          id: row.attachmentId,
          contentType: row.attachmentType as string,
          originalName: row.attachmentName as string,
          size: row.attachmentSize as number,
        }
      : null,
  };
}

type SelectedRow = Awaited<ReturnType<typeof baseQuery>>[number];

function baseQuery() {
  return db
    .select(selection)
    .from(transactions)
    .leftJoin(accounts, eq(accounts.id, transactions.accountId))
    .leftJoin(destinationAccounts, eq(destinationAccounts.id, transactions.destinationAccountId))
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    .leftJoin(contacts, eq(contacts.id, transactions.contactId))
    .leftJoin(attachments, eq(attachments.transactionId, transactions.id));
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export type FilterContext = {
  today: DateString;
  weekStartsOn: number;
  /** Starter-category keys whose translated name matches the search text. */
  matchingCategoryKeys: string[];
};

/** WHERE conditions shared by the list, its totals and exports. Always scoped to the user. */
export function transactionConditions(userId: string, filters: TransactionFilters, ctx: FilterContext): SQL {
  const conditions: SQL[] = [eq(transactions.userId, userId)];
  const { from, to } = resolveDateRange(filters, ctx.today, ctx.weekStartsOn);
  if (from) conditions.push(gte(transactions.transactionDate, from));
  if (to) conditions.push(lte(transactions.transactionDate, to));
  if (filters.type === "LEDGER") conditions.push(inArray(transactions.type, [...LEDGER_TYPES]));
  else if (filters.type) conditions.push(eq(transactions.type, filters.type));
  if (filters.categoryId) conditions.push(eq(transactions.categoryId, filters.categoryId));
  if (filters.accountId) {
    conditions.push(
      or(eq(transactions.accountId, filters.accountId), eq(transactions.destinationAccountId, filters.accountId))!,
    );
  }
  if (filters.contactId) conditions.push(eq(transactions.contactId, filters.contactId));
  if (filters.min) conditions.push(gte(transactions.amount, filters.min));
  if (filters.max) conditions.push(lte(transactions.amount, filters.max));
  if (filters.q) {
    const pattern = `%${escapeLike(filters.q)}%`;
    const search: SQL[] = [
      ilike(transactions.title, pattern),
      ilike(transactions.note, pattern),
      ilike(contacts.name, pattern),
      ilike(categories.name, pattern),
      sql`array_to_string(${transactions.tags}, ' ') ilike ${pattern}`,
    ];
    if (ctx.matchingCategoryKeys.length > 0) {
      search.push(and(sql`${categories.name} is null`, inArray(categories.systemKey, ctx.matchingCategoryKeys))!);
    }
    conditions.push(or(...search)!);
  }
  return and(...conditions)!;
}

export const PAGE_SIZE = 30;

export async function listTransactions(userId: string, filters: TransactionFilters, ctx: FilterContext) {
  const rows = await baseQuery()
    .where(transactionConditions(userId, filters, ctx))
    .orderBy(desc(transactions.transactionDate), desc(transactions.createdAt), desc(transactions.id))
    .limit(PAGE_SIZE + 1)
    .offset((filters.page - 1) * PAGE_SIZE);
  return {
    items: rows.slice(0, PAGE_SIZE).map(toItem),
    hasNext: rows.length > PAGE_SIZE,
  };
}

/** Income and expense totals for the filtered set (debts and transfers excluded). */
export async function getFilteredTotals(userId: string, filters: TransactionFilters, ctx: FilterContext) {
  const [row] = await db
    .select({
      income: sql<string>`coalesce(sum(case when ${transactions.type} = 'INCOME' then ${transactions.amount} end), 0)::numeric(18,2)::text`,
      expense: sql<string>`coalesce(sum(case when ${transactions.type} = 'EXPENSE' then ${transactions.amount} end), 0)::numeric(18,2)::text`,
      count: sql<number>`count(*)::int`,
    })
    .from(transactions)
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    .leftJoin(contacts, eq(contacts.id, transactions.contactId))
    .where(transactionConditions(userId, filters, ctx));
  return row;
}

export async function getTransaction(userId: string, id: string): Promise<TransactionListItem | null> {
  const [row] = await baseQuery()
    .where(and(eq(transactions.userId, userId), eq(transactions.id, id)))
    .limit(1);
  return row ? toItem(row) : null;
}

export async function listRecentTransactions(userId: string, limit = 8): Promise<TransactionListItem[]> {
  const rows = await baseQuery()
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.transactionDate), desc(transactions.createdAt))
    .limit(limit);
  return rows.map(toItem);
}

/** All rows matching filters (for CSV export), capped to protect the server. */
export async function exportTransactions(userId: string, filters: TransactionFilters, ctx: FilterContext, cap = 20_000) {
  const rows = await baseQuery()
    .where(transactionConditions(userId, filters, ctx))
    .orderBy(desc(transactions.transactionDate), desc(transactions.createdAt))
    .limit(cap);
  return rows.map(toItem);
}

/** Cheap ownership check for route layouts. */
export async function transactionExists(userId: string, id: string) {
  const [row] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.id, id)))
    .limit(1);
  return Boolean(row);
}
