import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { categories } from "@/db/schema";

export type Category = typeof categories.$inferSelect;
export type CategoryKind = Category["kind"];

export async function listCategories(userId: string, kind?: CategoryKind) {
  return db
    .select({
      id: categories.id,
      kind: categories.kind,
      systemKey: categories.systemKey,
      name: categories.name,
      icon: categories.icon,
      color: categories.color,
      isArchived: categories.isArchived,
      sortOrder: categories.sortOrder,
    })
    .from(categories)
    .where(kind ? and(eq(categories.userId, userId), eq(categories.kind, kind)) : eq(categories.userId, userId))
    .orderBy(asc(categories.kind), asc(categories.isArchived), asc(categories.sortOrder), asc(categories.createdAt));
}

export type CategoryOption = Awaited<ReturnType<typeof listCategories>>[number];

export async function getCategory(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.userId, userId), eq(categories.id, id)))
    .limit(1);
  return row ?? null;
}
