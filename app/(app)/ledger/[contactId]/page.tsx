import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContactLedgerView } from "@/components/ledger/contact-ledger-view";
import { getContact, getContactStatement } from "@/db/queries/ledger";
import { getUserSettings } from "@/db/queries/profile";
import { requireUser } from "@/lib/auth/session";
import { todayInTimezone } from "@/lib/dates";
import { calculateDueStatus } from "@/lib/finance/due";
import { getI18n } from "@/lib/i18n/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("ledger.title") };
}

export default async function ContactLedgerPage({ params }: PageProps<"/ledger/[contactId]">) {
  const user = await requireUser();
  const { contactId } = await params;
  if (!UUID.test(contactId)) notFound();
  const contact = await getContact(user.id, contactId);
  if (!contact) notFound();
  const [statement, settings] = await Promise.all([getContactStatement(user.id, contactId), getUserSettings(user.id)]);
  const due = calculateDueStatus(statement.entries, todayInTimezone(settings.timezone));
  return (
    <ContactLedgerView
      contact={{
        id: contact.id,
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        note: contact.note,
        avatarInitial: contact.avatarInitial,
        isArchived: contact.isArchived,
      }}
      entries={statement.entries}
      balance={statement.closingBalance}
      dueStatus={due.status}
      nearestDue={due.nearestDue}
      currency={settings.currency}
    />
  );
}
