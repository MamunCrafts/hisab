import type { Metadata } from "next";
import { RecurringView } from "@/components/recurring/recurring-view";
import { loadEntryOptions } from "@/db/queries/entry-options";
import { listRules, listUpcoming } from "@/db/queries/recurring";
import { requireUser } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("recurring.title") };
}

export default async function RecurringPage() {
  const user = await requireUser();
  const options = await loadEntryOptions(user.id);
  const [rules, upcoming] = await Promise.all([listRules(user.id), listUpcoming(user.id, options.today)]);
  return (
    <RecurringView
      rules={rules}
      upcoming={upcoming}
      accounts={options.accounts}
      categories={options.categories}
      currency={options.currency}
      today={options.today}
    />
  );
}
