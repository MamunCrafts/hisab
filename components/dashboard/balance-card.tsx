"use client";

import { Eye, EyeOff } from "lucide-react";
import { Money } from "@/components/finance/money";
import { usePrivacy } from "@/components/providers/privacy-provider";
import { useI18n } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/translate";

export function BalanceCard({
  total,
  breakdown,
  currency,
}: {
  total: string;
  breakdown: Array<{ key: TranslationKey; value: string }>;
  currency: string;
}) {
  const { t } = useI18n();
  const { hidden, toggle } = usePrivacy();
  return (
    <section
      aria-labelledby="total-balance"
      className="relative overflow-hidden rounded-2xl bg-primary p-5 text-primary-foreground shadow-card md:p-6"
    >
      <div aria-hidden className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full border-[28px] border-primary-foreground/5" />
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 id="total-balance" className="text-sm font-medium text-primary-foreground/80">
            {t("dashboard.totalBalance")}
          </h2>
          <Money value={total} showSignedValue currency={currency} className="mt-1 block text-3xl font-semibold tracking-tight md:text-4xl" />
        </div>
        <button
          type="button"
          onClick={toggle}
          aria-pressed={hidden}
          aria-label={hidden ? t("common.showAmounts") : t("common.hideAmounts")}
          className="flex size-10 items-center justify-center rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 focus-visible:ring-3 focus-visible:ring-primary-foreground/40 focus-visible:outline-none"
        >
          {hidden ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
        </button>
      </div>
      {breakdown.length > 0 ? (
        <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-primary-foreground/15 pt-4">
          {breakdown.map((item) => (
            <div key={item.key} className="min-w-0">
              <dt className="truncate text-xs text-primary-foreground/70">{t(item.key)}</dt>
              <dd className="truncate text-sm font-semibold">
                <Money value={item.value} showSignedValue currency={currency} />
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </section>
  );
}
