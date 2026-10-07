"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createTransaction, deleteTransaction, removeTransactionAttachment, updateTransaction } from "@/db/mutations/transactions";
import { loadEntryOptions, type EntryOptions } from "@/db/queries/entry-options";
import { failure, success, UserFacingError, zodFailure, type ActionResult } from "@/lib/action-result";
import { requireUserId } from "@/lib/auth/session";
import { handleActionError } from "@/lib/safe-action";
import { validateAttachment, type ValidatedFile } from "@/lib/storage";
import { formDataToObject, schemaForType } from "@/lib/validation/transaction";

function revalidateFinance() {
  revalidatePath("/", "layout");
}

async function readReceipt(formData: FormData): Promise<ValidatedFile | null> {
  const file = formData.get("receipt");
  if (!(file instanceof File) || file.size === 0) return null;
  const result = await validateAttachment(file);
  if (!result.ok) {
    throw new UserFacingError(result.error === "size" ? "validation.fileSize" : "validation.fileType", "receipt");
  }
  return result.file;
}

function parseInput(formData: FormData) {
  const raw = formDataToObject(formData);
  const schema = schemaForType(raw.type);
  if (!schema) return { ok: false as const, error: failure("errors.validation") };
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: zodFailure(parsed.error) };
  return { ok: true as const, input: parsed.data };
}

export type { EntryOptions };

export type SavedTransaction = { id: string; type: string; amount: string };

export async function createTransactionAction(formData: FormData): Promise<ActionResult<SavedTransaction>> {
  try {
    const userId = await requireUserId();
    const parsed = parseInput(formData);
    if (!parsed.ok) return parsed.error;
    const receipt = await readReceipt(formData);
    const created = await createTransaction(userId, parsed.input, receipt);
    revalidateFinance();
    return success({ id: created.id, type: parsed.input.type, amount: parsed.input.amount });
  } catch (error) {
    return handleActionError(error);
  }
}

export async function updateTransactionAction(id: string, formData: FormData): Promise<ActionResult<SavedTransaction>> {
  try {
    const userId = await requireUserId();
    const txId = z.string().uuid().parse(id);
    const parsed = parseInput(formData);
    if (!parsed.ok) return parsed.error;
    const receipt = await readReceipt(formData);
    const removeReceipt = formData.get("removeReceipt") === "1";
    await updateTransaction(
      userId,
      txId,
      parsed.input,
      receipt ? { kind: "replace", file: receipt } : removeReceipt ? { kind: "remove" } : { kind: "keep" },
    );
    revalidateFinance();
    return success({ id: txId, type: parsed.input.type, amount: parsed.input.amount });
  } catch (error) {
    return handleActionError(error);
  }
}

export async function deleteTransactionAction(id: string): Promise<ActionResult<null>> {
  try {
    const userId = await requireUserId();
    await deleteTransaction(userId, z.string().uuid().parse(id));
    revalidateFinance();
    return success(null);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function removeAttachmentAction(transactionId: string): Promise<ActionResult<null>> {
  try {
    const userId = await requireUserId();
    await removeTransactionAttachment(userId, z.string().uuid().parse(transactionId));
    revalidateFinance();
    return success(null);
  } catch (error) {
    return handleActionError(error);
  }
}

/** Lists needed by the entry forms. Loaded when the quick-add sheet opens. */
export async function getEntryOptionsAction(): Promise<ActionResult<EntryOptions>> {
  try {
    const userId = await requireUserId();
    return success(await loadEntryOptions(userId));
  } catch (error) {
    return handleActionError(error);
  }
}
