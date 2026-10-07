import { z } from "zod";

export const categorySchema = z.object({
  kind: z.enum(["EXPENSE", "INCOME"]),
  name: z.string().trim().min(1, "validation.required").max(40, "validation.textTooLong"),
  icon: z.string().max(40),
  color: z.string().max(20),
});
export type CategoryInput = z.input<typeof categorySchema>;
