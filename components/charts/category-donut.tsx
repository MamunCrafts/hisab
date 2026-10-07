"use client";

import Link from "next/link";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { usePrivacy } from "@/components/providers/privacy-provider";
import type { Slice } from "@/lib/finance/analytics";
import { formatCurrency } from "@/lib/format";
import { moneyToChartNumber } from "@/lib/money";

/** Donut with ≤7 segments, a 2px surface gap, and a labelled legend (identity is never color-only). */
export function CategoryDonut({
  slices,
  total,
  currency,
  totalLabel,
  ariaLabel,
  hrefFor,
}: {
  slices: Slice[];
  total: string;
  currency: string;
  totalLabel: string;
  ariaLabel: string;
  hrefFor?: (slice: Slice) => string | null;
}) {
  const { hidden } = usePrivacy();
  const data = slices.map((s) => ({ ...s, n: moneyToChartNumber(s.total) }));
  const money = (v: string) => (hidden ? "৳ ••••" : formatCurrency(v, { currency }));

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <div role="img" aria-label={ariaLabel} className="relative size-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="n" nameKey="label" innerRadius="68%" outerRadius="100%" stroke="var(--card)" strokeWidth={data.length > 1 ? 2 : 0} isAnimationActive={false}>
              {data.map((s) => (
                <Cell key={s.key} fill={s.colorVar} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                const item = payload?.[0]?.payload as (Slice & { n: number }) | undefined;
                if (!active || !item) return null;
                return (
                  <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                    <p className="font-medium">{item.label}</p>
                    <p className="tabular">{money(item.total)} · {item.percent}%</p>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[11px] text-muted-foreground">{totalLabel}</span>
          <span className="tabular text-base font-semibold">{money(total)}</span>
        </div>
      </div>
      <ul className="w-full min-w-0 space-y-2">
        {slices.map((s) => {
          const href = hrefFor?.(s);
          const content = (
            <>
              <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: s.colorVar }} />
              <span className="min-w-0 flex-1 truncate">{s.label}</span>
              <span className="tabular text-muted-foreground">{s.percent}%</span>
              <span className="tabular w-24 text-right font-medium">{money(s.total)}</span>
            </>
          );
          return (
            <li key={s.key}>
              {href ? (
                <Link href={href} className="flex items-center gap-2.5 rounded-md text-sm hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
                  {content}
                </Link>
              ) : (
                <div className="flex items-center gap-2.5 text-sm">{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
