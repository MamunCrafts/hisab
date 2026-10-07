import type { Metadata } from "next";
import { LedgerHome } from "@/components/ledger/ledger-home";
import { LEDGER_FILTERS, type LedgerFilter } from "@/lib/finance/ledger-filters";
import { listContactBalances, summarizeDebts } from "@/db/queries/ledger";
import { getUserSettings } from "@/db/queries/profile";
import { requireUser } from "@/lib/auth/session";
import { todayInTimezone } from "@/lib/dates";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("ledger.title") };
}

export default async function LedgerPage({ searchParams }: PageProps<"/ledger">) {
  const user = await requireUser();
  const settings = await getUserSettings(user.id);
  const today = todayInTimezone(settings.timezone);
  const contacts = await listContactBalances(user.id, today);
  const params = await searchParams;
  const filter = (LEDGER_FILTERS as readonly string[]).includes(String(params.filter)) ? (params.filter as LedgerFilter) : "all";
  return (
    <LedgerHome
      key={filter}
      contacts={contacts}
      summary={summarizeDebts(contacts.filter((c) => !c.isArchived || c.balance !== "0.00"))}
      currency={settings.currency}
      today={today}
      initialFilter={filter}
    />
  );
}
