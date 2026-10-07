import { ACCOUNT_DIRECTION, type TransactionType } from "./rules";
import { compareMoney } from "@/lib/money";

export type AmountTone = "income" | "expense" | "receivable" | "payable" | "neutral";

/**
 * How an amount is shown in lists: sign from the account's perspective and a
 * semantic tone. Debts use receivable/payable tones, never income/expense.
 */
export function amountPresentation(tx: {
  type: TransactionType;
  amount: string;
  affectsAccount: boolean;
}): { sign: "+" | "−" | ""; tone: AmountTone } {
  const tone: AmountTone =
    tx.type === "INCOME"
      ? "income"
      : tx.type === "EXPENSE"
        ? "expense"
        : tx.type === "LEND" || tx.type === "DEBT_RECEIVED"
          ? "receivable"
          : tx.type === "BORROW" || tx.type === "DEBT_PAID"
            ? "payable"
            : "neutral";
  if (tx.type === "TRANSFER" || !tx.affectsAccount) return { sign: "", tone };
  const direction = tx.type === "ADJUSTMENT" ? compareMoney(tx.amount, "0") : ACCOUNT_DIRECTION[tx.type];
  return { sign: direction > 0 ? "+" : "−", tone };
}

export const TONE_TEXT: Record<AmountTone, string> = {
  income: "text-income",
  expense: "text-expense",
  receivable: "text-receivable",
  payable: "text-payable",
  neutral: "text-foreground",
};

export const TONE_SOFT: Record<AmountTone, string> = {
  income: "bg-income-soft text-income",
  expense: "bg-expense-soft text-expense",
  receivable: "bg-receivable-soft text-receivable",
  payable: "bg-payable-soft text-payable",
  neutral: "bg-neutral-soft text-neutral-tone",
};
