import assert from "node:assert/strict";
import { test } from "node:test";
import { addMoney, divideMoney, fromPaisa, parseAmountInput, percentOf, subtractMoney, toPaisa } from "../lib/money";
import { formatCurrency, formatDate } from "../lib/format";

test("money arithmetic is exact (no floating point)", () => {
  assert.equal(addMoney("0.10", "0.20"), "0.30");
  assert.equal(addMoney("10000.00", "-500.00"), "9500.00");
  assert.equal(subtractMoney("1.00", "0.99"), "0.01");
  assert.equal(fromPaisa(toPaisa("-12.5")), "-12.50");
  assert.equal(divideMoney("100.00", 3), "33.33");
  assert.equal(percentOf("750", "1000"), 75);
});

test("amount input parsing accepts commas and Bangla digits", () => {
  assert.equal(parseAmountInput("1,250"), "1250.00");
  assert.equal(parseAmountInput("১২৫০"), "1250.00");
  assert.equal(parseAmountInput("৳ 500.5"), "500.50");
  assert.equal(parseAmountInput("12.345"), null);
  assert.equal(parseAmountInput("abc"), null);
  assert.equal(parseAmountInput("-5"), null);
});

test("currency formatting uses lakh grouping and hides .00", () => {
  assert.equal(formatCurrency("500"), "৳500");
  assert.equal(formatCurrency("1250"), "৳1,250");
  assert.equal(formatCurrency("25500"), "৳25,500");
  assert.equal(formatCurrency("120000"), "৳1,20,000");
  assert.equal(formatCurrency("1250.5"), "৳1,250.50");
  assert.equal(formatCurrency("-450"), "−৳450");
  assert.equal(formatCurrency("12500", { signed: true }), "+৳12,500");
});

test("date format is DD MMM YYYY", () => {
  assert.equal(formatDate("2026-10-07"), "07 Oct 2026");
  assert.equal(formatDate("2026-09-12"), "12 Sep 2026");
});

import { contactSchema } from "../lib/validation/contact";
import { schemaForType } from "../lib/validation/transaction";
import { accountSchema } from "../lib/validation/account";

test("optional fields may be omitted entirely", () => {
  assert.equal(contactSchema.safeParse({ name: "Rahim" }).success, true);
  assert.equal(accountSchema.safeParse({ name: "Cash", type: "CASH" }).success, true);
  const lend = schemaForType("LEND")!.safeParse({
    type: "LEND",
    amount: "1000",
    contactId: "6f1c3c1e-2b1a-4c3d-9e8f-0a1b2c3d4e5f",
    accountId: "7f1c3c1e-2b1a-4c3d-9e8f-0a1b2c3d4e5f",
    affectsAccount: true,
    transactionDate: "2026-10-07",
  });
  assert.equal(lend.success, true);
  const expense = schemaForType("EXPENSE")!.safeParse({
    type: "EXPENSE",
    amount: "1,250",
    accountId: "7f1c3c1e-2b1a-4c3d-9e8f-0a1b2c3d4e5f",
    categoryId: "8f1c3c1e-2b1a-4c3d-9e8f-0a1b2c3d4e5f",
    transactionDate: "2026-10-07",
  });
  assert.ok(expense.success && expense.data.amount === "1250.00");
});

import { roundToWhole } from "../lib/money";
test("estimates round to whole taka", () => {
  assert.equal(roundToWhole("64.29"), "64.00");
  assert.equal(roundToWhole("1992.50"), "1993.00");
  assert.equal(roundToWhole("-10.50"), "-11.00");
});
