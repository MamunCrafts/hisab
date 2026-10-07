"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { categories } from "@/db/schema";
import { UserFacingError } from "@/lib/action-result";
import { authedAction } from "@/lib/safe-action";
import { categorySchema } from "@/lib/validation/category";

const idSchema = z.string().uuid();

export async function createCategoryAction(input: unknown) {
  const result = await authedAction(categorySchema, input, async ({ userId, input }) => {
    const [{ next }] = await db
      .select({ next: sql<number>`coalesce(max(${categories.sortOrder}), -1)::int + 1` })
      .from(categories)
      .where(and(eq(categories.userId, userId), eq(categories.kind, input.kind)));
    const [created] = await db
      .insert(categories)
      .values({ ...input, userId, sortOrder: next })
      .returning({ id: categories.id });
    return created;
  });
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

/** Rename / restyle. Kind can't change so past transactions stay consistent. */
export async function updateCategoryAction(id: string, input: unknown) {
  const result = await authedAction(
    z.object({ id: idSchema, data: categorySchema.omit({ kind: true }) }),
    { id, data: input },
    async ({ userId, input }) => {
      const [updated] = await db
        .update(categories)
        .set(input.data)
        .where(and(eq(categories.userId, userId), eq(categories.id, input.id)))
        .returning({ id: categories.id });
      if (!updated) throw new UserFacingError("errors.notFound");
      return null;
    },
  );
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

export async function setCategoryArchivedAction(id: string, archived: boolean) {
  const result = await authedAction(z.object({ id: idSchema, archived: z.boolean() }), { id, archived }, async ({ userId, input }) => {
    const [updated] = await db
      .update(categories)
      .set({ isArchived: input.archived })
      .where(and(eq(categories.userId, userId), eq(categories.id, input.id)))
      .returning({ id: categories.id });
    if (!updated) throw new UserFacingError("errors.notFound");
    return null;
  });
  if (result.ok) revalidatePath("/", "layout");
  return result;
}
