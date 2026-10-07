import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StatementView } from "@/components/ledger/statement-view";
import { getContact, getContactStatement } from "@/db/queries/ledger";
import { getUserSettings } from "@/db/queries/profile";
import { requireUser } from "@/lib/auth/session";
import { endOfMonth, isDateString, startOfMonth, todayInTimezone } from "@/lib/dates";
import { getI18n } from "@/lib/i18n/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("ledger.statement") };
}

export default async function StatementPage({ params, searchParams }: PageProps<"/ledger/[contactId]/statement">) {
  const user = await requireUser();
  const { contactId } = await params;
  if (!UUID.test(contactId)) notFound();
  const contact = await getContact(user.id, contactId);
  if (!contact) notFound();
  const settings = await getUserSettings(user.id);
  const today = todayInTimezone(settings.timezone);
  const sp = await searchParams;
  const period = sp.period === "month" || sp.period === "custom" ? sp.period : "all";
  const pick = (v: unknown) => (typeof v === "string" && isDateString(v) ? v : null);
  const range =
    period === "month"
      ? { from: startOfMonth(today), to: endOfMonth(today) }
      : period === "custom"
        ? { from: pick(sp.from), to: pick(sp.to) }
        : { from: null, to: null };
  const statement = await getContactStatement(user.id, contactId, range);
  return (
    <StatementView
      contact={{ id: contact.id, name: contact.name, phone: contact.phone }}
      period={period}
      from={range.from}
      to={range.to}
      today={today}
      openingBalance={statement.openingBalance}
      closingBalance={statement.closingBalance}
      entries={statement.entries}
      currency={settings.currency}
    />
  );
}
