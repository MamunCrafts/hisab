/**
 * Hisab accounting rules — the single source of truth for how each transaction
 * type affects account balances, ledger balances and income/expense statistics.
 *
 * Mandatory rule: loans (LEND/BORROW) and their repayments are NEVER income or
 * expense. Transfers are never income or expense either.
 *
 * The SQL equivalents live in `db/queries/finance-sql.ts` and must stay in sync
 * (covered by tests/finance.test.ts and tests/finance-db.test.ts).
 */
import {
  addMoney,
  compareMoney,
  fromPaisa,
  negateMoney,
  percentOf,
  toPaisa,
  type MoneyString,
} from "@/lib/money";

export const TRANSACTION_TYPES = [
  "EXPENSE",
  "INCOME",
  "TRANSFER",
  "LEND",
  "BORROW",
  "DEBT_RECEIVED",
  "DEBT_PAID",
  "ADJUSTMENT",
] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const LEDGER_TYPES = ["LEND", "BORROW", "DEBT_RECEIVED", "DEBT_PAID"] as const;
export type LedgerType = (typeof LEDGER_TYPES)[number];

export function isLedgerType(type: TransactionType): type is LedgerType {
  return (LEDGER_TYPES as readonly string[]).includes(type);
}

/** Only real income/expense count towards income/expense statistics and budgets. */
export function countsAsIncome(type: TransactionType): boolean {
  return type === "INCOME";
}

export function countsAsExpense(type: TransactionType): boolean {
  return type === "EXPENSE";
}

/**
 * Direction of money for the transaction's source account (`accountId`):
 * +1 money comes in, -1 money goes out.
 */
export const ACCOUNT_DIRECTION: Record<TransactionType, 1 | -1> = {
  INCOME: 1,
  EXPENSE: -1,
  TRANSFER: -1, // outgoing side; the destination account receives +amount
  LEND: -1,
  BORROW: 1,
  DEBT_RECEIVED: 1,
  DEBT_PAID: -1,
  ADJUSTMENT: 1, // amount carries its own sign
};

/**
 * Signed ledger value used for contact balances (spec §36):
 * positive balance = they owe me (পাবো), negative = I owe them (দিতে হবে).
 */
export const LEDGER_SIGN: Record<LedgerType, 1 | -1> = {
  LEND: 1,
  DEBT_RECEIVED: -1,
  BORROW: -1,
  DEBT_PAID: 1,
};

export type AccountMovement = {
  type: TransactionType;
  amount: MoneyString;
  accountId: string | null;
  destinationAccountId: string | null;
  affectsAccount: boolean;
};

/** Effect of one transaction on one account's balance. */
export function accountEffect(tx: AccountMovement, accountId: string): MoneyString {
  if (!tx.affectsAccount) return "0.00";
  let paisa = BigInt(0);
  if (tx.accountId === accountId) {
    paisa += toPaisa(tx.amount) * BigInt(ACCOUNT_DIRECTION[tx.type]);
  }
  if (tx.type === "TRANSFER" && tx.destinationAccountId === accountId) {
    paisa += toPaisa(tx.amount);
  }
  return fromPaisa(paisa);
}

/** Opening balance plus every movement affecting the account (spec §25). */
export function calculateAccountBalance(
  openingBalance: MoneyString,
  transactions: AccountMovement[],
  accountId: string,
): MoneyString {
  return addMoney(openingBalance, ...transactions.map((tx) => accountEffect(tx, accountId)));
}

/** Signed ledger value of one entry. */
export function ledgerEffect(type: TransactionType, amount: MoneyString): MoneyString {
  if (!isLedgerType(type)) return "0.00";
  return LEDGER_SIGN[type] === 1 ? amount : negateMoney(amount);
}

/** Sum of signed ledger values for one contact. Ignores the account toggle. */
export function calculateContactLedgerBalance(
  entries: Array<{ type: TransactionType; amount: MoneyString }>,
): MoneyString {
  return addMoney(...entries.map((e) => ledgerEffect(e.type, e.amount)));
}

export type LedgerStatus = "RECEIVABLE" | "PAYABLE" | "SETTLED";

export function ledgerStatus(balance: MoneyString): LedgerStatus {
  const sign = compareMoney(balance, "0");
  return sign > 0 ? "RECEIVABLE" : sign < 0 ? "PAYABLE" : "SETTLED";
}

/** Total others owe me: sum of positive contact balances. */
export function calculateReceivable(balances: MoneyString[]): { total: MoneyString; count: number } {
  const positive = balances.filter((b) => compareMoney(b, "0") > 0);
  return { total: addMoney(...positive), count: positive.length };
}

/** Total I owe others: sum of negative contact balances, as a positive amount. */
export function calculatePayable(balances: MoneyString[]): { total: MoneyString; count: number } {
  const negative = balances.filter((b) => compareMoney(b, "0") < 0);
  return { total: negateMoney(addMoney(...negative)), count: negative.length };
}

export function calculateExpenseSummary(transactions: Array<{ type: TransactionType; amount: MoneyString }>): MoneyString {
  return addMoney(...transactions.filter((t) => countsAsExpense(t.type)).map((t) => t.amount));
}

export function calculateIncomeSummary(transactions: Array<{ type: TransactionType; amount: MoneyString }>): MoneyString {
  return addMoney(...transactions.filter((t) => countsAsIncome(t.type)).map((t) => t.amount));
}

export function calculateCashFlow(income: MoneyString, expense: MoneyString): MoneyString {
  return addMoney(income, negateMoney(expense));
}

/**
 * Period-over-period change in percent. Returns null when there is no
 * previous-period data to compare against (avoid misleading comparisons).
 */
export function calculateChangePercent(current: MoneyString, previous: MoneyString): number | null {
  if (compareMoney(previous, "0") <= 0) return null;
  const pct = percentOf(addMoney(current, negateMoney(previous)), previous);
  return pct;
}

export type BudgetState = "NORMAL" | "WARNING" | "EXCEEDED";

/** Budget usage with thresholds: <75% normal, 75–99% warning, ≥100% exceeded (spec §54). */
export function calculateBudgetUsage(
  spent: MoneyString,
  limit: MoneyString,
): { percent: number; state: BudgetState; remaining: MoneyString } {
  const limitPaisa = toPaisa(limit);
  const spentPaisa = toPaisa(spent);
  // Floor so 99.6% is still "warning", never rounded up to an "exceeded" 100%.
  const percent = limitPaisa > BigInt(0) ? Number((spentPaisa * BigInt(100)) / limitPaisa) : 0;
  const state: BudgetState =
    spentPaisa >= limitPaisa && limitPaisa > BigInt(0) ? "EXCEEDED" : percent >= 75 ? "WARNING" : "NORMAL";
  return { percent, state, remaining: fromPaisa(limitPaisa - spentPaisa) };
}
