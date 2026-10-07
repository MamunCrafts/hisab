"use client";

import { Paperclip } from "lucide-react";
import Link from "next/link";
import type { TransactionListItem } from "@/db/queries/transactions";
import { Money } from "@/components/finance/money";
import { TransactionActions } from "@/components/finance/transaction-actions";
import {
  TransactionIcon,
  transactionPrimaryLabel,
  transactionSecondaryLabel,
} from "@/components/finance/transaction-visuals";
import { Badge } from "@/components/ui/badge";
import { categoryLabel } from "@/lib/finance/categories";
import { amountPresentation } from "@/lib/finance/display";
import { formatDate } from "@/lib/format";
import { addDays } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/provider";

function useDayLabel(today: string) {
  const { t, locale } = useI18n();
  return (date: string) =>
    date === today ? t("common.today") : date === addDays(today, -1) ? t("common.yesterday") : formatDate(date, locale);
}

function Meta({ tx }: { tx: TransactionListItem }) {
  const { t } = useI18n();
  return (
    <>
      {tx.attachment ? <Paperclip className="size-3 shrink-0" aria-label={t("form.receipt")} /> : null}
      {tx.isEdited ? (
        <Badge variant="outline" className="h-4 px-1 text-[10px] font-normal">
          {t("common.edited")}
        </Badge>
      ) : null}
    </>
  );
}

/** Mobile: cards grouped by day. Desktop: a table. */
export function TransactionList({
  items,
  today,
  currency,
}: {
  items: TransactionListItem[];
  today: string;
  currency: string;
}) {
  const { t, locale } = useI18n();
  const dayLabel = useDayLabel(today);

  const groups: Array<{ date: string; items: TransactionListItem[] }> = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.date === item.transactionDate) last.items.push(item);
    else groups.push({ date: item.transactionDate, items: [item] });
  }

  return (
    <>
      <div className="space-y-5 md:hidden">
        {groups.map((group) => (
          <section key={group.date} aria-labelledby={`day-${group.date}`}>
            <h3 id={`day-${group.date}`} className="mb-2 px-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {dayLabel(group.date)}
            </h3>
            <ul className="divide-y overflow-hidden rounded-2xl border bg-card shadow-card">
              {group.items.map((tx) => {
                const { sign, tone } = amountPresentation(tx);
                return (
                  <li key={tx.id}>
                    <Link
                      href={`/transactions/${tx.id}`}
                      className="flex items-center gap-3 px-3.5 py-3 focus-visible:bg-muted focus-visible:outline-none active:bg-muted/60"
                    >
                      <TransactionIcon tx={tx} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{transactionPrimaryLabel(tx, t)}</p>
                        <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                          <span className="truncate">{transactionSecondaryLabel(tx, t)}</span>
                          <Meta tx={tx} />
                        </p>
                      </div>
                      <div className="text-right">
                        <Money value={tx.amount} sign={sign} tone={tone} currency={currency} className="text-sm font-semibold" />
                        {!tx.affectsAccount ? (
                          <p className="text-[10px] text-muted-foreground">{t("transactions.notInBalance")}</p>
                        ) : tx.type !== "TRANSFER" && !["LEND", "BORROW", "DEBT_RECEIVED", "DEBT_PAID"].includes(tx.type) ? null : (
                          <p className="max-w-24 truncate text-[10px] text-muted-foreground">{tx.account?.name}</p>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border bg-card shadow-card md:block">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">{t("transactions.colDate")}</th>
              <th scope="col" className="px-4 py-3 font-medium">{t("transactions.colDescription")}</th>
              <th scope="col" className="px-4 py-3 font-medium">{t("transactions.colCategory")}</th>
              <th scope="col" className="px-4 py-3 font-medium">{t("transactions.colAccount")}</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">{t("transactions.colAmount")}</th>
              <th scope="col" className="w-12 px-2 py-3"><span className="sr-only">{t("common.actions")}</span></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((tx) => {
              const { sign, tone } = amountPresentation(tx);
              const category =
                tx.type === "EXPENSE" || tx.type === "INCOME" ? categoryLabel(tx.category, t) : t(`transactionTypes.${tx.type}`);
              const account =
                tx.type === "TRANSFER" ? `${tx.account?.name ?? ""} → ${tx.destinationAccount?.name ?? ""}` : tx.account?.name ?? "—";
              return (
                <tr key={tx.id} className="group hover:bg-muted/40">
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground tabular">{formatDate(tx.transactionDate, locale)}</td>
                  <td className="max-w-0 px-4 py-3">
                    <Link href={`/transactions/${tx.id}`} className="flex min-w-0 items-center gap-3 rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
                      <TransactionIcon tx={tx} className="size-8 [&_svg]:size-4" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{transactionPrimaryLabel(tx, t)}</span>
                        {tx.note ? <span className="block truncate text-xs text-muted-foreground">{tx.note}</span> : null}
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
                        <Meta tx={tx} />
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{category}</td>
                  <td className="max-w-48 truncate px-4 py-3 text-muted-foreground">
                    {account}
                    {!tx.affectsAccount ? <span className="block text-[11px]">{t("transactions.notInBalance")}</span> : null}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    <Money value={tx.amount} sign={sign} tone={tone} currency={currency} />
                  </td>
                  <td className="px-2 py-3 text-right">
                    <TransactionActions id={tx.id} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
