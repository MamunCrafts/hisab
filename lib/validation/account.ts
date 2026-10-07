import { z } from "zod";
import { dateSchema, signedAmountSchema } from "./common";

export const ACCOUNT_TYPES = ["CASH", "BANK", "MOBILE_WALLET", "CARD", "SAVINGS", "OTHER"] as const;

export const accountSchema = z.object({
  name: z.string().trim().min(1, "validation.required").max(60, "validation.textTooLong"),
  type: z.enum(ACCOUNT_TYPES),
  openingBalance: signedAmountSchema,
  icon: z.string().max(40).nullable().optional(),
});
export type AccountInput = z.input<typeof accountSchema>;

export const adjustBalanceSchema = z.object({
  accountId: z.string().uuid(),
  actualBalance: signedAmountSchema,
  transactionDate: dateSchema,
});

export const DEFAULT_ACCOUNT_ICON: Record<(typeof ACCOUNT_TYPES)[number], string> = {
  CASH: "banknote",
  BANK: "landmark",
  MOBILE_WALLET: "smartphone",
  CARD: "credit-card",
  SAVINGS: "piggy-bank",
  OTHER: "wallet",
};
