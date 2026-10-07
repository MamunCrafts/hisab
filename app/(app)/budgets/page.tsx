import type { Metadata } from "next";
import { BudgetsView } from "@/components/budgets/budgets-view";
import { listBudgetUsage } from "@/db/queries/budgets";
import { listCategories } from "@/db/queries/categories";
import { getUserSettings } from "@/db/queries/profile";
import { requireUser } from "@/lib/auth/session";
import { endOfMonth, startOfMonth, todayInTimezone } from "@/lib/dates";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("budgets.title") };
}

export default async function BudgetsPage() {
  const user = await requireUser();
  const settings = await getUserSettings(user.id);
  const today = todayInTimezone(settings.timezone);
  const [budgets, categories] = await Promise.all([
    listBudgetUsage(user.id, startOfMonth(today), endOfMonth(today)),
    listCategories(user.id, "EXPENSE"),
  ]);
  return <BudgetsView budgets={budgets} categories={categories} currency={settings.currency} monthStart={startOfMonth(today)} />;
}
