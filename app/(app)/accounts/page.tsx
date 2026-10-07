import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountsView } from "@/components/accounts/accounts-view";
import { listAccountsWithBalances } from "@/db/queries/accounts";
import { getUserSettings } from "@/db/queries/profile";
import { requireUser } from "@/lib/auth/session";
import { todayInTimezone } from "@/lib/dates";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("accounts.title") };
}

export default async function AccountsPage() {
  const user = await requireUser();
  const [accounts, settings] = await Promise.all([listAccountsWithBalances(user.id), getUserSettings(user.id)]);
  return (
    <Suspense>
      <AccountsView accounts={accounts} currency={settings.currency} today={todayInTimezone(settings.timezone)} />
    </Suspense>
  );
}
