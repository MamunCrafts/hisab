import "server-only";
import { and, eq } from "drizzle-orm";
import { db, type DbTransaction } from "@/db/client";
import { accounts, attachments, categories, contacts, profiles, transactions } from "@/db/schema";
import { UserFacingError } from "@/lib/action-result";
import { deleteAttachmentFile, storeAttachment, type ValidatedFile } from "@/lib/storage";
import type { TransactionInput } from "@/lib/validation/transaction";
import { audit } from "./audit";

type AttachmentChange = { kind: "keep" } | { kind: "remove" } | { kind: "replace"; file: ValidatedFile };

/** Columns for a validated input. Every id is checked for ownership before use. */
function columnsFor(input: TransactionInput) {
  return {
    type: input.type,
    amount: input.amount,
    accountId: "accountId" in input ? input.accountId : null,
    destinationAccountId: input.type === "TRANSFER" ? input.destinationAccountId : null,
    categoryId: input.type === "EXPENSE" || input.type === "INCOME" ? input.categoryId : null,
    contactId: "contactId" in input ? input.contactId : null,
    transactionDate: input.transactionDate,
    dueDate: "dueDate" in input ? input.dueDate : null,
    title: input.title,
    note: input.note,
    tags: input.tags,
    affectsAccount: "affectsAccount" in input ? input.affectsAccount : true,
  };
}

type Columns = ReturnType<typeof columnsFor>;

/**
 * Verifies every referenced account/category/contact belongs to the user.
 * Archived references are only allowed when they are unchanged from `previous`
 * (editing history), never for new entries.
 */
async function assertReferences(
  tx: DbTransaction,
  userId: string,
  cols: Columns,
  previous?: Pick<Columns, "accountId" | "destinationAccountId" | "categoryId">,
) {
  const accountIds = [cols.accountId, cols.destinationAccountId].filter((id): id is string => Boolean(id));
  for (const id of accountIds) {
    const [row] = await tx
      .select({ isArchived: accounts.isArchived })
      .from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.id, id)))
      .limit(1);
    const field = id === cols.accountId ? "accountId" : "destinationAccountId";
    if (!row) throw new UserFacingError("validation.selectAccount", field);
    const unchanged = previous && (previous.accountId === id || previous.destinationAccountId === id);
    if (row.isArchived && !unchanged) throw new UserFacingError("validation.selectAccount", field);
  }
  if (cols.categoryId) {
    const [row] = await tx
      .select({ kind: categories.kind, isArchived: categories.isArchived })
      .from(categories)
      .where(and(eq(categories.userId, userId), eq(categories.id, cols.categoryId)))
      .limit(1);
    const unchanged = previous?.categoryId === cols.categoryId;
    if (!row || row.kind !== cols.type || (row.isArchived && !unchanged)) {
      throw new UserFacingError("validation.selectCategory", "categoryId");
    }
  }
  if (cols.contactId) {
    const [row] = await tx
      .select({ id: contacts.id })
      .from(contacts)
      .where(and(eq(contacts.userId, userId), eq(contacts.id, cols.contactId)))
      .limit(1);
    if (!row) throw new UserFacingError("validation.selectContact", "contactId");
  }
}

async function rememberAccount(tx: DbTransaction, userId: string, accountId: string | null) {
  if (!accountId) return;
  await tx.update(profiles).set({ lastUsedAccountId: accountId }).where(eq(profiles.userId, userId));
}

/** Inserts a validated transaction inside an open DB transaction (no attachment). */
export async function insertTransactionInTx(
  tx: DbTransaction,
  userId: string,
  input: TransactionInput,
  extra?: { recurringRuleId?: string },
) {
  const cols = columnsFor(input);
  await assertReferences(tx, userId, cols);
  const [created] = await tx
    .insert(transactions)
    .values({ ...cols, userId, recurringRuleId: extra?.recurringRuleId ?? null })
    .returning({ id: transactions.id });
  await rememberAccount(tx, userId, cols.accountId);
  return created;
}

export async function createTransaction(
  userId: string,
  input: TransactionInput,
  file?: ValidatedFile | null,
  extra?: { recurringRuleId?: string },
) {
  const storageKey = file ? await storeAttachment(userId, file) : null;
  try {
    return await db.transaction(async (tx) => {
      const created = await insertTransactionInTx(tx, userId, input, extra);
      if (file && storageKey) {
        await tx.insert(attachments).values({
          userId,
          transactionId: created.id,
          storageKey,
          contentType: file.contentType,
          size: file.size,
          originalName: file.name,
        });
      }
      return created;
    });
  } catch (error) {
    if (storageKey) await deleteAttachmentFile(storageKey);
    throw error;
  }
}

export async function updateTransaction(
  userId: string,
  id: string,
  input: TransactionInput,
  attachmentChange: AttachmentChange = { kind: "keep" },
) {
  const cols = columnsFor(input);
  const newKey = attachmentChange.kind === "replace" ? await storeAttachment(userId, attachmentChange.file) : null;
  let oldKey: string | null = null;
  try {
    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(transactions)
        .where(and(eq(transactions.userId, userId), eq(transactions.id, id)))
        .for("update");
      if (!existing) throw new UserFacingError("errors.notFound");

      await assertReferences(tx, userId, cols, existing);

      await tx
        .update(transactions)
        .set(cols)
        .where(and(eq(transactions.userId, userId), eq(transactions.id, id)));

      if (attachmentChange.kind !== "keep") {
        const [current] = await tx
          .select({ id: attachments.id, storageKey: attachments.storageKey })
          .from(attachments)
          .where(and(eq(attachments.userId, userId), eq(attachments.transactionId, id)));
        if (current) {
          oldKey = current.storageKey;
          await tx.delete(attachments).where(and(eq(attachments.userId, userId), eq(attachments.id, current.id)));
        }
        if (attachmentChange.kind === "replace" && newKey) {
          await tx.insert(attachments).values({
            userId,
            transactionId: id,
            storageKey: newKey,
            contentType: attachmentChange.file.contentType,
            size: attachmentChange.file.size,
            originalName: attachmentChange.file.name,
          });
        }
      }
    });
  } catch (error) {
    if (newKey) await deleteAttachmentFile(newKey);
    throw error;
  }
  // Remove the old file only once the database change is committed.
  if (oldKey) await deleteAttachmentFile(oldKey);
}

export async function deleteTransaction(userId: string, id: string) {
  const keys = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: transactions.id, type: transactions.type, contactId: transactions.contactId })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.id, id)))
      .for("update");
    if (!existing) throw new UserFacingError("errors.notFound");
    const files = await tx
      .select({ storageKey: attachments.storageKey })
      .from(attachments)
      .where(and(eq(attachments.userId, userId), eq(attachments.transactionId, id)));
    // Attachments cascade with the transaction row.
    await tx.delete(transactions).where(and(eq(transactions.userId, userId), eq(transactions.id, id)));
    await audit(tx, {
      userId,
      action: "transaction.delete",
      entityType: "transaction",
      entityId: id,
      metadata: { type: existing.type, contactId: existing.contactId },
    });
    return files.map((f) => f.storageKey);
  });
  await Promise.all(keys.map(deleteAttachmentFile));
}

export async function removeTransactionAttachment(userId: string, transactionId: string) {
  const [current] = await db
    .delete(attachments)
    .where(and(eq(attachments.userId, userId), eq(attachments.transactionId, transactionId)))
    .returning({ storageKey: attachments.storageKey });
  if (!current) throw new UserFacingError("errors.notFound");
  await deleteAttachmentFile(current.storageKey);
}
