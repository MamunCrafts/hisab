import { z } from "zod";
import {
  amountSchema,
  dateSchema,
  idSchema,
  optionalDateSchema,
  optionalIdSchema,
  optionalTextSchema,
  signedAmountSchema,
} from "./common";

const title = optionalTextSchema(120);
const note = optionalTextSchema(1000);

const tags = z
  .union([z.string(), z.array(z.string())])
  .nullish()
  .transform((v) => {
    const list = Array.isArray(v) ? v : (v ?? "").split(",");
    return Array.from(new Set(list.map((t) => t.trim().replace(/^#/, "")).filter(Boolean))).slice(0, 10);
  })
  .refine((list) => list.every((t) => t.length <= 30), "validation.textTooLong");

const accountId = z.string({ error: "validation.selectAccount" }).uuid("validation.selectAccount");
const categoryId = z.string({ error: "validation.selectCategory" }).uuid("validation.selectCategory");
const contactId = z.string({ error: "validation.selectContact" }).uuid("validation.selectContact");

const booleanish = z
  .union([z.boolean(), z.string()])
  .nullish()
  .transform((v) => v === true || v === "true" || v === "on" || v === "1");

export const expenseSchema = z.object({
  type: z.literal("EXPENSE"),
  amount: amountSchema,
  accountId,
  categoryId,
  transactionDate: dateSchema,
  title,
  note,
  tags,
});

export const incomeSchema = expenseSchema.extend({ type: z.literal("INCOME") });

export const transferSchema = z
  .object({
    type: z.literal("TRANSFER"),
    amount: amountSchema,
    accountId,
    destinationAccountId: accountId,
    transactionDate: dateSchema,
    title,
    note,
    tags,
  })
  .refine((v) => v.accountId !== v.destinationAccountId, {
    path: ["destinationAccountId"],
    message: "validation.sameAccount",
  });

export const ledgerEntrySchema = z
  .object({
    type: z.enum(["LEND", "BORROW", "DEBT_RECEIVED", "DEBT_PAID"]),
    amount: amountSchema,
    contactId,
    affectsAccount: booleanish,
    accountId: optionalIdSchema,
    transactionDate: dateSchema,
    dueDate: optionalDateSchema,
    title,
    note,
    tags,
  })
  .superRefine((v, ctx) => {
    if (v.affectsAccount && !v.accountId) {
      ctx.addIssue({ code: "custom", path: ["accountId"], message: "validation.selectAccount" });
    }
    if (v.dueDate && v.dueDate < v.transactionDate) {
      ctx.addIssue({ code: "custom", path: ["dueDate"], message: "validation.dueBeforeDate" });
    }
  })
  .transform((v) => ({
    ...v,
    // Repayments close debts; only new loans carry a due date.
    dueDate: v.type === "LEND" || v.type === "BORROW" ? v.dueDate : null,
    accountId: v.affectsAccount ? v.accountId : null,
  }));

export const adjustmentSchema = z.object({
  type: z.literal("ADJUSTMENT"),
  amount: signedAmountSchema.refine((v) => v !== "0.00", "validation.amountPositive"),
  accountId,
  transactionDate: dateSchema,
  title,
  note,
  tags,
});

export const transactionSchema = z.union([
  expenseSchema,
  incomeSchema,
  transferSchema,
  ledgerEntrySchema,
  adjustmentSchema,
]);

export type TransactionInput = z.infer<typeof transactionSchema>;

/** Pick the schema for a type so errors refer to the right fields. */
export function schemaForType(type: unknown) {
  switch (type) {
    case "EXPENSE":
      return expenseSchema;
    case "INCOME":
      return incomeSchema;
    case "TRANSFER":
      return transferSchema;
    case "LEND":
    case "BORROW":
    case "DEBT_RECEIVED":
    case "DEBT_PAID":
      return ledgerEntrySchema;
    case "ADJUSTMENT":
      return adjustmentSchema;
    default:
      return null;
  }
}

export const deleteTransactionSchema = z.object({ id: idSchema });

/** Convert FormData from the transaction forms into a plain object. */
export function formDataToObject(formData: FormData): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") result[key] = value;
  }
  return result;
}
