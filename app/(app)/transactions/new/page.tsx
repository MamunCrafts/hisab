import type { Metadata } from "next";
import { NewTransaction } from "@/components/finance/new-transaction";
import type { FormKind } from "@/components/finance/transaction-form";
import { loadEntryOptions } from "@/db/queries/entry-options";
import { requireUser } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";

const KINDS: FormKind[] = ["EXPENSE", "INCOME", "TRANSFER", "LEND", "BORROW", "DEBT_RECEIVED", "DEBT_PAID"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("transactions.newTitle") };
}

export default async function NewTransactionPage({ searchParams }: PageProps<"/transactions/new">) {
  const user = await requireUser();
  const params = await searchParams;
  const type = typeof params.type === "string" ? params.type.toUpperCase() : "EXPENSE";
  const kind = (KINDS as string[]).includes(type) ? (type as FormKind) : "EXPENSE";
  const contactId = typeof params.contactId === "string" && UUID.test(params.contactId) ? params.contactId : undefined;
  const options = await loadEntryOptions(user.id);
  return <NewTransaction options={options} kind={kind} contactId={contactId} />;
}
