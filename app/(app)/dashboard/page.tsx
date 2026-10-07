import { AlarmClock, ArrowDownLeft, ArrowUpRight, ChevronRight, PieChart, Plus, Receipt, Scale, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { after } from "next/server";
import { maybeGenerateReminders } from "@/lib/notifications/generate";
import { LazyCategoryDonut, LazySpendingTrendPanel } from "@/components/charts/lazy";
import { EmptyState } from "@/components/common/empty-state";
import { BalanceCard } from "@/components/dashboard/balance-card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { QuickAddStrip } from "@/components/dashboard/quick-add-strip";
import { DebtSummaryCards } from "@/components/ledger/debt-summary-cards";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { AddTransactionButton } from "@/components/finance/add-transaction-button";
import { Money } from "@/components/finance/money";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listAccountsWithBalances, type AccountType } from "@/db/queries/accounts";
import { getCategoryTotals, getDailySeries, getMonthlyOverview } from "@/db/queries/dashboard";
import { getUserSettings } from "@/db/queries/profile";
import { listRecentTransactions } from "@/db/queries/transactions";
import { getDebtSummary } from "@/db/queries/ledger";
import { listBudgetUsage } from "@/db/queries/budgets";
import { BudgetWidget } from "@/components/dashboard/budget-widget";
import { requireUser } from "@/lib/auth/session";
import { addDays, endOfMonth, hourInTimezone, todayInTimezone } from "@/lib/dates";
import { foldSlices } from "@/lib/finance/analytics";
import { categoryLabel } from "@/lib/finance/categories";
import { calculateCashFlow, calculateChangePercent } from "@/lib/finance/rules";
import { formatDate } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import type { TranslationKey } from "@/lib/i18n/translate";
import { addMoney, isZeroMoney } from "@/lib/money";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("nav.dashboard") };
}

const BALANCE_GROUPS: Array<{ key: TranslationKey; types: AccountType[] }> = [
  { key: "dashboard.cash", types: ["CASH"] },
  { key: "dashboard.bank", types: ["BANK", "SAVINGS"] },
  { key: "dashboard.mobileWallet", types: ["MOBILE_WALLET"] },
  { key: "dashboard.other", types: ["CARD", "OTHER"] },
];

export default async function DashboardPage() {
  const user = await requireUser();
  const { t, locale } = await getI18n();
  const settings = await getUserSettings(user.id);
  const today = todayInTimezone(settings.timezone);
  const currency = settings.currency;

  const [accounts, overview, daily, categoryTotals, recent, debts, budgets] = await Promise.all([
    listAccountsWithBalances(user.id),
    getMonthlyOverview(user.id, today),
    getDailySeries(user.id, addDays(today, -29), today),
    getCategoryTotals(user.id, `${today.slice(0, 7)}-01`, endOfMonth(today)),
    listRecentTransactions(user.id, 8),
    getDebtSummary(user.id, today),
    listBudgetUsage(user.id, `${today.slice(0, 7)}-01`, endOfMonth(today)),
  ]);

  // Keep reminders fresh between cron runs; idempotent and off the critical path.
  after(() =>
    maybeGenerateReminders(user.id, { today, locale, currency }).catch((error) =>
      console.error("[reminders] generation failed:", error instanceof Error ? error.message : "unknown"),
    ),
  );

  const active = accounts.filter((a) => !a.isArchived);
  const total = addMoney(...active.map((a) => a.balance));
  const breakdown = BALANCE_GROUPS.map((group) => ({
    key: group.key,
    value: addMoney(...active.filter((a) => group.types.includes(a.type)).map((a) => a.balance)),
    present: active.some((a) => group.types.includes(a.type)),
  }))
    .filter((g) => g.present && (g.key !== "dashboard.other" || !isZeroMoney(g.value)))
    .slice(0, 3);

  const { current, previous } = overview;
  const net = calculateCashFlow(current.income, current.expense);
  const change = calculateChangePercent(current.expense, previous.expense);

  const slices = foldSlices(
    categoryTotals.map((c) => ({ key: c.categoryId ?? "none", label: categoryLabel(c, t), total: c.total, categoryId: c.categoryId })),
    t("categories.other"),
  );

  const hour = hourInTimezone(settings.timezone);
  const greetingKey: TranslationKey = hour < 12 ? "dashboard.goodMorning" : hour < 17 ? "dashboard.goodAfternoon" : "dashboard.goodEvening";
  const firstName = settings.displayName.split(" ")[0] || user.name;

  return (
    <div className="space-y-5 md:space-y-6">
      <header className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight md:text-2xl">{t(greetingKey, { name: firstName })}</h1>
          <p className="text-sm text-muted-foreground">{formatDate(today, locale)}</p>
        </div>
        <AddTransactionButton className="hidden md:inline-flex">
          <Plus className="size-4" aria-hidden />
          {t("quickAdd.title")}
        </AddTransactionButton>
      </header>

      {active.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title={t("dashboard.noAccountsTitle")}
          description={t("dashboard.noAccountsBody")}
          action={
            <Button asChild>
              <Link href="/accounts?new=1">{t("form.addAccount")}</Link>
            </Button>
          }
        />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <BalanceCard total={total} breakdown={breakdown} currency={currency} />
        <section aria-labelledby="month-overview" className="grid grid-cols-2 gap-3 lg:grid-cols-1 lg:grid-rows-3">
          <h2 id="month-overview" className="sr-only">{t("dashboard.thisMonth")}</h2>
          <KpiCard
            label={t("dashboard.income")}
            icon={ArrowDownLeft}
            iconClass="bg-income-soft text-income"
            value={<Money value={current.income} currency={currency} />}
            footer={t("dashboard.thisMonth")}
          />
          <KpiCard
            label={t("dashboard.expense")}
            icon={ArrowUpRight}
            iconClass="bg-expense-soft text-expense"
            value={<Money value={current.expense} currency={currency} />}
            footer={
              change === null
                ? t("dashboard.thisMonth")
                : change < 0
                  ? t("dashboard.lowerThanLastMonth", { percent: Math.abs(change) })
                  : change > 0
                    ? t("dashboard.higherThanLastMonth", { percent: change })
                    : t("dashboard.sameAsLastMonth")
            }
          />
          <KpiCard
            className="col-span-2 lg:col-span-1"
            label={t("dashboard.netCashFlow")}
            icon={Scale}
            iconClass="bg-neutral-soft text-neutral-tone"
            value={<Money value={net} showSignedValue currency={currency} tone={net.startsWith("-") ? "expense" : "income"} />}
          />
        </section>
      </div>

      <section aria-label={t("ledger.title")} className="space-y-3">
        {debts.overdueCount + debts.dueTodayCount > 0 ? (
          <Link
            href="/ledger?filter=overdue"
            className="flex items-center gap-3 rounded-2xl border border-expense/25 bg-expense-soft px-4 py-3 text-sm font-medium text-expense focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <AlarmClock className="size-4 shrink-0" aria-hidden />
            <span className="flex-1">
              {debts.overdueCount + debts.dueTodayCount === 1
                ? t("dashboard.overdueOne")
                : t("dashboard.overdue", { count: debts.overdueCount + debts.dueTodayCount })}
            </span>
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        ) : null}
        <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <DebtSummaryCards summary={debts} currency={currency} />
          <div className="hidden lg:block">
            <BudgetWidget budgets={budgets} t={t} />
          </div>
        </div>
      </section>

      <QuickAddStrip className="md:hidden" />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardContent>
            <LazySpendingTrendPanel points={daily.map((d) => ({ date: d.date, value: d.expense }))} currency={currency} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-4">
            <h2 className="text-base font-semibold">{t("dashboard.byCategory")}</h2>
            {slices.length === 0 ? (
              <EmptyState compact icon={PieChart} title={t("dashboard.noSpending")} className="border-0 bg-transparent" />
            ) : (
              <LazyCategoryDonut
                slices={slices}
                total={current.expense}
                currency={currency}
                totalLabel={t("dashboard.thisMonth")}
                ariaLabel={t("dashboard.byCategory")}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="lg:hidden">
        <BudgetWidget budgets={budgets} t={t} />
      </div>

      <Card>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">{t("dashboard.recentActivity")}</h2>
            {recent.length > 0 ? (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/transactions">{t("common.viewAll")}</Link>
              </Button>
            ) : null}
          </div>
          {recent.length === 0 ? (
            <EmptyState
              compact
              icon={Receipt}
              title={t("dashboard.noActivity")}
              description={t("dashboard.noActivityBody")}
              action={<AddTransactionButton kind="EXPENSE">{t("transactions.emptyCta")}</AddTransactionButton>}
              className="border-0 bg-transparent"
            />
          ) : (
            <RecentActivity items={recent} today={today} currency={currency} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
