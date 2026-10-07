import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { categoryId, createTestUser, migrateTestDb } from "./helpers";

type Mods = {
  accounts: typeof import("@/db/mutations/accounts");
  tx: typeof import("@/db/mutations/transactions");
  contacts: typeof import("@/db/mutations/contacts");
  accountQ: typeof import("@/db/queries/accounts");
  dash: typeof import("@/db/queries/dashboard");
  txQ: typeof import("@/db/queries/transactions");
  client: typeof import("@/db/client");
};
let m: Mods;
const TODAY = "2026-10-07";

before(async () => {
  await migrateTestDb();
  m = {
    accounts: await import("@/db/mutations/accounts"),
    tx: await import("@/db/mutations/transactions"),
    contacts: await import("@/db/mutations/contacts"),
    accountQ: await import("@/db/queries/accounts"),
    dash: await import("@/db/queries/dashboard"),
    txQ: await import("@/db/queries/transactions"),
    client: await import("@/db/client"),
  };
});

after(async () => {
  await m.client.pool.end();
});

async function balances(userId: string) {
  const list = await m.accountQ.listAccountsWithBalances(userId);
  return Object.fromEntries(list.map((a) => [a.name, a.balance]));
}

const base = { title: null, note: null, tags: [] as string[] };

test("spec §87 critical financial test case (database)", async () => {
  const user = await createTestUser("Critical");
  const cash = await m.accounts.createAccount(user, { name: "Cash", type: "CASH", openingBalance: "10000.00", icon: null });
  const bkash = await m.accounts.createAccount(user, { name: "bKash", type: "MOBILE_WALLET", openingBalance: "5000.00", icon: null });
  const rahim = await m.contacts.createContact(user, { name: "Rahim", phone: null, email: null, note: null });
  const karim = await m.contacts.createContact(user, { name: "Karim", phone: null, email: null, note: null });
  const food = await categoryId(user, "food");
  const month = () => m.dash.getIncomeExpense(user, "2026-10-01", "2026-10-31");

  // Action 1: expense ৳1,000 from Cash
  await m.tx.createTransaction(user, { type: "EXPENSE", amount: "1000.00", accountId: cash.id, categoryId: food, transactionDate: TODAY, ...base });
  assert.deepEqual(await balances(user), { Cash: "9000.00", bKash: "5000.00" });
  assert.equal((await month()).expense, "1000.00");

  // Action 2: transfer ৳2,000 Cash → bKash
  await m.tx.createTransaction(user, { type: "TRANSFER", amount: "2000.00", accountId: cash.id, destinationAccountId: bkash.id, transactionDate: TODAY, ...base });
  assert.deepEqual(await balances(user), { Cash: "7000.00", bKash: "7000.00" });
  assert.deepEqual(await month(), { income: "0.00", expense: "1000.00", count: 1 });

  // Action 3: lend Rahim ৳3,000 from bKash
  await m.tx.createTransaction(user, { type: "LEND", amount: "3000.00", contactId: rahim.id, accountId: bkash.id, affectsAccount: true, transactionDate: TODAY, dueDate: null, ...base });
  assert.equal((await balances(user)).bKash, "4000.00");
  assert.equal((await month()).expense, "1000.00");

  // Action 4: Rahim repays ৳1,000 into Cash
  await m.tx.createTransaction(user, { type: "DEBT_RECEIVED", amount: "1000.00", contactId: rahim.id, accountId: cash.id, affectsAccount: true, transactionDate: TODAY, dueDate: null, ...base });
  assert.equal((await balances(user)).Cash, "8000.00");
  assert.equal((await month()).income, "0.00");

  // Action 5: borrow ৳5,000 from Karim into Cash
  await m.tx.createTransaction(user, { type: "BORROW", amount: "5000.00", contactId: karim.id, accountId: cash.id, affectsAccount: true, transactionDate: TODAY, dueDate: null, ...base });
  assert.deepEqual(await balances(user), { Cash: "13000.00", bKash: "4000.00" });
  assert.deepEqual(await month(), { income: "0.00", expense: "1000.00", count: 1 });
});

test("phase 2: expense, income, transfer, edit and delete recalculate", async () => {
  const user = await createTestUser("Phase2");
  const cash = await m.accounts.createAccount(user, { name: "Cash", type: "CASH", openingBalance: "10000.00", icon: null });
  const bkash = await m.accounts.createAccount(user, { name: "bKash", type: "MOBILE_WALLET", openingBalance: "0", icon: null });
  const food = await categoryId(user, "food");
  const salary = await categoryId(user, "salary", "INCOME");

  const expense = await m.tx.createTransaction(user, { type: "EXPENSE", amount: "500.00", accountId: cash.id, categoryId: food, transactionDate: TODAY, ...base });
  assert.equal((await balances(user)).Cash, "9500.00");

  await m.tx.createTransaction(user, { type: "INCOME", amount: "2000.00", accountId: cash.id, categoryId: salary, transactionDate: TODAY, ...base });
  assert.equal((await balances(user)).Cash, "11500.00");

  await m.tx.createTransaction(user, { type: "TRANSFER", amount: "1000.00", accountId: cash.id, destinationAccountId: bkash.id, transactionDate: TODAY, ...base });
  const after = await balances(user);
  assert.equal(after.Cash, "10500.00");
  assert.equal(after.bKash, "1000.00");

  await m.tx.updateTransaction(user, expense.id, { type: "EXPENSE", amount: "800.00", accountId: cash.id, categoryId: food, transactionDate: TODAY, ...base });
  assert.equal((await balances(user)).Cash, "10200.00");

  await m.tx.deleteTransaction(user, expense.id);
  assert.equal((await balances(user)).Cash, "11000.00");

  // Category of the wrong kind is rejected.
  await assert.rejects(
    m.tx.createTransaction(user, { type: "EXPENSE", amount: "1.00", accountId: cash.id, categoryId: salary, transactionDate: TODAY, ...base }),
  );
  // Adjustment records the difference without touching income/expense.
  const adj = await m.accounts.adjustAccountBalance(user, cash.id, "10990.00", TODAY);
  assert.equal(adj.difference, "-10.00");
  assert.equal((await balances(user)).Cash, "10990.00");
  assert.deepEqual(await m.dash.getIncomeExpense(user, "2026-10-01", "2026-10-31"), { income: "2000.00", expense: "0.00", count: 1 });
});

test("authorization: user B can never read or modify user A's records", async () => {
  const a = await createTestUser("Alice");
  const b = await createTestUser("Bob");
  const aCash = await m.accounts.createAccount(a, { name: "Cash", type: "CASH", openingBalance: "100", icon: null });
  const bCash = await m.accounts.createAccount(b, { name: "Cash", type: "CASH", openingBalance: "100", icon: null });
  const aFood = await categoryId(a, "food");
  const bFood = await categoryId(b, "food");
  const aTx = await m.tx.createTransaction(a, { type: "EXPENSE", amount: "10.00", accountId: aCash.id, categoryId: aFood, transactionDate: TODAY, ...base });

  assert.equal(await m.txQ.getTransaction(b, aTx.id), null);
  await assert.rejects(m.tx.deleteTransaction(b, aTx.id));
  await assert.rejects(
    m.tx.updateTransaction(b, aTx.id, { type: "EXPENSE", amount: "1.00", accountId: bCash.id, categoryId: bFood, transactionDate: TODAY, ...base }),
  );
  // B cannot book against A's account or category.
  await assert.rejects(
    m.tx.createTransaction(b, { type: "EXPENSE", amount: "1.00", accountId: aCash.id, categoryId: bFood, transactionDate: TODAY, ...base }),
  );
  await assert.rejects(
    m.tx.createTransaction(b, { type: "EXPENSE", amount: "1.00", accountId: bCash.id, categoryId: aFood, transactionDate: TODAY, ...base }),
  );
  await assert.rejects(m.accounts.deleteAccount(b, aCash.id));
  await assert.rejects(m.accounts.updateAccount(b, aCash.id, { name: "x", type: "CASH", openingBalance: "0", icon: null }));
  assert.equal((await balances(a)).Cash, "90.00");
  assert.equal((await m.accountQ.listAccountsWithBalances(b)).length, 1);
});

test("phase 3: ledger balances, partial repayment, settlement, due dates", async () => {
  const ledger = await import("@/db/queries/ledger");
  const user = await createTestUser("Ledger");
  const cash = await m.accounts.createAccount(user, { name: "Cash", type: "CASH", openingBalance: "10000.00", icon: null });
  const rahim = await m.contacts.createContact(user, { name: "Rahim", phone: null, email: null, note: null });
  const karim = await m.contacts.createContact(user, { name: "Karim", phone: null, email: null, note: null });
  const entry = (type: "LEND" | "BORROW" | "DEBT_RECEIVED" | "DEBT_PAID", amount: string, contactId: string, extra: { dueDate?: string; affectsAccount?: boolean } = {}) =>
    m.tx.createTransaction(user, {
      type,
      amount,
      contactId,
      accountId: extra.affectsAccount === false ? null : cash.id,
      affectsAccount: extra.affectsAccount ?? true,
      transactionDate: "2026-10-01",
      dueDate: extra.dueDate ?? null,
      ...base,
    });
  const byName = async () => Object.fromEntries((await ledger.listContactBalances(user, TODAY)).map((c) => [c.name, c]));

  await entry("LEND", "1000.00", rahim.id, { dueDate: "2026-10-05" });
  assert.equal((await byName()).Rahim.balance, "1000.00");
  await entry("DEBT_RECEIVED", "400.00", rahim.id);
  assert.equal((await byName()).Rahim.balance, "600.00");
  assert.equal((await byName()).Rahim.dueStatus, "OVERDUE");

  await entry("BORROW", "2000.00", karim.id);
  assert.equal((await byName()).Karim.balance, "-2000.00");
  await entry("DEBT_PAID", "500.00", karim.id);
  assert.equal((await byName()).Karim.balance, "-1500.00");

  const summary = await ledger.getDebtSummary(user, TODAY);
  assert.deepEqual(summary.receivable, { total: "600.00", count: 1 });
  assert.deepEqual(summary.payable, { total: "1500.00", count: 1 });
  assert.equal(summary.overdueCount, 1);

  // Off-balance entry: ledger changes, cash does not.
  await entry("LEND", "300.00", rahim.id, { affectsAccount: false });
  assert.equal((await byName()).Rahim.balance, "900.00");
  // Cash: 10000 -1000 +400 +2000 -500 = 10900
  assert.equal((await balances(user)).Cash, "10900.00");

  // Full settlement keeps history.
  await entry("DEBT_RECEIVED", "900.00", rahim.id);
  const settled = (await byName()).Rahim;
  assert.equal(settled.status, "SETTLED");
  assert.equal(settled.entryCount, 4);

  // None of this touched income/expense.
  assert.deepEqual(await m.dash.getIncomeExpense(user, "2026-10-01", "2026-10-31"), { income: "0.00", expense: "0.00", count: 0 });

  // Statement with running balance and opening balance from a range.
  const statement = await ledger.getContactStatement(user, karim.id);
  assert.deepEqual(statement.entries.map((e) => e.runningBalance), ["-2000.00", "-1500.00"]);

  // Deleting a ledger entry updates the person's balance.
  const extra = await entry("DEBT_PAID", "100.00", karim.id);
  assert.equal((await byName()).Karim.balance, "-1400.00");
  await m.tx.deleteTransaction(user, extra.id);
  assert.equal((await byName()).Karim.balance, "-1500.00");
});

test("phase 4: budgets use expenses only; recurring confirm/skip; analytics exclude debts", async () => {
  const budgetsQ = await import("@/db/queries/budgets");
  const recurringM = await import("@/db/mutations/recurring");
  const user = await createTestUser("Phase4");
  const cash = await m.accounts.createAccount(user, { name: "Cash", type: "CASH", openingBalance: "50000", icon: null });
  const food = await categoryId(user, "food");
  const rent = await categoryId(user, "rent");
  const rahim = await m.contacts.createContact(user, { name: "Rahim", phone: null, email: null, note: null });
  const { db } = m.client;
  const { budgets } = await import("@/db/schema");
  await db.insert(budgets).values({ userId: user, categoryId: food, amount: "10000.00" });

  await m.tx.createTransaction(user, { type: "EXPENSE", amount: "7500.00", accountId: cash.id, categoryId: food, transactionDate: TODAY, ...base });
  // A loan must not count toward any budget.
  await m.tx.createTransaction(user, { type: "LEND", amount: "9000.00", contactId: rahim.id, accountId: cash.id, affectsAccount: true, transactionDate: TODAY, dueDate: null, ...base });
  let [usage] = await budgetsQ.listBudgetUsage(user, "2026-10-01", "2026-10-31");
  assert.equal(usage.spent, "7500.00");
  assert.equal(usage.state, "WARNING");
  await m.tx.createTransaction(user, { type: "EXPENSE", amount: "2500.00", accountId: cash.id, categoryId: food, transactionDate: TODAY, ...base });
  [usage] = await budgetsQ.listBudgetUsage(user, "2026-10-01", "2026-10-31");
  assert.equal(usage.state, "EXCEEDED");

  const rule = await recurringM.createRule(
    user,
    { type: "EXPENSE", title: "Rent", amount: "15000.00", categoryId: rent, accountId: cash.id, frequency: "MONTHLY", startDate: "2026-10-01", endDate: null, note: null },
    TODAY,
  );
  const { recurringRules } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  const [stored] = await db.select().from(recurringRules).where(eq(recurringRules.id, rule.id));
  assert.equal(stored.nextOccurrence, "2026-11-01"); // first occurrence on/after today
  await recurringM.resolveOccurrence(user, rule.id, "2026-11-01", "skip");
  await assert.rejects(recurringM.resolveOccurrence(user, rule.id, "2026-11-01", "confirm")); // stale occurrence
  const confirmed = await recurringM.resolveOccurrence(user, rule.id, "2026-12-01", "confirm");
  assert.ok(confirmed.transactionId);
  assert.equal((await balances(user)).Cash, "16000.00"); // 50000-7500-9000-2500-15000

  const oct = await m.dash.getIncomeExpense(user, "2026-10-01", "2026-10-31");
  assert.equal(oct.expense, "10000.00");
});
