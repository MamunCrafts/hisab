"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ANALYTICS_PERIODS, type AnalyticsPeriod } from "@/lib/finance/periods";
import { useI18n } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";

/** Global period + account filter; every card and chart reads the same URL params. */
export function PeriodSelector({
  period,
  from,
  to,
  accountId,
  accounts,
}: {
  period: AnalyticsPeriod;
  from: string;
  to: string;
  accountId: string | null;
  accounts: Array<{ id: string; name: string }>;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);

  const update = (patch: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
  };

  return (
    <div className={cn("space-y-3", pending && "opacity-70")} aria-busy={pending}>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0" role="group" aria-label={t("analytics.period")}>
        {ANALYTICS_PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={period === p}
            onClick={() => update(p === "custom" ? { period: p, from: customFrom, to: customTo } : { period: p, from: null, to: null })}
            className={cn(
              "h-9 shrink-0 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              period === p ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
            )}
          >
            {t(`analytics.p${p}` as TranslationKey)}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        {period === "custom" ? (
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              update({ period: "custom", from: customFrom, to: customTo });
            }}
          >
            <div className="grid gap-1">
              <Label htmlFor="a-from" className="text-xs">{t("common.from")}</Label>
              <Input id="a-from" type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="h-9 w-40" />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="a-to" className="text-xs">{t("common.to")}</Label>
              <Input id="a-to" type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="h-9 w-40" />
            </div>
            <Button type="submit" size="sm" variant="secondary">{t("common.apply")}</Button>
          </form>
        ) : null}
        <Select value={accountId ?? "all"} onValueChange={(v) => update({ accountId: v === "all" ? null : v })}>
          <SelectTrigger size="sm" className="w-48" aria-label={t("analytics.account")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("analytics.allAccounts")}</SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
