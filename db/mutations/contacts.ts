import "server-only";
import { and, count, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { attachments, contacts, transactions } from "@/db/schema";
import { UserFacingError } from "@/lib/action-result";
import { initialsOf } from "@/lib/format";
import { deleteAttachmentFile } from "@/lib/storage";
import type { z } from "zod";
import type { contactSchema } from "@/lib/validation/contact";
import { audit } from "./audit";

type ContactValues = z.output<typeof contactSchema>;

export async function createContact(userId: string, input: ContactValues) {
  const [created] = await db
    .insert(contacts)
    .values({ ...input, userId, avatarInitial: initialsOf(input.name) })
    .returning({ id: contacts.id, name: contacts.name, avatarInitial: contacts.avatarInitial, phone: contacts.phone });
  return created;
}

export async function updateContact(userId: string, id: string, input: ContactValues) {
  const [updated] = await db
    .update(contacts)
    .set({ ...input, avatarInitial: initialsOf(input.name) })
    .where(and(eq(contacts.userId, userId), eq(contacts.id, id)))
    .returning({ id: contacts.id });
  if (!updated) throw new UserFacingError("errors.notFound");
}

export async function setContactArchived(userId: string, id: string, archived: boolean) {
  const [updated] = await db
    .update(contacts)
    .set({ isArchived: archived })
    .where(and(eq(contacts.userId, userId), eq(contacts.id, id)))
    .returning({ id: contacts.id });
  if (!updated) throw new UserFacingError("errors.notFound");
}

/** Deletes a person and their whole ledger history (requires explicit confirmation in the UI). */
export async function deleteContact(userId: string, id: string) {
  const keys = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: contacts.id })
      .from(contacts)
      .where(and(eq(contacts.userId, userId), eq(contacts.id, id)))
      .for("update");
    if (!existing) throw new UserFacingError("errors.notFound");
    const files = await tx
      .select({ storageKey: attachments.storageKey })
      .from(attachments)
      .innerJoin(transactions, eq(transactions.id, attachments.transactionId))
      .where(and(eq(attachments.userId, userId), eq(transactions.contactId, id)));
    const [{ value: entryCount }] = await tx
      .select({ value: count() })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.contactId, id)));
    await tx.delete(transactions).where(and(eq(transactions.userId, userId), eq(transactions.contactId, id)));
    await tx.delete(contacts).where(and(eq(contacts.userId, userId), eq(contacts.id, id)));
    await audit(tx, { userId, action: "contact.delete", entityType: "contact", entityId: id, metadata: { entryCount } });
    return files.map((f) => f.storageKey);
  });
  await Promise.all(keys.map(deleteAttachmentFile));
}
