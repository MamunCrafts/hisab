"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { budgets, categories } from "@/db/schema";
import { UserFacingError } from "@/lib/action-result";
import { authedAction } from "@/lib/safe-action";
import { budgetSchema } from "@/lib/validation/budget";

/** Create or update the monthly budget for a category. */
export async function saveBudgetAction(input: unknown) {
  const result = await authedAction(budgetSchema, input, async ({ userId, input }) => {
    const [category] = await db
      .select({ kind: categories.kind })
      .from(categories)
      .where(and(eq(categories.userId, userId), eq(categories.id, input.categoryId)))
      .limit(1);
    if (!category || category.kind !== "EXPENSE") throw new UserFacingError("validation.selectCategory", "categoryId");
    await db
      .insert(budgets)
      .values({ userId, categoryId: input.categoryId, amount: input.amount })
      .onConflictDoUpdate({ target: [budgets.userId, budgets.categoryId], set: { amount: input.amount, updatedAt: new Date() } });
    return null;
  });
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

export async function deleteBudgetAction(id: string) {
  const result = await authedAction(z.string().uuid(), id, async ({ userId, input }) => {
    const [deleted] = await db
      .delete(budgets)
      .where(and(eq(budgets.userId, userId), eq(budgets.id, input)))
      .returning({ id: budgets.id });
    if (!deleted) throw new UserFacingError("errors.notFound");
    return null;
  });
  if (result.ok) revalidatePath("/", "layout");
  return result;
}
