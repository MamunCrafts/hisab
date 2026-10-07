import "server-only";
import { and, eq, lt, or } from "drizzle-orm";
import { db } from "@/db/client";
import { accounts, transactions } from "@/db/schema";
import { isDateString, startOfMonth, type DateString } from "@/lib/dates";
import { categoryLabel } from "@/lib/finance/categories";
import { parseTransactionFilters, type TransactionFilters } from "@/lib/finance/filters";
import { accountEffect, calculateCashFlow, ledgerStatus } from "@/lib/finance/rules";
import type { Translator } from "@/lib/i18n/translate";
import { absMoney, addMoney, type MoneyString } from "@/lib/money";
import { getCategoryTotals, getMonthlySeries } from "./dashboard";
import { listContactBalances } from "./ledger";
import { exportTransactions, type FilterContext } from "./transactions";
import { transactionPrimaryLabel } from "@/lib/finance/labels";

export const REPORT_TYPES = ["expense", "income", "cashflow", "category", "account", "ledger", "receivable", "payable"] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export type ReportParams = {
  type: ReportType;
  from: DateString;
  to: DateString;
  accountId: string | null;
  categoryId: string | null;
  contactId: string | null;
};

export type Cell =
  | { kind: "text"; value: string }
  | { kind: "date"; value: DateString | null }
  | { kind: "money"; value: MoneyString; tone?: "income" | "expense" | "receivable" | "payable" };

export type Report = {
  columns: Array<{ label: string; align?: "right" }>;
  rows: Cell[][];
  footer: Cell[] | null;
  summary: Array<{ label: string; value: Cell }>;
  needsAccount?: boolean;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseReportParams(sp: Record<string, string | string[] | undefined>, today: DateString): ReportParams {
  const one = (k: string) => {
    const v = sp[k];
    return typeof v === "string" ? v : null;
  };
  const uuid = (k: string) => (one(k) && UUID.test(one(k)!) ? one(k) : null);
  const type = (REPORT_TYPES as readonly string[]).includes(one("type") ?? "") ? (one("type") as ReportType) : "expense";
  const from = one("from") && isDateString(one("from")!) ? one("from")! : startOfMonth(today);
  const to = one("to") && isDateString(one("to")!) ? one("to")! : today;
  return { type, from: from <= to ? from : to, to: from <= to ? to : from, accountId: uuid("accountId"), categoryId: uuid("categoryId"), contactId: uuid("contactId") };
}

const text = (value: string | null | undefined): Cell => ({ kind: "text", value: value ?? "" });
const money = (value: MoneyString, tone?: Extract<Cell, { kind: "money" }>["tone"]): Cell => ({ kind: "money", value, tone });
const date = (value: DateString | null): Cell => ({ kind: "date", value });

export async function buildReport(userId: string, p: ReportParams, ctx: FilterContext, t: Translator): Promise<Report> {
  const txFilters = (type: TransactionFilters["type"]): TransactionFilters => ({
    ...parseTransactionFilters({}),
    range: "custom",
    from: p.from,
    to: p.to,
    type,
    accountId: p.accountId,
    categoryId: p.categoryId,
    contactId: p.contactId,
  });

  switch (p.type) {
    case "expense":
    case "income": {
      const items = await exportTransactions(userId, txFilters(p.type === "expense" ? "EXPENSE" : "INCOME"), ctx);
      const total = addMoney(...items.map((i) => i.amount));
      const tone = p.type === "expense" ? "expense" : "income";
      return {
        columns: [{ label: t("form.date") }, { label: t("form.title") }, { label: t("form.category") }, { label: t("form.account") }, { label: t("form.amount"), align: "right" }],
        rows: items.map((i) => [date(i.transactionDate), text(transactionPrimaryLabel(i, t)), text(categoryLabel(i.category, t)), text(i.account?.name), money(i.amount, tone)]),
        footer: [text(t("reports.total")), text(""), text(""), text(`${items.length}`), money(total, tone)],
        summary: [
          { label: t("reports.total"), value: money(total, tone) },
          { label: t("reports.count"), value: text(String(items.length)) },
        ],
      };
    }
    case "cashflow": {
      const months = await getMonthlySeries(userId, p.from, p.to, p.accountId);
      const income = addMoney(...months.map((m) => m.income));
      const expense = addMoney(...months.map((m) => m.expense));
      return {
        columns: [{ label: t("reports.month") }, { label: t("transactions.income"), align: "right" }, { label: t("transactions.expense"), align: "right" }, { label: t("reports.net"), align: "right" }],
        rows: months.map((m) => [date(m.month < p.from ? p.from : m.month), money(m.income, "income"), money(m.expense, "expense"), money(calculateCashFlow(m.income, m.expense))]),
        footer: [text(t("reports.total")), money(income, "income"), money(expense, "expense"), money(calculateCashFlow(income, expense))],
        summary: [
          { label: t("transactions.income"), value: money(income, "income") },
          { label: t("transactions.expense"), value: money(expense, "expense") },
          { label: t("reports.net"), value: money(calculateCashFlow(income, expense)) },
        ],
      };
    }
    case "category": {
      const [exp, inc] = await Promise.all([
        getCategoryTotals(userId, p.from, p.to, "EXPENSE", { accountId: p.accountId }),
        getCategoryTotals(userId, p.from, p.to, "INCOME", { accountId: p.accountId }),
      ]);
      const rows = [
        ...exp.map((c) => [text(categoryLabel(c, t)), text(t("transactionTypes.EXPENSE")), text(String(c.count)), money(c.total, "expense")] as Cell[]),
        ...inc.map((c) => [text(categoryLabel(c, t)), text(t("transactionTypes.INCOME")), text(String(c.count)), money(c.total, "income")] as Cell[]),
      ];
      return {
        columns: [{ label: t("form.category") }, { label: t("recurring.type") }, { label: t("reports.count"), align: "right" }, { label: t("reports.total"), align: "right" }],
        rows,
        footer: null,
        summary: [
          { label: t("transactions.expense"), value: money(addMoney(...exp.map((c) => c.total)), "expense") },
          { label: t("transactions.income"), value: money(addMoney(...inc.map((c) => c.total)), "income") },
        ],
      };
    }
    case "account": {
      if (!p.accountId) return { columns: [], rows: [], footer: null, summary: [], needsAccount: true };
      const [account] = await db
        .select({ id: accounts.id, opening: accounts.openingBalance })
        .from(accounts)
        .where(and(eq(accounts.userId, userId), eq(accounts.id, p.accountId)));
      if (!account) return { columns: [], rows: [], footer: null, summary: [], needsAccount: true };
      const prior = await db
        .select({ type: transactions.type, amount: transactions.amount, accountId: transactions.accountId, destinationAccountId: transactions.destinationAccountId, affectsAccount: transactions.affectsAccount })
        .from(transactions)
        .where(and(eq(transactions.userId, userId), lt(transactions.transactionDate, p.from), or(eq(transactions.accountId, account.id), eq(transactions.destinationAccountId, account.id))));
      const opening = addMoney(account.opening, ...prior.map((tx) => accountEffect(tx, account.id)));
      const items = (await exportTransactions(userId, txFilters(null), ctx)).filter(
        (i) => i.account?.id === account.id || i.destinationAccount?.id === account.id,
      );
      items.reverse();
      let running = opening;
      const rows = items.map((i) => {
        const effect = accountEffect(
          { type: i.type, amount: i.amount, accountId: i.account?.id ?? null, destinationAccountId: i.destinationAccount?.id ?? null, affectsAccount: i.affectsAccount },
          account.id,
        );
        running = addMoney(running, effect);
        const incoming = !effect.startsWith("-");
        return [
          date(i.transactionDate),
          text(`${t(`transactionTypes.${i.type}`)} · ${transactionPrimaryLabel(i, t)}`),
          incoming ? money(effect, "income") : text(""),
          incoming ? text("") : money(absMoney(effect), "expense"),
          money(running),
        ];
      });
      return {
        columns: [{ label: t("form.date") }, { label: t("form.title") }, { label: t("reports.moneyIn"), align: "right" }, { label: t("reports.moneyOut"), align: "right" }, { label: t("reports.balance"), align: "right" }],
        rows: [[date(p.from), text(t("reports.opening")), text(""), text(""), money(opening)], ...rows],
        footer: [text(t("reports.closing")), text(""), text(""), text(""), money(running)],
        summary: [
          { label: t("reports.opening"), value: money(opening) },
          { label: t("reports.closing"), value: money(running) },
        ],
      };
    }
    case "ledger":
    case "receivable":
    case "payable": {
      const people = (await listContactBalances(userId, ctx.today)).filter((c) =>
        p.contactId ? c.id === p.contactId : p.type === "receivable" ? c.status === "RECEIVABLE" : p.type === "payable" ? c.status === "PAYABLE" : c.entryCount > 0,
      );
      const statusText = (b: MoneyString) => {
        const s = ledgerStatus(b);
        return s === "RECEIVABLE" ? t("ledger.youWillGet") : s === "PAYABLE" ? t("ledger.youWillGive") : t("ledger.settled");
      };
      const receivable = addMoney(...people.filter((c) => c.status === "RECEIVABLE").map((c) => c.balance));
      const payable = absMoney(addMoney(...people.filter((c) => c.status === "PAYABLE").map((c) => c.balance)));
      return {
        columns: [{ label: t("reports.person") }, { label: t("reports.status") }, { label: t("reports.lastActivity") }, { label: t("reports.dueDate") }, { label: t("form.amount"), align: "right" }],
        rows: people.map((c) => [
          text(c.name),
          text(statusText(c.balance)),
          date(c.lastActivity),
          date(c.nearestDue),
          money(absMoney(c.balance), c.status === "RECEIVABLE" ? "receivable" : c.status === "PAYABLE" ? "payable" : undefined),
        ]),
        footer: null,
        summary: [
          ...(p.type !== "payable" ? [{ label: t("ledger.totalReceivable"), value: money(receivable, "receivable") }] : []),
          ...(p.type !== "receivable" ? [{ label: t("ledger.totalPayable"), value: money(payable, "payable") }] : []),
        ],
      };
    }
  }
}
