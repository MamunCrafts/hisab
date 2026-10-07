import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TransactionDetail } from "@/components/finance/transaction-detail";
import { loadEntryOptions } from "@/db/queries/entry-options";
import { getUserSettings } from "@/db/queries/profile";
import { getTransaction } from "@/db/queries/transactions";
import { requireUser } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("transactions.detailTitle") };
}

export default async function TransactionPage({ params }: PageProps<"/transactions/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  // Ownership enforced in the query: another user's id simply isn't found.
  const [tx, options, settings] = await Promise.all([
    getTransaction(user.id, id),
    loadEntryOptions(user.id),
    getUserSettings(user.id),
  ]);
  if (!tx) notFound();
  return (
    <Suspense>
      <TransactionDetail tx={tx} options={options} timezone={settings.timezone} />
    </Suspense>
  );
}
