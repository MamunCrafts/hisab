"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { usePrivacy } from "@/components/providers/privacy-provider";
import { formatCompactCurrency, formatCurrency, formatMonthYear } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";
import { moneyToChartNumber } from "@/lib/money";

export type MonthBar = { month: string; income: string; expense: string };

/** Grouped monthly bars with a legend (two series, so identity is labelled). */
export function IncomeExpenseBars({ data, currency }: { data: MonthBar[]; currency: string }) {
  const { t, locale } = useI18n();
  const { hidden } = usePrivacy();
  const rows = data.map((d) => ({ ...d, i: moneyToChartNumber(d.income), e: moneyToChartNumber(d.expense) }));
  const money = (v: string) => (hidden ? "৳ ••••" : formatCurrency(v, { currency }));
  return (
    <div className="space-y-3">
      <ul className="flex gap-4 text-xs text-muted-foreground" aria-hidden>
        <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-income" />{t("analytics.totalIncome")}</li>
        <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-expense" />{t("analytics.totalExpense")}</li>
      </ul>
      <div role="img" aria-label={t("analytics.incomeVsExpense")} className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 4, right: 16, bottom: 0, left: 0 }} barGap={2} barCategoryGap="24%">
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(m: string) => formatMonthYear(m, locale)} minTickGap={8} />
            <YAxis width={52} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v: number) => (hidden ? "•••" : formatCompactCurrency(v, currency))} />
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.6 }}
              content={({ active, payload }) => {
                const item = payload?.[0]?.payload as MonthBar | undefined;
                if (!active || !item) return null;
                return (
                  <div className="space-y-0.5 rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                    <p className="text-muted-foreground">{formatMonthYear(item.month, locale)}</p>
                    <p className="tabular">{t("analytics.totalIncome")}: <span className="font-semibold">{money(item.income)}</span></p>
                    <p className="tabular">{t("analytics.totalExpense")}: <span className="font-semibold">{money(item.expense)}</span></p>
                  </div>
                );
              }}
            />
            <Bar dataKey="i" fill="var(--income)" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="e" fill="var(--expense)" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
