"use client";

import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCompactCurrency, formatCurrency, formatMonthYear, formatShortDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";
import { moneyToChartNumber } from "@/lib/money";
import { cn } from "@/lib/utils";
import { usePrivacy } from "@/components/providers/privacy-provider";

export type TrendPoint = { date: string; value: string };

/** Single-series area chart (no legend: the card title names the series). */
export function SpendingTrendChart({
  points,
  currency,
  color = "var(--chart-3)",
  height = 220,
  ariaLabel,
  granularity = "day",
}: {
  points: TrendPoint[];
  currency: string;
  color?: string;
  height?: number;
  ariaLabel: string;
  granularity?: "day" | "month";
}) {
  const { locale } = useI18n();
  const { hidden } = usePrivacy();
  const data = points.map((p) => ({ ...p, n: moneyToChartNumber(p.value) }));
  const tickEvery = Math.max(1, Math.ceil(data.length / 6));
  const label = (d: string) => (granularity === "month" ? formatMonthYear(d, locale) : formatShortDate(d, locale));

  return (
    <div role="img" aria-label={ariaLabel} style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 20, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            interval={tickEvery - 1}
            padding={{ left: 4, right: 4 }}
            tickFormatter={label}
            minTickGap={8}
          />
          <YAxis
            width={52}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickFormatter={(v: number) => (hidden ? "•••" : formatCompactCurrency(v, currency))}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1, strokeDasharray: "3 3" }}
            content={({ active, payload }) => {
              const item = payload?.[0]?.payload as (TrendPoint & { n: number }) | undefined;
              if (!active || !item) return null;
              return (
                <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                  <p className="text-muted-foreground">{label(item.date)}</p>
                  <p className="tabular font-semibold text-foreground">{hidden ? "৳ ••••" : formatCurrency(item.value, { currency })}</p>
                </div>
              );
            }}
          />
          <Area type="monotone" dataKey="n" stroke={color} strokeWidth={2} fill="url(#trend-fill)" activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RangeToggle<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg bg-muted p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "h-8 rounded-md px-3 text-xs font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
            value === o.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Dashboard card body: 7/30-day toggle over the last 30 days of expenses. */
export function SpendingTrendPanel({ points, currency }: { points: TrendPoint[]; currency: string }) {
  const { t } = useI18n();
  const [range, setRange] = useState<"7" | "30">("30");
  const visible = range === "7" ? points.slice(-7) : points;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">{t("dashboard.spendingTrend")}</h2>
        <RangeToggle
          value={range}
          onChange={setRange}
          label={t("dashboard.spendingTrend")}
          options={[
            { value: "7", label: t("dashboard.days7") },
            { value: "30", label: t("dashboard.days30") },
          ]}
        />
      </div>
      <SpendingTrendChart points={visible} currency={currency} ariaLabel={t("dashboard.spendingTrend")} />
    </div>
  );
}
