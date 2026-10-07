import { z } from "zod";
import { amountSchema, dateSchema, optionalDateSchema, optionalTextSchema } from "./common";

export const recurringSchema = z
  .object({
    type: z.enum(["EXPENSE", "INCOME"]),
    title: z.string().trim().min(1, "validation.required").max(80, "validation.textTooLong"),
    amount: amountSchema,
    categoryId: z.string({ error: "validation.selectCategory" }).uuid("validation.selectCategory"),
    accountId: z.string({ error: "validation.selectAccount" }).uuid("validation.selectAccount"),
    frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]),
    startDate: dateSchema,
    endDate: optionalDateSchema,
    note: optionalTextSchema(500),
  })
  .refine((v) => !v.endDate || v.endDate >= v.startDate, { path: ["endDate"], message: "validation.endBeforeStart" });
export type RecurringInput = z.input<typeof recurringSchema>;
