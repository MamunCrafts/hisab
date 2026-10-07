"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adjustAccountBalance, createAccount, deleteAccount, setAccountArchived, updateAccount } from "@/db/mutations/accounts";
import { authedAction } from "@/lib/safe-action";
import { accountSchema, adjustBalanceSchema } from "@/lib/validation/account";

const idSchema = z.string().uuid();

function done() {
  revalidatePath("/", "layout");
}

export async function createAccountAction(input: unknown) {
  const result = await authedAction(accountSchema, input, ({ userId, input }) => createAccount(userId, input));
  if (result.ok) done();
  return result;
}

export async function updateAccountAction(id: string, input: unknown) {
  const result = await authedAction(z.object({ id: idSchema, data: accountSchema }), { id, data: input }, ({ userId, input }) =>
    updateAccount(userId, input.id, input.data),
  );
  if (result.ok) done();
  return result;
}

export async function setAccountArchivedAction(id: string, archived: boolean) {
  const result = await authedAction(z.object({ id: idSchema, archived: z.boolean() }), { id, archived }, ({ userId, input }) =>
    setAccountArchived(userId, input.id, input.archived),
  );
  if (result.ok) done();
  return result;
}

export async function deleteAccountAction(id: string) {
  const result = await authedAction(idSchema, id, ({ userId, input }) => deleteAccount(userId, input));
  if (result.ok) done();
  return result;
}

export async function adjustBalanceAction(input: unknown) {
  const result = await authedAction(adjustBalanceSchema, input, ({ userId, input }) =>
    adjustAccountBalance(userId, input.accountId, input.actualBalance, input.transactionDate),
  );
  if (result.ok) done();
  return result;
}
