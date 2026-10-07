import { z } from "zod";
import { amountSchema } from "./common";

export const budgetSchema = z.object({
  categoryId: z.string({ error: "validation.selectCategory" }).uuid("validation.selectCategory"),
  amount: amountSchema,
});
