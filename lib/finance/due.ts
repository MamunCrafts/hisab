import type { DateString } from "@/lib/dates";
import { fromPaisa, toPaisa, type MoneyString } from "@/lib/money";
import { LEDGER_SIGN, isLedgerType, type TransactionType } from "./rules";

export type DueStatus = "SETTLED" | "OVERDUE" | "DUE_TODAY" | "UPCOMING" | "NO_DUE";

export type LedgerEntryLite = {
  type: TransactionType;
  amount: MoneyString;
  transactionDate: DateString;
  dueDate: DateString | null;
};

type Lot = { remaining: bigint; dueDate: DateString | null };

/**
 * Works out which debts are still open using first-in-first-out repayment:
 * repayments settle the oldest loans first. Returns the nearest due date of
 * the still-open loans and the resulting status (spec §45).
 * Entries must be in chronological order.
 */
export function calculateDueStatus(
  entries: LedgerEntryLite[],
  today: DateString,
): { status: DueStatus; nearestDue: DateString | null; balance: MoneyString } {
  // Lots are positive for "they owe me" and negative for "I owe them"; all open lots share one sign.
  let lots: Lot[] = [];
  for (const entry of entries) {
    if (!isLedgerType(entry.type)) continue;
    let value = toPaisa(entry.amount) * BigInt(LEDGER_SIGN[entry.type]);
    const createsDebt = entry.type === "LEND" || entry.type === "BORROW";
    while (value !== BigInt(0) && lots.length > 0 && (lots[0].remaining > BigInt(0)) !== (value > BigInt(0))) {
      const lot = lots[0];
      const sum = lot.remaining + value;
      if ((sum > BigInt(0)) === (lot.remaining > BigInt(0)) && sum !== BigInt(0)) {
        lot.remaining = sum;
        value = BigInt(0);
      } else {
        value = sum;
        lots = lots.slice(1);
      }
    }
    if (value !== BigInt(0)) lots.push({ remaining: value, dueDate: createsDebt ? entry.dueDate : null });
  }
  const balance = lots.reduce((s, l) => s + l.remaining, BigInt(0));
  if (balance === BigInt(0)) return { status: "SETTLED", nearestDue: null, balance: "0.00" };
  const dues = lots.map((l) => l.dueDate).filter((d): d is DateString => Boolean(d)).sort();
  const nearestDue = dues[0] ?? null;
  const status: DueStatus = !nearestDue ? "NO_DUE" : nearestDue < today ? "OVERDUE" : nearestDue === today ? "DUE_TODAY" : "UPCOMING";
  return { status, nearestDue, balance: fromPaisa(balance) };
}
