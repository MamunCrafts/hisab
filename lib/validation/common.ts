import { z } from "zod";
import { isDateString } from "@/lib/dates";
import { compareMoney, parseAmountInput } from "@/lib/money";

const MAX_AMOUNT = "9999999999999.99";

/** Strictly positive amount; accepts "1,250", "১২৫০" and returns "1250.00". */
export const amountSchema = z
  .union([z.string(), z.number()])
  .transform((v, ctx) => {
    const parsed = parseAmountInput(String(v));
    if (parsed === null) {
      ctx.addIssue({ code: "custom", message: "validation.amountInvalid" });
      return z.NEVER;
    }
    if (compareMoney(parsed, "0") <= 0) {
      ctx.addIssue({ code: "custom", message: "validation.amountPositive" });
      return z.NEVER;
    }
    if (compareMoney(parsed, MAX_AMOUNT) > 0) {
      ctx.addIssue({ code: "custom", message: "validation.amountTooLarge" });
      return z.NEVER;
    }
    return parsed;
  });

/** Zero-or-positive amount where blank means 0 (e.g. opening balances). */
export const optionalAmountSchema = z
  .union([z.string(), z.number()])
  .nullish()
  .transform((v, ctx) => {
    const raw = v === null || v === undefined ? "" : String(v).trim();
    if (raw === "") return "0.00";
    const parsed = parseAmountInput(raw);
    if (parsed === null) {
      ctx.addIssue({ code: "custom", message: "validation.amountInvalid" });
      return z.NEVER;
    }
    if (compareMoney(parsed, MAX_AMOUNT) > 0) {
      ctx.addIssue({ code: "custom", message: "validation.amountTooLarge" });
      return z.NEVER;
    }
    return parsed;
  });

/** Signed amount (opening balances of credit cards may be negative). */
export const signedAmountSchema = z
  .union([z.string(), z.number()])
  .nullish()
  .transform((v, ctx) => {
    const raw = v === null || v === undefined ? "" : String(v).trim();
    if (raw === "" || raw === "-") return "0.00";
    const negative = raw.startsWith("-") || raw.startsWith("−");
    const parsed = parseAmountInput(negative ? raw.slice(1) : raw);
    if (parsed === null) {
      ctx.addIssue({ code: "custom", message: "validation.amountInvalid" });
      return z.NEVER;
    }
    if (compareMoney(parsed, MAX_AMOUNT) > 0) {
      ctx.addIssue({ code: "custom", message: "validation.amountTooLarge" });
      return z.NEVER;
    }
    return negative && parsed !== "0.00" ? `-${parsed}` : parsed;
  });

export const dateSchema = z.string().refine(isDateString, "validation.dateInvalid");

export const optionalDateSchema = z
  .string()
  .nullish()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || isDateString(v), "validation.dateInvalid");

export const idSchema = z.string().uuid("errors.notFound");

export const optionalIdSchema = z
  .string()
  .nullish()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || z.string().uuid().safeParse(v).success, "errors.notFound");

export const optionalTextSchema = (max: number) =>
  z
    .string()
    .nullish()
    .transform((v) => {
      const trimmed = (v ?? "").trim();
      return trimmed === "" ? null : trimmed;
    })
    .refine((v) => v === null || v.length <= max, "validation.textTooLong");
