import { ArrowDownLeft, ArrowUpRight, CalendarDays, ChartPie, Flame, HandCoins, Lightbulb, Scale, Wallet } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { PeriodSelector } from "@/components/analytics/period-selector";
import { LazyCategoryDonut, LazyIncomeExpenseBars, LazySpendingTrendChart } from "@/components/charts/lazy";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { FinanceIcon } from "@/components/finance/finance-icon";
import { Money } from "@/components/finance/money";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { listAccountOptions } from "@/db/queries/accounts";
import { getCategoryTotals, getDailySeries, getIncomeExpense, getMonthlySeries } from "@/db/queries/dashboard";
import { getDebtSummary } from "@/db/queries/ledger";
import { getUserSettings } from "@/db/queries/profile";
import { requireUser } from "@/lib/auth/session";
import { addMonths, daysInMonth, endOfMonth, startOfMonth, todayInTimezone } from "@/lib/dates";
import { foldSlices } from "@/lib/finance/analytics";
import { categoryLabel } from "@/lib/finance/categories";
import { resolvePeriod } from "@/lib/finance/periods";
import { calculateCashFlow, calculateChangePercent } from "@/lib/finance/rules";
import { formatCurrency, formatDate, formatMonthYear, formatShortDate, monthName } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { compareMoney, divideMoney, isZeroMoney, multiplyMoney, percentOf, roundToWhole } from "@/lib/money";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("analytics.title") };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Minimum elapsed days before projecting a month's spending (avoid noisy estimates). */
const PROJECTION_MIN_DAYS = 7;

export default async function AnalyticsPage({ searchParams }: PageProps<"/analytics">) {
  const user = await requireUser();
  const { t, locale } = await getI18n();
  const settings = await getUserSettings(user.id);
  const currency = settings.currency;
  const today = todayInTimezone(settings.timezone);
  const sp = await searchParams;
  const one = (v: unknown) => (typeof v === "string" ? v : undefined);
  const range = resolvePeriod(one(sp.period), today, { from: one(sp.from), to: one(sp.to) });
  const accountId = one(sp.accountId) && UUID.test(one(sp.accountId)!) ? one(sp.accountId)! : null;

  const thisMonth = startOfMonth(today);
  const lastMonth = addMonths(thisMonth, -1);
  const [accounts, totals, daily, monthly, categories, debts, monthNow, monthPrev] = await Promise.all([
    listAccountOptions(user.id),
    getIncomeExpense(user.id, range.from, range.to, accountId),
    getDailySeries(user.id, range.from, range.to < today ? range.to : today, accountId),
    range.granularity === "month" ? getMonthlySeries(user.id, range.from, range.to, accountId) : Promise.resolve([]),
    getCategoryTotals(user.id, range.from, range.to, "EXPENSE", { accountId }),
    getDebtSummary(user.id, today),
    getIncomeExpense(user.id, thisMonth, endOfMonth(today), accountId),
    getIncomeExpense(user.id, lastMonth, endOfMonth(lastMonth), accountId),
  ]);

  const net = calculateCashFlow(totals.income, totals.expense);
  const avgDaily = range.elapsedDays > 0 ? roundToWhole(divideMoney(totals.expense, range.elapsedDays)) : "0.00";
  const highest = daily.reduce<{ date: string; expense: string } | null>(
    (best, d) => (compareMoney(d.expense, "0") > 0 && (!best || compareMoney(d.expense, best.expense) > 0) ? d : best),
    null,
  );
  const ranking = categories.map((c) => ({
    ...c,
    label: categoryLabel(c, t),
    percent: percentOf(c.total, totals.expense) ?? 0,
  }));
  const slices = foldSlices(
    ranking.map((c) => ({ key: c.categoryId ?? "none", label: c.label, total: c.total, categoryId: c.categoryId })),
    t("categories.other"),
  );

  // §51: compare calendar months only when last month has data.
  const change = calculateChangePercent(monthNow.expense, monthPrev.expense);
  const prevMonthName = monthName(lastMonth, locale);
  // §52: projection only for the current month with enough elapsed days.
  const elapsedThisMonth = Number(today.slice(8, 10));
  const projection =
    elapsedThisMonth >= PROJECTION_MIN_DAYS && !isZeroMoney(monthNow.expense)
      ? roundToWhole(multiplyMoney(divideMoney(monthNow.expense, elapsedThisMonth), daysInMonth(today)))
      : null;

  const trendPoints =
    range.granularity === "month"
      ? monthly.map((m) => ({ date: m.month, value: m.expense }))
      : daily.map((d) => ({ date: d.date, value: d.expense }));
  const hasData = totals.count > 0;

  return (
    <div className="space-y-5">
      <PageHeader title={t("analytics.title")} description={t("analytics.description")} className="mb-0 md:mb-0" />
      <Suspense>
        <PeriodSelector period={range.period} from={range.from} to={range.to} accountId={accountId} accounts={accounts} />
      </Suspense>
      <p className="text-sm text-muted-foreground">
        {formatDate(range.from, locale)} – {formatDate(range.to, locale)} · {t("analytics.transactionsCount", { count: totals.count })}
      </p>

      <section aria-label={t("analytics.insights")} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label={t("analytics.totalIncome")} icon={ArrowDownLeft} iconClass="bg-income-soft text-income" value={<Money value={totals.income} currency={currency} />} />
        <KpiCard label={t("analytics.totalExpense")} icon={ArrowUpRight} iconClass="bg-expense-soft text-expense" value={<Money value={totals.expense} currency={currency} />} />
        <KpiCard
          label={t("analytics.netCashFlow")}
          icon={Scale}
          iconClass="bg-neutral-soft text-neutral-tone"
          value={<Money value={net} showSignedValue currency={currency} tone={net.startsWith("-") ? "expense" : "income"} />}
        />
        <KpiCard label={t("analytics.avgDaily")} icon={CalendarDays} iconClass="bg-muted text-foreground" value={<Money value={avgDaily} currency={currency} />} />
        <KpiCard
          label={t("analytics.highestDay")}
          icon={Flame}
          iconClass="bg-warning-soft text-warning"
          value={highest ? <Money value={highest.expense} currency={currency} /> : <span className="text-base text-muted-foreground">{t("analytics.noHighest")}</span>}
          footer={highest ? formatDate(highest.date, locale) : null}
        />
        <KpiCard label={t("analytics.receivable")} icon={HandCoins} iconClass="bg-receivable-soft text-receivable" value={<Money value={debts.receivable.total} tone="receivable" currency={currency} />} />
        <KpiCard label={t("analytics.payable")} icon={Wallet} iconClass="bg-payable-soft text-payable" value={<Money value={debts.payable.total} tone="payable" currency={currency} />} />
      </section>

      <Card>
        <CardContent className="space-y-2">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Lightbulb className="size-4 text-warning" aria-hidden />
            {t("analytics.insights")}
          </h2>
          <ul className="space-y-1.5 text-sm">
            {change !== null ? (
              <li>
                {change < 0
                  ? t("analytics.compareLess", { percent: Math.abs(change), month: prevMonthName })
                  : change > 0
                    ? t("analytics.compareMore", { percent: change, month: prevMonthName })
                    : t("analytics.compareSame", { month: prevMonthName })}
              </li>
            ) : null}
            <li>{t("analytics.avgDailyInsight", { amount: formatCurrency(avgDaily, { currency }) })}</li>
            {projection ? (
              <li className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{t("analytics.estimate")}</Badge>
                {t("analytics.projection", { amount: formatCurrency(projection, { currency }) })}
              </li>
            ) : null}
            <li className="text-xs text-muted-foreground">{t("analytics.excludedNote")}</li>
          </ul>
        </CardContent>
      </Card>

      {!hasData ? (
        <EmptyState icon={ChartPie} title={t("analytics.emptyTitle")} description={t("analytics.emptyBody")} />
      ) : (
        <>
          <Card>
            <CardContent className="space-y-3">
              <h2 className="text-base font-semibold">{t("analytics.expenseTrend")}</h2>
              <LazySpendingTrendChart points={trendPoints} currency={currency} granularity={range.granularity} ariaLabel={t("analytics.expenseTrend")} height={240} />
              <details className="text-sm">
                <summary className="cursor-pointer text-xs font-medium text-primary">{t("analytics.tableView")}</summary>
                <div className="mt-2 max-h-64 overflow-y-auto">
                  <table className="w-full text-xs">
                    <tbody className="divide-y">
                      {trendPoints.filter((p) => !isZeroMoney(p.value)).map((p) => (
                        <tr key={p.date}>
                          <td className="py-1.5">{range.granularity === "month" ? formatMonthYear(p.date, locale) : formatShortDate(p.date, locale)}</td>
                          <td className="tabular py-1.5 text-right"><Money value={p.value} currency={currency} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </CardContent>
          </Card>

          {range.granularity === "month" ? (
            <Card>
              <CardContent className="space-y-3">
                <h2 className="text-base font-semibold">{t("analytics.incomeVsExpense")}</h2>
                <LazyIncomeExpenseBars data={monthly} currency={currency} />
              </CardContent>
            </Card>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardContent className="space-y-4">
                <h2 className="text-base font-semibold">{t("analytics.categoryBreakdown")}</h2>
                {slices.length > 0 ? (
                  <LazyCategoryDonut slices={slices} total={totals.expense} currency={currency} totalLabel={t("analytics.totalExpense")} ariaLabel={t("analytics.categoryBreakdown")} />
                ) : (
                  <p className="text-sm text-muted-foreground">{t("dashboard.noSpending")}</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-3">
                <h2 className="text-base font-semibold">{t("analytics.categoryRanking")}</h2>
                <ol className="space-y-3">
                  {ranking.map((c, index) => (
                    <li key={c.categoryId ?? index} className="space-y-1.5">
                      <div className="flex items-center gap-3">
                        <FinanceIcon name={c.icon} color={c.color} size="sm" />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{c.label}</span>
                        <span className="tabular text-xs text-muted-foreground">{c.percent}%</span>
                        <Money value={c.total} currency={currency} className="w-24 text-right text-sm font-semibold" />
                      </div>
                      <Progress value={c.percent} className="h-1.5" aria-label={`${c.label} ${c.percent}%`} />
                    </li>
                  ))}
                </ol>
                {ranking.length === 0 ? <p className="text-sm text-muted-foreground">{t("dashboard.noSpending")}</p> : null}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
