import "server-only";
import { and, asc, eq, gte, inArray, isNotNull, lt, lte, sql } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db/client";
import { accounts, attachments, contacts, transactions } from "@/db/schema";
import type { DateString } from "@/lib/dates";
import { calculateDueStatus, type DueStatus } from "@/lib/finance/due";
import { calculatePayable, calculateReceivable, LEDGER_TYPES, ledgerEffect, ledgerStatus, type LedgerStatus, type TransactionType } from "@/lib/finance/rules";
import { addMoney, type MoneyString } from "@/lib/money";
import { ledgerDeltaSql } from "./finance-sql";

export type ContactBalance = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  avatarInitial: string;
  isArchived: boolean;
  balance: MoneyString;
  status: LedgerStatus;
  lastActivity: DateString | null;
  entryCount: number;
  dueStatus: DueStatus;
  nearestDue: DateString | null;
};

type BalanceRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  avatar_initial: string;
  is_archived: boolean;
  balance: string;
  last_activity: string | null;
  entry_count: number;
  has_due: boolean;
};

/** Every person with their signed ledger balance (positive = they owe me). */
async function contactBalanceRows(userId: string) {
  const result = await db.execute<BalanceRow>(sql`
    select c.id, c.name, c.phone, c.email, c.avatar_initial, c.is_archived,
           coalesce(sum(${ledgerDeltaSql("t")}), 0)::numeric(18,2)::text as balance,
           max(t.transaction_date)::text as last_activity,
           count(t.id)::int as entry_count,
           bool_or(t.due_date is not null) as has_due
      from contacts c
      left join transactions t
        on t.contact_id = c.id and t.user_id = ${userId}
       and t.type in ('LEND', 'BORROW', 'DEBT_RECEIVED', 'DEBT_PAID')
     where c.user_id = ${userId}
     group by c.id
     order by max(t.transaction_date) desc nulls last, c.name`);
  return result.rows;
}

/** Due status for the given people, computed from their (bounded) ledger entries. */
async function dueStatuses(userId: string, contactIds: string[], today: DateString) {
  const map = new Map<string, { status: DueStatus; nearestDue: DateString | null }>();
  if (contactIds.length === 0) return map;
  const rows = await db
    .select({
      contactId: transactions.contactId,
      type: transactions.type,
      amount: transactions.amount,
      transactionDate: transactions.transactionDate,
      dueDate: transactions.dueDate,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        inArray(transactions.contactId, contactIds),
        inArray(transactions.type, [...LEDGER_TYPES]),
      ),
    )
    .orderBy(asc(transactions.transactionDate), asc(transactions.createdAt));
  const grouped = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = grouped.get(row.contactId!) ?? [];
    list.push(row);
    grouped.set(row.contactId!, list);
  }
  for (const [contactId, entries] of grouped) {
    const { status, nearestDue } = calculateDueStatus(entries, today);
    map.set(contactId, { status, nearestDue });
  }
  return map;
}

export async function listContactBalances(userId: string, today: DateString): Promise<ContactBalance[]> {
  const rows = await contactBalanceRows(userId);
  const needDue = rows.filter((r) => r.has_due && r.balance !== "0.00").map((r) => r.id);
  const dues = await dueStatuses(userId, needDue, today);
  return rows.map((r) => {
    const due = dues.get(r.id);
    const status = ledgerStatus(r.balance);
    return {
      id: r.id,
      name: r.name,
      phone: r.phone,
      email: r.email,
      avatarInitial: r.avatar_initial,
      isArchived: r.is_archived,
      balance: r.balance,
      status,
      lastActivity: r.last_activity,
      entryCount: r.entry_count,
      dueStatus: status === "SETTLED" ? "SETTLED" : (due?.status ?? "NO_DUE"),
      nearestDue: status === "SETTLED" ? null : (due?.nearestDue ?? null),
    };
  });
}

export type DebtSummary = {
  receivable: { total: MoneyString; count: number };
  payable: { total: MoneyString; count: number };
  overdueCount: number;
  dueTodayCount: number;
};

export function summarizeDebts(list: ContactBalance[]): DebtSummary {
  const balances = list.map((c) => c.balance);
  return {
    receivable: calculateReceivable(balances),
    payable: calculatePayable(balances),
    overdueCount: list.filter((c) => c.dueStatus === "OVERDUE").length,
    dueTodayCount: list.filter((c) => c.dueStatus === "DUE_TODAY").length,
  };
}

export async function getDebtSummary(userId: string, today: DateString): Promise<DebtSummary> {
  return summarizeDebts(await listContactBalances(userId, today));
}

export const getContact = cache(async (userId: string, contactId: string) => {
  const [row] = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.userId, userId), eq(contacts.id, contactId)))
    .limit(1);
  return row ?? null;
});

export type LedgerEntry = {
  id: string;
  type: TransactionType;
  amount: MoneyString;
  signed: MoneyString;
  runningBalance: MoneyString;
  transactionDate: DateString;
  dueDate: DateString | null;
  title: string | null;
  note: string | null;
  affectsAccount: boolean;
  accountName: string | null;
  hasAttachment: boolean;
};

/**
 * Chronological statement for one person with running balance. With a range,
 * entries before `from` are rolled into the opening balance.
 */
export async function getContactStatement(
  userId: string,
  contactId: string,
  range: { from: DateString | null; to: DateString | null } = { from: null, to: null },
) {
  const base = [
    eq(transactions.userId, userId),
    eq(transactions.contactId, contactId),
    inArray(transactions.type, [...LEDGER_TYPES]),
  ];
  const [opening] = range.from
    ? await db
        .select({ value: sql<string>`coalesce(sum(${ledgerDeltaSql("transactions")}), 0)::numeric(18,2)::text` })
        .from(transactions)
        .where(and(...base, lt(transactions.transactionDate, range.from)))
    : [{ value: "0.00" }];

  const rows = await db
    .select({
      id: transactions.id,
      type: transactions.type,
      amount: transactions.amount,
      transactionDate: transactions.transactionDate,
      dueDate: transactions.dueDate,
      title: transactions.title,
      note: transactions.note,
      affectsAccount: transactions.affectsAccount,
      accountName: accounts.name,
      attachmentId: attachments.id,
    })
    .from(transactions)
    .leftJoin(accounts, eq(accounts.id, transactions.accountId))
    .leftJoin(attachments, eq(attachments.transactionId, transactions.id))
    .where(
      and(
        ...base,
        range.from ? gte(transactions.transactionDate, range.from) : undefined,
        range.to ? lte(transactions.transactionDate, range.to) : undefined,
      ),
    )
    .orderBy(asc(transactions.transactionDate), asc(transactions.createdAt));

  let running = opening.value;
  const entries: LedgerEntry[] = rows.map((row) => {
    const signed = ledgerEffect(row.type, row.amount);
    running = addMoney(running, signed);
    return {
      id: row.id,
      type: row.type,
      amount: row.amount,
      signed,
      runningBalance: running,
      transactionDate: row.transactionDate,
      dueDate: row.dueDate,
      title: row.title,
      note: row.note,
      affectsAccount: row.affectsAccount,
      accountName: row.accountName,
      hasAttachment: Boolean(row.attachmentId),
    };
  });
  return { openingBalance: opening.value, entries, closingBalance: running };
}

/** People with an upcoming/overdue due date, for reminders. */
export async function listContactsWithDueDates(userId: string) {
  const rows = await db
    .selectDistinct({ contactId: transactions.contactId })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), isNotNull(transactions.dueDate)));
  return rows.map((r) => r.contactId).filter((id): id is string => Boolean(id));
}
