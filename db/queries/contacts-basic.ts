import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { contacts } from "@/db/schema";

export async function listContactOptions(userId: string) {
  return db
    .select({ id: contacts.id, name: contacts.name, avatarInitial: contacts.avatarInitial, phone: contacts.phone })
    .from(contacts)
    .where(and(eq(contacts.userId, userId), eq(contacts.isArchived, false)))
    .orderBy(asc(contacts.name));
}

export type ContactOption = Awaited<ReturnType<typeof listContactOptions>>[number];
