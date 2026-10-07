"use client";

import Link from "next/link";
import type { TransactionListItem } from "@/db/queries/transactions";
import { Money } from "@/components/finance/money";
import { TransactionIcon, transactionPrimaryLabel, transactionSecondaryLabel } from "@/components/finance/transaction-visuals";
import { amountPresentation } from "@/lib/finance/display";
import { addDays } from "@/lib/dates";
import { formatShortDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";

export function RecentActivity({ items, today, currency }: { items: TransactionListItem[]; today: string; currency: string }) {
  const { t, locale } = useI18n();
  const day = (d: string) => (d === today ? t("common.today") : d === addDays(today, -1) ? t("common.yesterday") : formatShortDate(d, locale));
  return (
    <ul className="divide-y">
      {items.map((tx) => {
        const { sign, tone } = amountPresentation(tx);
        return (
          <li key={tx.id}>
            <Link href={`/transactions/${tx.id}`} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
              <TransactionIcon tx={tx} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{transactionPrimaryLabel(tx, t)}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {day(tx.transactionDate)} · {transactionSecondaryLabel(tx, t)}
                </p>
              </div>
              <Money value={tx.amount} sign={sign} tone={tone} currency={currency} className="text-sm font-semibold" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
