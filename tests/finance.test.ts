import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateAccountBalance,
  calculateBudgetUsage,
  calculateCashFlow,
  calculateChangePercent,
  calculateContactLedgerBalance,
  calculateExpenseSummary,
  calculateIncomeSummary,
  calculatePayable,
  calculateReceivable,
  ledgerStatus,
  type AccountMovement,
} from "../lib/finance/rules";

const CASH = "cash";
const BKASH = "bkash";
const tx = (type: AccountMovement["type"], amount: string, accountId: string | null, extra: Partial<AccountMovement> = {}): AccountMovement => ({
  type,
  amount,
  accountId,
  destinationAccountId: null,
  affectsAccount: true,
  ...extra,
});

test("spec §87 critical financial test case", () => {
  const log: AccountMovement[] = [];
  const cash = () => calculateAccountBalance("10000.00", log, CASH);
  const bkash = () => calculateAccountBalance("5000.00", log, BKASH);
  const all = () => [...log] as Array<AccountMovement & { type: AccountMovement["type"] }>;

  log.push(tx("EXPENSE", "1000.00", CASH));
  assert.equal(cash(), "9000.00");
  assert.equal(calculateExpenseSummary(all()), "1000.00");

  log.push(tx("TRANSFER", "2000.00", CASH, { destinationAccountId: BKASH }));
  assert.equal(cash(), "7000.00");
  assert.equal(bkash(), "7000.00");
  assert.equal(calculateIncomeSummary(all()), "0.00");
  assert.equal(calculateExpenseSummary(all()), "1000.00");

  log.push(tx("LEND", "3000.00", BKASH));
  assert.equal(bkash(), "4000.00");
  assert.equal(calculateExpenseSummary(all()), "1000.00");

  log.push(tx("DEBT_RECEIVED", "1000.00", CASH));
  assert.equal(cash(), "8000.00");
  assert.equal(calculateIncomeSummary(all()), "0.00");

  log.push(tx("BORROW", "5000.00", CASH));
  assert.equal(cash(), "13000.00");
  assert.equal(calculateIncomeSummary(all()), "0.00");

  const rahim = calculateContactLedgerBalance([
    { type: "LEND", amount: "3000.00" },
    { type: "DEBT_RECEIVED", amount: "1000.00" },
  ]);
  const karim = calculateContactLedgerBalance([{ type: "BORROW", amount: "5000.00" }]);
  assert.equal(rahim, "2000.00");
  assert.deepEqual(calculateReceivable([rahim, karim]), { total: "2000.00", count: 1 });
  assert.deepEqual(calculatePayable([rahim, karim]), { total: "5000.00", count: 1 });
});

test("phase 3 ledger walkthrough", () => {
  assert.equal(calculateContactLedgerBalance([{ type: "LEND", amount: "1000" }, { type: "DEBT_RECEIVED", amount: "400" }]), "600.00");
  const karim = calculateContactLedgerBalance([{ type: "BORROW", amount: "2000" }, { type: "DEBT_PAID", amount: "500" }]);
  assert.equal(karim, "-1500.00");
  assert.equal(ledgerStatus(karim), "PAYABLE");
  assert.equal(ledgerStatus("0.00"), "SETTLED");
});

test("entries that don't affect accounts still change the ledger, not the balance", () => {
  const entry = tx("LEND", "700.00", null, { affectsAccount: false });
  assert.equal(calculateAccountBalance("100.00", [entry], CASH), "100.00");
  assert.equal(calculateContactLedgerBalance([entry]), "700.00");
});

test("adjustments carry their sign", () => {
  assert.equal(calculateAccountBalance("100.00", [tx("ADJUSTMENT", "-30.00", CASH)], CASH), "70.00");
});

test("cash flow, change % and budget thresholds", () => {
  assert.equal(calculateCashFlow("5000", "7000"), "-2000.00");
  assert.equal(calculateChangePercent("8600", "10000"), -14);
  assert.equal(calculateChangePercent("100", "0"), null);
  assert.equal(calculateBudgetUsage("7500", "10000").state, "WARNING");
  assert.equal(calculateBudgetUsage("7499", "10000").state, "NORMAL");
  assert.equal(calculateBudgetUsage("9999", "10000").state, "WARNING");
  assert.equal(calculateBudgetUsage("10000", "10000").state, "EXCEEDED");
});

import { calculateDueStatus } from "../lib/finance/due";

test("due status follows FIFO repayment", () => {
  const today = "2026-10-07";
  const e = (type: "LEND" | "BORROW" | "DEBT_RECEIVED" | "DEBT_PAID", amount: string, date: string, due: string | null = null) => ({
    type,
    amount,
    transactionDate: date,
    dueDate: due,
  });
  // Older loan with past due is fully repaid → only the newer (future) due remains.
  assert.deepEqual(
    calculateDueStatus([e("LEND", "1000", "2026-09-01", "2026-09-30"), e("LEND", "500", "2026-10-01", "2026-10-20"), e("DEBT_RECEIVED", "1000", "2026-10-02")], today),
    { status: "UPCOMING", nearestDue: "2026-10-20", balance: "500.00" },
  );
  // Partially repaid overdue loan is still overdue.
  assert.equal(calculateDueStatus([e("LEND", "1000", "2026-09-01", "2026-09-30"), e("DEBT_RECEIVED", "400", "2026-10-02")], today).status, "OVERDUE");
  assert.equal(calculateDueStatus([e("BORROW", "2000", "2026-10-01", today)], today).status, "DUE_TODAY");
  assert.equal(calculateDueStatus([e("BORROW", "2000", "2026-10-01", today), e("DEBT_PAID", "2000", "2026-10-05")], today).status, "SETTLED");
  assert.deepEqual(calculateDueStatus([e("LEND", "100", "2026-10-01"), e("DEBT_RECEIVED", "150", "2026-10-02")], today), {
    status: "NO_DUE",
    nearestDue: null,
    balance: "-50.00",
  });
});

import { firstOccurrenceFrom, nextOccurrenceAfter } from "../lib/finance/recurrence";

test("recurrence keeps month-end anchors and respects end dates", () => {
  assert.equal(nextOccurrenceAfter("2026-01-31", "MONTHLY", "2026-01-31", null), "2026-02-28");
  assert.equal(nextOccurrenceAfter("2026-01-31", "MONTHLY", "2026-02-28", null), "2026-03-31");
  assert.equal(nextOccurrenceAfter("2026-10-01", "WEEKLY", "2026-10-01", null), "2026-10-08");
  assert.equal(nextOccurrenceAfter("2026-10-01", "DAILY", "2026-10-05", null), "2026-10-06");
  assert.equal(nextOccurrenceAfter("2024-02-29", "YEARLY", "2024-02-29", null), "2025-02-28");
  assert.equal(nextOccurrenceAfter("2026-10-01", "MONTHLY", "2026-10-01", "2026-10-31"), null);
  assert.equal(firstOccurrenceFrom("2026-01-15", "MONTHLY", "2026-10-07", null), "2026-10-15");
  assert.equal(firstOccurrenceFrom("2026-11-01", "MONTHLY", "2026-10-07", null), "2026-11-01");
});
