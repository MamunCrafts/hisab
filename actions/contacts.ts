"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createContact, deleteContact, setContactArchived, updateContact } from "@/db/mutations/contacts";
import { authedAction } from "@/lib/safe-action";
import { contactSchema } from "@/lib/validation/contact";

const idSchema = z.string().uuid();

export async function createContactAction(input: unknown) {
  const result = await authedAction(contactSchema, input, ({ userId, input }) => createContact(userId, input));
  if (result.ok) revalidatePath("/ledger");
  return result;
}

export async function updateContactAction(id: string, input: unknown) {
  const result = await authedAction(
    z.object({ id: idSchema, data: contactSchema }),
    { id, data: input },
    ({ userId, input }) => updateContact(userId, input.id, input.data),
  );
  if (result.ok) revalidatePath("/ledger", "layout");
  return result;
}

export async function setContactArchivedAction(id: string, archived: boolean) {
  const result = await authedAction(
    z.object({ id: idSchema, archived: z.boolean() }),
    { id, archived },
    ({ userId, input }) => setContactArchived(userId, input.id, input.archived),
  );
  if (result.ok) revalidatePath("/ledger", "layout");
  return result;
}

export async function deleteContactAction(id: string) {
  const result = await authedAction(idSchema, id, ({ userId, input }) => deleteContact(userId, input));
  if (result.ok) revalidatePath("/", "layout");
  return result;
}
