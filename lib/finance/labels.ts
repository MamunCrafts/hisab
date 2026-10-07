import type { TransactionListItem } from "@/db/queries/transactions";
import type { Translator } from "@/lib/i18n/translate";
import { categoryLabel } from "./categories";
import { isLedgerType } from "./rules";

export type DisplayTransaction = Pick<
  TransactionListItem,
  "type" | "amount" | "affectsAccount" | "title" | "category" | "contact" | "account" | "destinationAccount"
>;

/** Main line: description, else category, else person, else type. */
export function transactionPrimaryLabel(tx: DisplayTransaction, t: Translator): string {
  if (isLedgerType(tx.type) && tx.contact) return tx.contact.name;
  if (tx.title) return tx.title;
  if (tx.type === "EXPENSE" || tx.type === "INCOME") return categoryLabel(tx.category, t);
  if (tx.type === "TRANSFER") return t("transactionTypes.TRANSFER");
  return t(`transactionTypes.${tx.type}`);
}

/** Secondary line: the semantic label (e.g. ধার দিলাম) or account route. */
export function transactionSecondaryLabel(tx: DisplayTransaction, t: Translator): string {
  if (isLedgerType(tx.type)) return t(`transactionTypes.${tx.type}`);
  if (tx.type === "TRANSFER") return `${tx.account?.name ?? ""} → ${tx.destinationAccount?.name ?? ""}`;
  if (tx.title && (tx.type === "EXPENSE" || tx.type === "INCOME")) return categoryLabel(tx.category, t);
  return tx.account?.name ?? "";
}

